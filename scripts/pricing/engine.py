"""Pricing engine.

Pipeline:
1. Resolve a phone by name/slug.
2. Pull all ``PhoneStore`` rows ordered by price.
3. Compute cheapest / highest-price points and a discount headline.
4. Emit a structured :class:`PricingResult` and a markdown view.

PostgreSQL/SQLite are both supported via SQLAlchemy — the engine only
issues select/aggregate queries and never reaches for vector search.
"""
from __future__ import annotations

import logging
import re
from contextlib import ExitStack
from dataclasses import dataclass, field
from typing import Iterable, List, Optional, Sequence

from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from db.config import load_settings
from db.models import Phone, PhoneStore
from db.session import session_scope

logger = logging.getLogger("pricing.engine")


# ──────────────────────────────────────────────────────────────────────
# Data models
# ──────────────────────────────────────────────────────────────────────

@dataclass(slots=True)
class StoreOffer:
    """One store listing for the requested phone."""
    store_name: str
    store_url: str
    price: Optional[float]
    original_price: Optional[float]
    discount_amount: Optional[float]
    discount_pct: Optional[int]
    in_stock: bool
    stock_status: Optional[str]
    scraped_at: Optional[str]

    @property
    def on_sale(self) -> bool:
        return (self.discount_amount or 0) > 0 and (self.original_price or 0) > (self.price or 0)


@dataclass(slots=True)
class PriceRange:
    """Min/max/discount headline for the whole listing."""
    min_price: Optional[float]
    max_price: Optional[float]
    currency: str = "BDT"
    stores_compared: int = 0

    @property
    def spread(self) -> Optional[float]:
        if self.min_price is None or self.max_price is None:
            return None
        return self.max_price - self.min_price

    @property
    def spread_pct(self) -> Optional[float]:
        if self.min_price is None or self.max_price is None or self.max_price <= 0:
            return None
        return round((self.max_price - self.min_price) / self.max_price * 100.0, 2)


@dataclass(slots=True)
class PricingQuery:
    raw_name: str
    in_stock_only: bool = False
    on_sale_only: bool = False


@dataclass(slots=True)
class PricingResult:
    phone_id: int
    brand: str
    name: str
    category: Optional[str]
    price_range: PriceRange
    cheapest: Optional[StoreOffer] = None
    highest: Optional[StoreOffer] = None
    offers: List[StoreOffer] = field(default_factory=list)
    in_stock_count: int = 0
    out_of_stock_count: int = 0
    average_price: Optional[float] = None
    recommendation: str = ""
    raw_query: str = ""


# ──────────────────────────────────────────────────────────────────────
# Resolution helpers
# ──────────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _resolve_phone(session: Session, name: str) -> Optional[Phone]:
    name = (name or "").strip()
    if not name:
        return None
    slug = _slugify(name)

    # 1) Exact slug match.
    ph = session.execute(select(Phone).where(Phone.slug == slug)).scalar_one_or_none()
    if ph:
        return ph

    # 2) Slug contains the search slug.
    ph = session.execute(
        select(Phone).where(Phone.slug.ilike(f"%{slug}%")).limit(1)
    ).scalar_one_or_none()
    if ph:
        return ph

    # 3) Brand + token match.
    if " " in name:
        head, tail = name.split(" ", 1)
        tokens = [t for t in _slugify(tail).split("-") if len(t) >= 2]
        candidates = session.execute(
            select(Phone).where(Phone.brand.ilike(head)).limit(80)
        ).scalars().all()
        scored: list[tuple[int, Phone]] = []
        for p in candidates:
            sl = (p.slug or "").lower()
            score = sum(1 for tok in tokens if tok in sl)
            if score:
                scored.append((score, p))
        if scored:
            scored.sort(key=lambda x: -x[0])
            return scored[0][1]

    # 4) Fuzzy name match.
    return session.execute(
        select(Phone).where(Phone.name.ilike(f"%{name}%")).limit(1)
    ).scalar_one_or_none()


# ──────────────────────────────────────────────────────────────────────
# Aggregation
# ──────────────────────────────────────────────────────────────────────

def _fetch_offers(session: Session, phone_id: int, *, in_stock_only: bool, on_sale_only: bool) -> List[StoreOffer]:
    stmt = select(PhoneStore).where(PhoneStore.phone_id == phone_id)
    if in_stock_only:
        stmt = stmt.where(PhoneStore.in_stock.is_(True))
    if on_sale_only:
        stmt = stmt.where(PhoneStore.discount_amount.is_not(None), PhoneStore.discount_amount > 0)

    # Order: in-stock first, then price asc, then name asc.
    stmt = stmt.order_by(
        PhoneStore.in_stock.desc(),
        PhoneStore.price.asc().nullslast(),
        PhoneStore.store_name.asc(),
    )
    rows = session.execute(stmt).scalars().all()
    return [
        StoreOffer(
            store_name=r.store_name,
            store_url=r.store_url,
            price=r.price,
            original_price=r.original_price,
            discount_amount=r.discount_amount,
            discount_pct=r.discount_pct,
            in_stock=bool(r.in_stock),
            stock_status=r.stock_status,
            scraped_at=r.scraped_at.isoformat() if r.scraped_at else None,
        )
        for r in rows
    ]


def _compute_range(offers: Sequence[StoreOffer]) -> PriceRange:
    prices = [o.price for o in offers if o.price is not None]
    if not prices:
        return PriceRange(min_price=None, max_price=None, stores_compared=len(offers))
    return PriceRange(
        min_price=min(prices),
        max_price=max(prices),
        stores_compared=len(offers),
    )


def _build_recommendation(phone: Phone, result: PricingResult) -> str:
    if not result.offers:
        return f"No store listings found for {phone.brand} {phone.name}."
    if not result.cheapest or result.cheapest.price is None:
        return f"Listings exist for {phone.brand} {phone.name} but no price has been published yet."
    if result.highest and result.highest.price and result.highest.price > result.cheapest.price:
        spread_pct = result.price_range.spread_pct or 0.0
        return (
            f"Cheapest: {result.cheapest.store_name} at ৳{int(result.cheapest.price):,}. "
            f"Buying from there saves ~{spread_pct:.1f}% versus the highest priced store."
        )
    return (
        f"Only one store has a price for {phone.brand} {phone.name}: "
        f"{result.cheapest.store_name} at ৳{int(result.cheapest.price):,}."
    )


# ──────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────

def price_for(phone: Phone,
              offers: Optional[Sequence[StoreOffer]] = None,
              *,
              in_stock_only: bool = False,
              on_sale_only: bool = False,
              session: Optional[Session] = None) -> PricingResult:
    """Build a :class:`PricingResult` for a pre-resolved ``Phone``."""
    own_session = session is None
    sess_ctx: Session | None = None
    if own_session:
        settings = load_settings()
        eng = None
        from db.session import engine
        eng = engine(settings)
        sess_ctx = session_scope(eng)
        session = sess_ctx.__enter__()

    try:
        if offers is None:
            offers = _fetch_offers(session, phone.id, in_stock_only=in_stock_only, on_sale_only=on_sale_only)
    finally:
        if own_session and sess_ctx is not None:
            sess_ctx.__exit__(None, None, None)

    price_range = _compute_range(offers)
    cheapest = next((o for o in offers if o.price == price_range.min_price), None) if price_range.min_price else None
    highest = next((o for o in offers if o.price == price_range.max_price), None) if price_range.max_price else None

    in_stock_count = sum(1 for o in offers if o.in_stock)
    out_of_stock_count = len(offers) - in_stock_count
    prices = [o.price for o in offers if o.price is not None]
    avg = round(sum(prices) / len(prices), 2) if prices else None

    result = PricingResult(
        phone_id=phone.id,
        brand=phone.brand,
        name=phone.name,
        category=phone.category,
        price_range=price_range,
        cheapest=cheapest,
        highest=highest,
        offers=list(offers),
        in_stock_count=in_stock_count,
        out_of_stock_count=out_of_stock_count,
        average_price=avg,
        raw_query=phone.name,
    )
    result.recommendation = _build_recommendation(phone, result)
    return result


def price_check(name: str,
                *,
                in_stock_only: bool = False,
                on_sale_only: bool = False,
                session: Optional[Session] = None) -> PricingResult:
    """Resolve a phone by name/slug and return its pricing result."""
    if session is not None:
        phone = _resolve_phone(session, name)
        if phone is None:
            raise LookupError(f"No phone matched: {name!r}")
        return price_for(phone, in_stock_only=in_stock_only, on_sale_only=on_sale_only, session=session)

    settings = load_settings()
    with ExitStack() as stack:
        from db.session import engine
        eng = engine(settings)
        sess_ctx = session_scope(eng)
        session = stack.enter_context(sess_ctx)
        phone = _resolve_phone(session, name)
        if phone is None:
            raise LookupError(f"No phone matched: {name!r}")
        return price_for(phone, in_stock_only=in_stock_only, on_sale_only=on_sale_only, session=session)


# ──────────────────────────────────────────────────────────────────────
# Rendering
# ──────────────────────────────────────────────────────────────────────

def render_markdown(result: PricingResult) -> str:
    """Pretty-print the pricing result."""
    if not result.offers:
        return f"# {result.brand} {result.name}\n\n_No store listings found._\n"

    lines: list[str] = []
    title_name = result.name if result.name.lower().startswith(result.brand.lower()) else f"{result.brand} {result.name}"
    title = f"# {title_name} — pricing"
    lines.append(title)
    lines.append("")

    # Headline numbers.
    lo = result.cheapest
    hi = result.highest
    pieces: list[str] = []
    if lo and lo.price is not None:
        pieces.append(f"**Cheapest:** {lo.store_name} — ৳{int(lo.price):,}")
    if hi and hi.price is not None and hi is not lo:
        pieces.append(f"**Highest:** {hi.store_name} — ৳{int(hi.price):,}")
    if result.average_price:
        pieces.append(f"**Average:** ৳{int(result.average_price):,}")
    pieces.append(f"**Stock:** {result.in_stock_count} in, {result.out_of_stock_count} out")
    if result.price_range.spread_pct:
        pieces.append(f"**Spread:** {result.price_range.spread_pct:.1f}%")
    lines.append(" · ".join(pieces))
    lines.append("")
    lines.append(f"> {result.recommendation}")
    lines.append("")

    # Store table.
    header = ["Store", "Price", "Original", "Discount", "Stock"]
    lines.append("| " + " | ".join(header) + " |")
    lines.append("|" + "|".join("---" for _ in header) + "|")
    for o in result.offers:
        price_cell = f"৳{int(o.price):,}" if o.price is not None else "—"
        original_cell = f"৳{int(o.original_price):,}" if o.original_price is not None else "—"
        if o.on_sale and o.discount_amount is not None and o.original_price is not None:
            discount_cell = f"৳{int(o.discount_amount):,}" + (f" ({o.discount_pct}%)" if o.discount_pct else "")
        else:
            discount_cell = "—"
        stock_cell = o.stock_status or ("In stock" if o.in_stock else "Out of stock")
        lines.append(f"| {o.store_name} | {price_cell} | {original_cell} | {discount_cell} | {stock_cell} |")

    return "\n".join(lines) + "\n"