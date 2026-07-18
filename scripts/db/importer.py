"""``scripts/db/importer.py`` — JSON → SQLAlchemy loader.

Single-pass, idempotent loader for ``processed/merged_phones.json``.

Behaviour
---------

1. Stream the JSON once, building a canonical payload per phone record.
2. SHA-256 the canonical payload → stored as ``Phone.source_hash``.
3. Open one DB session, then for each phone:

   - Compute ``source_hash``; if a row already exists with the same hash,
     skip (incremental update).
   - Otherwise ``MERGE`` the row (UPSERT on ``product_url``), then
     delete-and-recreate every ``phone_stores`` row for that phone.

4. Commit every ``Settings.batch_size`` rows so memory stays bounded on
   large catalogues.

5. Return an :class:`ImportReport` with counts that the caller can print,
   log, or stash in their own audit table.

Integers parsed from messy free-text columns (RAM / storage / battery /
charging watts) are best-effort — anything that doesn't cleanly match
the regex lands as ``NULL`` rather than crashing the importer.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from .models import Phone, PhoneStore

logger = logging.getLogger("db.importer")


# ──────────────────────────────────────────────────────────────────────
# Tunables
# ──────────────────────────────────────────────────────────────────────

# Patterns applied to free-text fields to extract numeric scalars.
_RX_RAM = re.compile(r"(\d{1,4})\s*GB\s*RAM", re.IGNORECASE)
_RX_STORAGE_CAPACITY = re.compile(
    r"(\d{1,5})\s*GB\b(?!\s*RAM)|\b(\d{1,4})\s*TB\b", re.IGNORECASE
)
_RX_BATTERY_MAH = re.compile(r"(\d{2,5})\s*mAh", re.IGNORECASE)
_RX_CHARGING_W = re.compile(r"(\d{1,4})\s*W(?!\w)", re.IGNORECASE)
_RX_DISPLAY_INCHES = re.compile(r"(\d{1,2}\.\d{1,2})\s*(?:inch|\")", re.IGNORECASE)
_RX_STORAGE_TB = re.compile(r"(\d{1,4})\s*TB", re.IGNORECASE)


# ──────────────────────────────────────────────────────────────────────
# Report
# ──────────────────────────────────────────────────────────────────────

@dataclass
class ImportReport:
    """Summary returned by :meth:`PhoneImporter.run`.

    Attributes:
        total:        Records seen in the JSON file.
        inserted:     New ``phones`` rows created.
        updated:      Existing ``phones`` rows updated in-place.
        unchanged:    Existing ``phones`` rows skipped (hash match).
        stores_added: Net ``phone_stores`` rows now in DB across the run.
        errors:       Per-row error strings (importer failed but didn't
                      crash).  Empty in a happy-path run.
        duration_s:   Wall-clock seconds for the import.
    """

    total: int = 0
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0
    stores_added: int = 0
    errors: list[str] = field(default_factory=list)
    duration_s: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "total": self.total,
            "inserted": self.inserted,
            "updated": self.updated,
            "unchanged": self.unchanged,
            "stores_added": self.stores_added,
            "errors": self.errors,
            "duration_s": round(self.duration_s, 3),
        }


# ──────────────────────────────────────────────────────────────────────
# Importer
# ──────────────────────────────────────────────────────────────────────

class PhoneImporter:
    """Idempotent loader for ``processed/merged_phones.json``.

    Args:
        session:        Active SQLAlchemy ``Session`` (importer never
                        commits until the batch boundary — pass a fresh
                        session in via :func:`scripts.db.session_scope`).
        batch_size:     Commit every N phone rows. ``None`` = all-at-once.
        on_error:       ``"raise"`` (default) crashes on a bad row;
                        ``"skip"`` records the failure and continues.
        upsert_dialect: ``"auto"`` (default) selects ``pg_insert`` when
                        the bound dialect is PostgreSQL and
                        ``sqlite_insert`` otherwise. You should rarely
                        need to change this.
    """

    def __init__(
        self,
        session: Session,
        *,
        batch_size: int | None = 200,
        on_error: str = "raise",
        upsert_dialect: str = "auto",
    ) -> None:
        if on_error not in {"raise", "skip"}:
            raise ValueError("on_error must be 'raise' or 'skip'")
        if upsert_dialect not in {"auto", "postgresql", "sqlite"}:
            raise ValueError(f"unsupported upsert_dialect={upsert_dialect!r}")
        self._session = session
        self._batch_size = batch_size
        self._on_error = on_error
        self._upsert_dialect = self._resolve_dialect(session, upsert_dialect)

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def run(
        self,
        json_path: str | Path,
        *,
        truncate: bool = False,
    ) -> ImportReport:
        """Load ``json_path`` into the bound session.

        Args:
            json_path: Path to ``merged_phones.json``.
            truncate:  If ``True``, wipes the ``phones`` and
                       ``phone_stores`` tables before loading. Use with
                       care; intended for first-time bootstrap only.

        Returns:
            :class:`ImportReport`.
        """
        path = Path(json_path)
        logger.info("Loading phones from %s", path)
        records = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(records, list):
            raise ValueError(
                f"Expected a JSON list in {path}, got {type(records).__name__}"
            )

        if truncate:
            logger.warning(
                "truncate=True — wiping phones + phone_stores tables"
            )
            from sqlalchemy import text as _sa_text  # local import
            self._session.execute(_sa_text("DELETE FROM phone_stores"))
            self._session.execute(_sa_text("DELETE FROM phones"))
            self._session.commit()

        start = datetime.now(timezone.utc)
        report = ImportReport(total=len(records))

        for i, raw in enumerate(records, start=1):
            try:
                self._process_one(raw, report)
            except Exception as exc:  # noqa: BLE001
                msg = f"row #{i}: {type(exc).__name__}: {exc}"
                if self._on_error == "raise":
                    raise RuntimeError(msg) from exc
                logger.warning(msg)
                report.errors.append(msg)
            if self._batch_size and i % self._batch_size == 0:
                self._session.commit()

        self._session.commit()
        report.duration_s = (datetime.now(timezone.utc) - start).total_seconds()
        logger.info("Done in %.2fs — %s", report.duration_s, report.to_dict())
        return report

    # ------------------------------------------------------------------
    # Per-row processing
    # ------------------------------------------------------------------

    def _process_one(self, raw: dict, report: ImportReport) -> None:
        """Insert/update one phone record; never commits."""
        canonical = _canonicalise(raw)
        digest = hashlib.sha256(canonical).hexdigest()

        # --- Look up an existing row by productUrl -------------------
        existing = self._session.execute(
            select(Phone).where(Phone.product_url == raw["productUrl"])
        ).scalar_one_or_none()

        if existing is not None and existing.source_hash == digest:
            report.unchanged += 1
            return

        # --- Pull out the spec values we want to keep -----------------
        ram_gb = _extract_int(_RX_RAM, raw.get("ram") or "")
        storage_gb = _extract_storage_gb(
            raw.get("ram") or "", raw.get("merged_specs", {}).get("storage")
        )
        battery_mah = _extract_int(_RX_BATTERY_MAH, raw.get("battery") or "")
        charging_w = _extract_int(_RX_CHARGING_W, raw.get("battery") or "")
        display_inches = _extract_float(_RX_DISPLAY_INCHES, raw.get("display") or "")

        # --- Merge payload -------------------------------------------
        ms = raw.get("merged_specs") or {}
        display_text = (ms.get("display") or raw.get("display")) or None
        processor_text = (ms.get("processor") or raw.get("processor")) or None
        battery_text = (ms.get("battery") or raw.get("battery")) or None
        camera_text = (
            ms.get("camera")
            or ms.get("rear_camera")
            or raw.get("rearCamera")
        ) or None
        os = (ms.get("operating_system") or ms.get("os") or raw.get("os")) or None
        network = (ms.get("network") or raw.get("network")) or None

        prices = [
            s.get("price")
            for s in (raw.get("stores") or [])
            if isinstance(s, dict) and isinstance(s.get("price"), (int, float))
        ] + [
            raw.get("price"),
        ]
        prices = [p for p in prices if isinstance(p, (int, float))]
        price_min = min(prices) if prices else None
        price_max = max(prices) if prices else None

        payload = dict(
            slug=_slugify(raw["name"]),
            name=str(raw["name"]),
            brand=str(raw.get("brand") or "Unknown"),
            category=raw.get("category"),
            product_url=str(raw["productUrl"]),
            image_url=raw.get("imageUrl"),
            ram_gb=ram_gb,
            storage_gb=storage_gb,
            display_inches=display_inches,
            battery_mah=battery_mah,
            charging_w=charging_w,
            price_min=price_min,
            price_max=price_max,
            display_text=display_text,
            processor_text=processor_text,
            battery_text=battery_text,
            camera_text=camera_text,
            os=os,
            network=network,
            source_hash=digest,
        )

        # --- Upsert the row ------------------------------------------
        existing_phone = self._do_upsert(payload)

        # --- Replace phone_stores listings ---------------------------
        existing_phone.stores.clear()
        self._session.flush()  # so DELETE has a foreign-key target.

        # Source data occasionally contains the same (store_name, store_url)
        # more than once when a store re-scrapes. Dedup by url (or store_name
        # if url is missing) before insert.
        seen_store_keys: set[tuple[str, str]] = set()
        for s in raw.get("stores") or []:
            if not isinstance(s, dict):
                continue
            url = s.get("url") or raw["productUrl"]
            name = s.get("name") or "Unknown"
            key = (name, str(url))
            if key in seen_store_keys:
                continue
            seen_store_keys.add(key)
            self._session.add(
                PhoneStore(
                    phone_id=existing_phone.id,
                    store_name=str(name),
                    store_url=str(url),
                    price=_maybe_float(s.get("price")),
                    original_price=_maybe_float(raw.get("originalPrice")),
                    discount_amount=_maybe_float(raw.get("discountAmount")),
                    discount_pct=_maybe_int(raw.get("discountPct")),
                    in_stock=bool(s.get("in_stock", raw.get("inStock", True))),
                    stock_status=s.get("stock_status") or raw.get("stockStatus"),
                    short_description=raw.get("shortDescription"),
                    scraped_file=s.get("scraped_file")
                    or raw.get("scraped_file"),
                    scraped_at=_maybe_datetime(s.get("scraped_at"))
                    or _maybe_datetime(raw.get("scrapedAt")),
                )
            )
            report.stores_added += 1

        if existing is None:
            report.inserted += 1
        else:
            report.updated += 1

    # ------------------------------------------------------------------
    # Dialect-aware UPSERT
    # ------------------------------------------------------------------

    def _do_upsert(self, payload: dict) -> Phone:
        """Insert or update the phone row, returning the live ORM obj."""
        dialect = self._upsert_dialect
        stmt = (
            pg_insert(Phone).values(**payload)
            if dialect == "postgresql"
            else sqlite_insert(Phone).values(**payload)
        )

        update_columns = {
            col: getattr(stmt.excluded, col)
            for col in payload.keys()
            # Don't overwrite the immutable slug / source_hash on update?
            # Actually we DO want to refresh the hash to the new value.
        }
        if dialect == "postgresql":
            stmt = stmt.on_conflict_do_update(
                index_elements=[Phone.product_url],
                set_=update_columns,
            )
        else:
            # sqlite
            stmt = stmt.on_conflict_do_update(
                index_elements=[Phone.product_url],
                set_=update_columns,
            )

        self._session.execute(stmt)
        # Refresh into an attached ORM object
        return self._session.execute(
            select(Phone).where(Phone.product_url == payload["product_url"])
        ).scalar_one()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_dialect(session: Session, requested: str) -> str:
        if requested != "auto":
            return requested
        bind = session.get_bind()
        dialect_name = bind.dialect.name if bind else "sqlite"
        return "postgresql" if dialect_name == "postgresql" else "sqlite"


# ──────────────────────────────────────────────────────────────────────
# Pure helpers (no SQLAlchemy dependency)
# ──────────────────────────────────────────────────────────────────────

def _canonicalise(raw: dict) -> bytes:
    """Serialise a record to a stable JSON byte string.

    Using ``sort_keys=True`` ensures a re-ordered dict produces the same
    digest as the original — vital for incremental detection.
    """
    return json.dumps(raw, sort_keys=True, ensure_ascii=False, default=str).encode(
        "utf-8"
    )


def _slugify(name: str) -> str:
    """Stable URL-style slug for ``phones.slug``."""
    s = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")
    return s[:255] or "phone"


def _extract_int(rx: re.Pattern[str], text: str) -> int | None:
    """Return the first integer match in ``text``, or ``None``."""
    if not text:
        return None
    m = rx.search(text)
    return int(m.group(1)) if m else None


def _extract_float(rx: re.Pattern[str], text: str) -> float | None:
    if not text:
        return None
    m = rx.search(text)
    return float(m.group(1)) if m else None


def _extract_storage_gb(ram_text: str, storage_value: Any) -> int | None:
    """Best-effort storage capacity in GB.

    Source coverage is wildly inconsistent:

    * ``merged_specs.storage`` may be a scalar ``256`` or ``128``.
    * ``specs.ram`` is *not* storage at all — it's typically
      ``"256GB 12GB RAM"`` containing both.
    * For TB, we multiply by 1024.
    """
    if isinstance(storage_value, (int, float)) and storage_value > 0:
        if isinstance(storage_value, float) and 0 < storage_value < 16:
            # Likely a TB value written as a float (e.g. ``1.5``).
            return int(storage_value * 1024)
        return int(storage_value)
    if isinstance(storage_value, str) and storage_value.strip().isdigit():
        return int(storage_value)
    if isinstance(storage_value, str):
        m = _RX_STORAGE_TB.search(storage_value)
        if m:
            return int(m.group(1)) * 1024
    if ram_text:
        m = _RX_STORAGE_CAPACITY.search(ram_text)
        if m:
            return int(m.group(1) or m.group(2)) if m.lastindex else int(m.group(1))
    return None


def _maybe_float(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _maybe_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    return None


def _maybe_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            # Accept both trailing-Z and offsets.
            cleaned = value.replace("Z", "+00:00")
            dt = datetime.fromisoformat(cleaned)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


# ──────────────────────────────────────────────────────────────────────
# Iterable helper for callers that want a generator interface
# ──────────────────────────────────────────────────────────────────────

def iter_phones(json_path: str | Path) -> Iterable[dict]:
    """Yield raw phone dicts one at a time without holding the whole list."""
    from json import JSONDecoder

    text = Path(json_path).read_text(encoding="utf-8")
    decoder = JSONDecoder()
    idx, n = 0, len(text)
    while idx < n:
        # Skip whitespace + commas between objects.
        while idx < n and text[idx] in " \r\n\t,":
            idx += 1
        if idx >= n:
            break
        obj, end = decoder.raw_decode(text, idx)
        yield obj
        idx = end
