"""
merge.py
========

Read every new scraper JSON file from ``backend/output/``, normalise the
records into a single canonical payload per ``productUrl``, and emit a
batch the rest of the incremental pipeline can consume.

Why a focused merge instead of reusing ``merge_phones.py``?
-----------------------------------------------------------
``merge_phones.py`` is a one-shot CLI that reads *all* scraper files
into a single static ``merged_phones.json``. The incremental pipeline
already has a manifest that tracks per-productUrl state, so we just need
the "ingest this batch" half: parse the scraper files, dedup the
listings to one row per productUrl, and ship it.

The shape we emit matches what :class:`db.importer.PhoneImporter`
already consumes (``name``, ``brand``, ``productUrl``, ``stores``,
``merged_specs``, free-text spec fields).
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Iterator

from .manifest import content_hash

logger = logging.getLogger("ingest.merge")


# ──────────────────────────────────────────────────────────────────────
# Tunables
# ──────────────────────────────────────────────────────────────────────

# Scraped files whose name contains "errors" carry failure metadata,
# not real products. ``merge_phones.py`` already uses the same heuristic.
_ERROR_HINT = "errors"

# Specs we hoist to the top-level so the SQLAlchemy importer can index
# them as ``phones.<column>``. Anything not in this list stays inside
# ``merged_specs`` as free-text.
_TOP_LEVEL_SPEC_KEYS: tuple[str, ...] = (
    "ram",
    "storage",
    "battery",
    "display",
    "rear_camera",
    "front_camera",
    "processor",
    "operating_system",
    "os",
    "network",
    "charging",
)


# ──────────────────────────────────────────────────────────────────────
# Public dataclasses
# ──────────────────────────────────────────────────────────────────────

@dataclass
class PhoneBatch:
    """One canonical record per productUrl, ready for ingest."""

    records: dict[str, dict] = field(default_factory=dict)
    """Mapping ``productUrl → canonical_record``.

    The canonical record shape mirrors what
    :class:`db.importer.PhoneImporter` already consumes, so we can hand
    each entry straight to :func:`db_apply.apply_records`.
    """

    files_seen: list[Path] = field(default_factory=list)
    files_loaded: list[Path] = field(default_factory=list)
    files_skipped: list[Path] = field(default_factory=list)

    def __len__(self) -> int:
        return len(self.records)

    def __iter__(self) -> Iterator[dict]:
        return iter(self.records.values())

    def content_hashes(self) -> dict[str, str]:
        """``productUrl → content_hash`` for every record in the batch."""
        return {url: content_hash(rec) for url, rec in self.records.items()}


# ──────────────────────────────────────────────────────────────────────
# File discovery
# ──────────────────────────────────────────────────────────────────────

def discover_scrape_files(scrape_dir: Path | str) -> list[Path]:
    """Return every ``*.json`` file under ``scrape_dir`` (non-recursive).

    Files containing the substring ``"errors"`` are filtered out — those
    are scraper-failure logs, not product data.
    """
    scrape_dir = Path(scrape_dir)
    if not scrape_dir.exists():
        raise FileNotFoundError(f"scrape_dir does not exist: {scrape_dir}")
    if not scrape_dir.is_dir():
        raise NotADirectoryError(f"scrape_dir is not a directory: {scrape_dir}")

    files = sorted(p for p in scrape_dir.iterdir() if p.is_file() and p.suffix.lower() == ".json")
    files = [p for p in files if _ERROR_HINT not in p.name.lower()]
    logger.info("Discovered %d scraper JSON files in %s", len(files), scrape_dir)
    return files


# ──────────────────────────────────────────────────────────────────────
# Normalisation
# ──────────────────────────────────────────────────────────────────────

def _extract_products(payload: dict | list) -> list[dict]:
    """Pull the product list out of a scraper JSON payload.

    Scraper files vary in shape — the canonical one is
    ``{"store": ..., "products": [...]}``, but we tolerate a plain list
    and a couple of common fallback keys.
    """
    if isinstance(payload, list):
        return [p for p in payload if isinstance(p, dict)]
    if isinstance(payload, dict):
        for key in ("products", "items", "data"):
            value = payload.get(key)
            if isinstance(value, list):
                return [p for p in value if isinstance(p, dict)]
        # Last resort: any list-of-dicts value.
        for value in payload.values():
            if isinstance(value, list) and value and isinstance(value[0], dict):
                return list(value)
    return []


def _normalise_store_entry(product: dict, scraped_file: Path) -> dict:
    """Build a single store-listing row from one scraper product dict."""
    return {
        "name": product.get("store")
        or product.get("source")
        or product.get("storeName")
        or "Unknown",
        "url": product.get("productUrl") or product.get("url"),
        "price": product.get("price"),
        "original_price": product.get("originalPrice"),
        "discount_amount": product.get("discountAmount"),
        "discount_pct": product.get("discountPct"),
        "in_stock": bool(product.get("inStock", True)),
        "stock_status": product.get("stockStatus"),
        "short_description": product.get("shortDescription"),
        "scraped_file": str(scraped_file.name),
        "scraped_at": product.get("scrapedAt"),
    }


def _hoist_top_level_specs(record: dict) -> dict:
    """Lift well-known spec keys to the record's top level.

    The SQLAlchemy importer expects ``ram``, ``battery``, ``display``,
    ``processor``, ``os`` etc. on the record directly so it can index
    them as ``phones.ram``, ``phones.battery``, …. We also keep them
    inside ``merged_specs`` so downstream prose rendering sees them.
    """
    merged = record.get("merged_specs") or {}
    for key in _TOP_LEVEL_SPEC_KEYS:
        if key in record and record[key] is not None:
            continue
        if key in merged and merged[key] is not None:
            record[key] = merged[key]
    return record


def _merge_listings(records: list[dict], scraped_file: Path) -> dict:
    """Collapse every per-store listing of one productUrl into one record.

    We pick the *most complete* listing as the base — same heuristic as
    ``merge_phones.merge_product_group`` — and stitch its store info
    into ``record["stores"]``. Specs get unioned so downstream prose
    rendering is identical to the batch-mode runner.
    """
    if not records:
        raise ValueError("cannot merge zero listings")

    # Most-complete first.
    records.sort(key=_completeness, reverse=True)
    base = dict(records[0])  # shallow copy so we don't mutate input.

    stores: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for r in records:
        entry = _normalise_store_entry(r, scraped_file)
        key = (str(entry["name"]), str(entry["url"] or ""))
        if key in seen:
            continue
        seen.add(key)
        stores.append(entry)

    base["stores"] = stores

    # Union keySpecs / specs into ``merged_specs`` (longer-wins tiebreak).
    merged_specs: dict[str, object] = {}
    for r in records:
        ks = r.get("keySpecs") or {}
        if isinstance(ks, dict):
            for k, v in ks.items():
                if v in (None, ""):
                    continue
                if k not in merged_specs or len(str(v)) > len(str(merged_specs[k])):
                    merged_specs[k] = v
        flat = _flatten_dict(r.get("specs") or {})
        for k, v in flat.items():
            if v in (None, ""):
                continue
            if k not in merged_specs or len(str(v)) > len(str(merged_specs[k])):
                merged_specs[k] = v
    base["merged_specs"] = merged_specs
    base["keySpecs"] = merged_specs  # mirror for the importer's first path
    base["specs"] = merged_specs

    # Pricing roll-up mirrors merge_phones.py — top-level price is the
    # cheapest listing we saw across stores.
    prices = [s["price"] for s in stores if isinstance(s.get("price"), (int, float))]
    if prices:
        base["price"] = min(prices)
    base["inStock"] = any(s.get("in_stock") for s in stores)

    _hoist_top_level_specs(base)
    return base


def _completeness(product: dict) -> int:
    """Count populated scalar fields — proxy for "is this record full?"."""
    score = 0
    for key, val in product.items():
        if val not in (None, "", [], {}):
            score += 1
    return score


def _flatten_dict(d: dict, prefix: str = "") -> dict:
    """Recursively flatten one level of nesting."""
    out: dict = {}
    for k, v in d.items():
        key = f"{prefix}{k}" if prefix else str(k)
        if isinstance(v, dict):
            out.update(_flatten_dict(v, prefix=f"{key}_"))
        else:
            out[key] = v
    return out


# ──────────────────────────────────────────────────────────────────────
# File → Batch
# ──────────────────────────────────────────────────────────────────────

def load_batch(scrape_dir: Path | str) -> PhoneBatch:
    """Read every JSON file under ``scrape_dir`` and produce one PhoneBatch.

    Files are *added together*, not deduplicated at the file level —
    every scraper file is a separate store's view, so different files
    may legitimately contain the same ``productUrl``. We dedup at the
    ``productUrl`` level after the union.
    """
    scrape_dir = Path(scrape_dir)
    files = discover_scrape_files(scrape_dir)
    batch = PhoneBatch(files_seen=list(files))

    # Per-productUrl accumulator: list of per-listing records.
    accumulator: dict[str, list[dict]] = {}
    for path in files:
        try:
            raw = path.read_text(encoding="utf-8")
            if not raw.strip():
                logger.warning("Skipping empty file: %s", path.name)
                batch.files_skipped.append(path)
                continue
            payload = json.loads(raw)
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Skipping unreadable file %s (%s)", path.name, exc)
            batch.files_skipped.append(path)
            continue

        products = _extract_products(payload)
        if not products:
            logger.warning("No products found in %s — skipping", path.name)
            batch.files_skipped.append(path)
            continue

        batch.files_loaded.append(path)
        for product in products:
            url = product.get("productUrl") or product.get("url")
            if not url:
                logger.debug("Dropping listing without productUrl in %s", path.name)
                continue
            accumulator.setdefault(str(url), []).append(product)

    # Collapse per-productUrl listings into one canonical record.
    for url, listings in accumulator.items():
        try:
            canonical = _merge_listings(listings, scraped_file=listings[0].get("__scraped_file__") or batch.files_loaded[0])
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to merge %s (%s)", url, exc)
            continue
        # Stamp the actual source file on each listing.
        canonical["stores"] = [
            {**s, "scraped_file": s.get("scraped_file") or batch.files_loaded[0].name}
            for s in canonical["stores"]
        ]
        batch.records[url] = canonical

    logger.info(
        "Built batch: %d files loaded, %d skipped, %d unique productUrls",
        len(batch.files_loaded),
        len(batch.files_skipped),
        len(batch),
    )
    return batch


# ──────────────────────────────────────────────────────────────────────
# Doc rendering — we deliberately reuse build_rag_documents so the
# incremental embed step produces text identical to a full rebuild.
# ──────────────────────────────────────────────────────────────────────

def render_doc_text(record: dict) -> str:
    """Render a canonical record into the prose used by Chroma.

    Wraps ``build_rag_documents._build_document`` so the text we
    hash here is byte-identical to what a full rebuild would produce.
    Falls back to a minimal hand-rolled rendering if the import fails
    (e.g. during a partial checkout).
    """
    try:
        from build_rag_documents import _build_document  # type: ignore
        return _build_document(record)
    except Exception:  # pragma: no cover
        # Defensive fallback — we never want incremental to crash just
        # because the prose renderer moved. Hand-rolled here is good
        # enough for hashing purposes.
        brand = record.get("brand") or "Unknown"
        name = record.get("name") or "Unknown"
        category = record.get("category") or "Mobile Phone"
        bits = [f"The {brand} {name} is a {category.lower()}."]
        for k, v in (record.get("merged_specs") or {}).items():
            if v:
                bits.append(f"It has {k.replace('_', ' ')}: {v}.")
        return " ".join(bits)