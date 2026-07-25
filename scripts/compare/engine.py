"""Head-to-head comparison engine.

Public API:
- :class:`ComparisonQuery`     -- what to compare
- :class:`ComparisonResult`    -- structured result
- :func:`compare_phones`        -- raw (phones list) → result
- :func:`compare`                -- names list → result (resolves via SQL)
- :func:`render_markdown`        -- result → Markdown
"""
from __future__ import annotations

import logging
from contextlib import ExitStack
from dataclasses import dataclass, field
from typing import Iterable, List, Optional, Sequence, Tuple

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from db.config import load_settings
from db.models import Phone
from db.session import session_scope
from compare.dimensions import (
    ALL_DIMENSION_NAMES,
    PhoneSignals,
    score_dimension,
)

logger = logging.getLogger("compare.engine")


# ──────────────────────────────────────────────────────────────────────
# Data models
# ──────────────────────────────────────────────────────────────────────

@dataclass(slots=True)
class ComparisonQuery:
    """Inputs to a comparison request."""
    raw_names: List[str]              # human names like "Galaxy S25 Ultra"
    dimensions: List[str] = field(default_factory=lambda: list(ALL_DIMENSION_NAMES))

    @classmethod
    def from_pair(cls, a: str, b: str) -> "ComparisonQuery":
        return cls(raw_names=[a, b])


@dataclass(slots=True)
class DimensionRow:
    """One row in the comparison table."""
    dimension: str
    values: dict[str, float]                        # phone_key → score
    notes: dict[str, str]                           # phone_key → summary
    winner_key: Optional[str] = None
    margin: float = 0.0

    @property
    def is_tie(self) -> bool:
        return self.margin < 0.02


@dataclass(slots=True)
class ComparisonResult:
    """Structured output of :func:`compare`."""
    phones: List["ComparedPhone"]                       # ordered as requested
    rows: List[DimensionRow]                            # one per dimension
    wins: dict[str, int]                                # phone_key → wins
    ties: dict[str, int]                                # phone_key → ties
    recommendation: str
    raw_query: str = ""


@dataclass(slots=True)
class ComparedPhone:
    """A phone that took part in the comparison."""
    phone_id: int
    key: str                                            # slug-style identifier
    brand: str
    name: str
    price_min: Optional[float]
    price_max: Optional[float]


# Aspect dimension mappings
ASPECT_DIMENSIONS: dict[str, list[str]] = {
    "camera": ["Camera", "Photography", "Display", "Processor"],
    "software": ["Software", "AI Features", "Processor"],
    "ai": ["AI Features", "Processor", "Software"],
    "ai_feature": ["AI Features", "Processor", "Software"],
    "battery": ["Battery", "Charging", "Display"],
    "value": ["Value", "Processor", "Battery", "Camera"],
}


# ──────────────────────────────────────────────────────────────────────
# Resolution
# ──────────────────────────────────────────────────────────────────────

def _phone_key(phone: Phone) -> str:
    """Stable key for cross-referencing rows in the result."""
    return (phone.slug or phone.name or str(phone.id)).strip().lower().replace(" ", "-")


def _slugify(text: str) -> str:
    import re
    t = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return t


def _resolve_one(session: Session, name: str) -> Optional[Phone]:
    """Find a phone matching ``name`` using slug, brand, series, or fuzzy fallback."""
    name = name.strip()
    if not name:
        return None

    # 1. Exact slug match
    exact = session.execute(select(Phone).where(Phone.slug == _slugify(name))).scalar_one_or_none()
    if exact:
        return exact

    # 2. Brand match: If 'name' is a brand (Apple, Samsung, Xiaomi, Realme, etc.)
    brand_match = session.execute(
        select(Phone).where(Phone.brand.ilike(name)).order_by(Phone.price_min.desc().nullslast()).limit(1)
    ).scalar_one_or_none()
    if brand_match:
        return brand_match

    # 3. Series match: e.g. 'Galaxy S', 'Redmi Note', 'iPhone Pro'
    series_match = session.execute(
        select(Phone).where(Phone.name.ilike(f"%{name}%")).order_by(Phone.price_min.desc().nullslast()).limit(1)
    ).scalar_one_or_none()
    if series_match:
        return series_match

    # 4. Partial slug match
    like_slug = session.execute(
        select(Phone).where(Phone.slug.ilike(f"%{_slugify(name)}%")).order_by(Phone.price_min.desc().nullslast()).limit(1)
    ).scalar_one_or_none()
    if like_slug:
        return like_slug

    # 5. Token match
    if " " in name:
        head, tail = name.split(" ", 1)
        brand_phones = session.execute(
            select(Phone).where(Phone.brand.ilike(head)).limit(50)
        ).scalars().all()
        tokens = [t for t in _slugify(tail).split("-") if len(t) >= 2]
        scored: list[tuple[int, Phone]] = []
        for p in brand_phones:
            slug = (p.slug or "").lower()
            sc = sum(1 for tok in tokens if tok in slug)
            if sc:
                scored.append((sc, p))
        if scored:
            scored.sort(key=lambda x: (-x[0], -(x[1].price_min or 0)))
            return scored[0][1]

    # 6. Final fuzzy fallback
    return session.execute(
        select(Phone).where(or_(Phone.name.ilike(f"%{name}%"))).limit(1)
    ).scalar_one_or_none()


def resolve_phones(session: Session, names: Sequence[str]) -> List[Phone]:
    phones: list[Phone] = []
    missing: list[str] = []
    for n in names:
        ph = _resolve_one(session, n)
        if ph is None:
            missing.append(n)
            continue
        phones.append(ph)
    if missing:
        raise LookupError(f"No phone matched: {missing}")
    if len(phones) < 2:
        raise ValueError(f"Need at least 2 phones, got {len(phones)}")
    return phones


# ──────────────────────────────────────────────────────────────────────
# Scoring & winner per dimension
# ──────────────────────────────────────────────────────────────────────

def _score_one(phone: Phone, dimensions: Sequence[str]) -> tuple[dict[str, float], dict[str, str]]:
    signals = PhoneSignals.from_phone(phone)
    scores: dict[str, float] = {}
    notes: dict[str, str] = {}
    for d in dimensions:
        s, n = score_dimension(d, signals)
        scores[d] = s
        notes[d] = n
    return scores, notes


def _winner_for(dimension: str, scores: dict[str, float]) -> tuple[Optional[str], float, bool]:
    """Decide which phone wins a single dimension."""
    pairs = sorted(scores.items(), key=lambda kv: kv[1])
    if not pairs:
        return None, 0.0, True
    if len(pairs) == 1:
        return pairs[0][0], 0.0, True
    lo_key, lo_val = pairs[0]
    hi_key, hi_val = pairs[-1]
    if abs(hi_val - lo_val) < 0.02:
        return None, 0.0, True
    return hi_key, hi_val - lo_val, False


def _display_label(p: ComparedPhone) -> str:
    name = p.name or ""
    if name.lower().startswith(p.brand.lower()):
        return name
    return f"{p.brand} {name}".strip()


# ──────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────

def compare_phones(phones: Sequence[Phone],
                   dimensions: Optional[Sequence[str]] = None) -> ComparisonResult:
    """Take a pre-loaded list of phones and produce a ComparisonResult."""
    dims = list(dimensions) if dimensions else list(ALL_DIMENSION_NAMES)

    score_table: dict[int, dict[str, float]] = {}
    note_table: dict[int, dict[str, str]] = {}
    key_of: dict[int, str] = {}
    summary: list[ComparedPhone] = []

    for p in phones:
        s, n = _score_one(p, dims)
        score_table[p.id] = s
        note_table[p.id] = n
        key_of[p.id] = _phone_key(p)
        summary.append(ComparedPhone(
            phone_id=p.id,
            key=key_of[p.id],
            brand=p.brand,
            name=p.name,
            price_min=p.price_min,
            price_max=p.price_max,
        ))

    rows: list[DimensionRow] = []
    wins: dict[str, int] = {cp.key: 0 for cp in summary}
    ties: dict[str, int] = {cp.key: 0 for cp in summary}

    for d in dims:
        scores = {cp.key: score_table[cp.phone_id][d] for cp in summary}
        notes = {cp.key: note_table[cp.phone_id][d] for cp in summary}
        winner_key, margin, is_tie = _winner_for(d, scores)
        rows.append(DimensionRow(
            dimension=d,
            values=scores,
            notes=notes,
            winner_key=None if is_tie else winner_key,
            margin=margin,
        ))
        if is_tie:
            for cp in summary:
                ties[cp.key] += 1
        else:
            wins[winner_key] = wins.get(winner_key, 0) + 1

    recommendation = _compose_recommendation(summary, rows, wins, ties)

    return ComparisonResult(
        phones=summary,
        rows=rows,
        wins=wins,
        ties=ties,
        recommendation=recommendation,
        raw_query=" vs ".join(_display_label(cp) for cp in summary),
    )


def compare(names: Sequence[str],
            *,
            aspect: Optional[str] = None,
            session: Optional[Session] = None,
            dimensions: Optional[Sequence[str]] = None) -> ComparisonResult:
    """Resolve phones from the DB and compare."""
    selected_dims = list(dimensions) if dimensions else None
    if not selected_dims and aspect and aspect.lower() in ASPECT_DIMENSIONS:
        selected_dims = ASPECT_DIMENSIONS[aspect.lower()]

    if session is not None:
        phones = resolve_phones(session, names)
        return compare_phones(phones, selected_dims)
    settings = load_settings()
    with ExitStack() as stack:
        from db.session import engine
        eng = engine(settings)
        sess_ctx = session_scope(eng)
        session = stack.enter_context(sess_ctx)
        phones = resolve_phones(session, names)
        result = compare_phones(phones, selected_dims)
        return result


def _compose_recommendation(phones: List[ComparedPhone],
                            rows: List[DimensionRow],
                            wins: dict[str, int],
                            ties: dict[str, int]) -> str:
    """Compose a single-sentence recommendation in priority order."""
    if not phones:
        return "No phones provided."
    top_wins = max(wins.values())
    leaders = [p for p in phones if wins[p.key] == top_wins]
    if len(leaders) > 1:
        leaders.sort(key=lambda p: (p.price_min or float("inf")))

    leader = leaders[0]
    runner_up = next((p for p in phones if p is not leader), None)

    leader_wins = [r.dimension for r in rows if r.winner_key == leader.key]
    leader_summary_dims = leader_wins[:3] if leader_wins else []
    if not leader_summary_dims:
        verdict = "Comes out roughly even"
    else:
        cheaper_note = " at a lower price" if (leader.price_min and runner_up and (runner_up.price_min or 0) > leader.price_min) else ""
        joined = ", ".join(leader_summary_dims)
        verdict = f"Wins on {joined}"

    label = _display_label(leader)
    price = f" (৳{int(leader.price_min):,})" if leader.price_min else ""
    if len(phones) == 2:
        return f"{verdict} → pick the {label}{price}{cheaper_note}."
    return f"{verdict} → {label}{price} leads this comparison."


# ──────────────────────────────────────────────────────────────────────
# Rendering
# ──────────────────────────────────────────────────────────────────────

def render_markdown(result: ComparisonResult) -> str:
    """Pretty-print comparison as a markdown table with prose takeaways."""
    if not result.phones:
        return "_No phones to compare._"

    header = ["Dimension"] + [_display_label(p) for p in result.phones]
    lines: list[str] = []

    title = f"# Head-to-head: {result.raw_query}\n"
    summary = (
        f"**Quick picks:** "
        + " | ".join(f"{_display_label(p)}: {result.wins.get(p.key, 0)} wins, "
                     f"{result.ties.get(p.key, 0)} ties" for p in result.phones)
        + "\n\n"
    )
    lines.append(title)
    lines.append(summary)

    # Main table
    lines.append("| " + " | ".join(header) + " |")
    lines.append("|" + "|".join("---" for _ in header) + "|")
    for row in result.rows:
        cells = [row.dimension]
        for p in result.phones:
            score = row.values.get(p.key, 0.0)
            note = row.notes.get(p.key, "—")
            mark = "🏆 " if row.winner_key == p.key else ("🤝 " if row.is_tie else "")
            cells.append(f"{mark}{score:.2f} — {note}")
        lines.append("| " + " | ".join(cells) + " |")

    lines.append("\n## Final recommendation\n")
    lines.append(result.recommendation)

    return "\n".join(lines) + "\n"