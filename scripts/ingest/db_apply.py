"""
db_apply.py
===========

Incremental Postgres apply — upsert only the productUrls that actually
changed, and prune rows for productUrls that disappeared.

Strategy
--------

1. Materialise the *delta* into a single small JSON file
   (``processed/.ingest_pending.json``).
2. Run the existing :class:`db.importer.PhoneImporter` over that file.
   It already has the per-row SHA-256 hash-skip we want.
3. For *removed* ``productUrls``, issue a DELETE on ``phones`` — the
   ``phone_stores`` rows go away on the cascading delete.

Why not pipe records one-by-one to the importer?
-----------------------------------------------
The importer batches commits (``Settings.batch_size``) and accepts
exactly one path argument. Forcing single-row mode would either mean
duplicating the importer's per-row logic or hacking the import
interface. Writing a tiny intermediate file is simpler and gives us a
deterministic audit trail on disk.
"""
from __future__ import annotations

import json
import logging
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping

from sqlalchemy import delete
from sqlalchemy.orm import Session

from db.importer import ImportReport, PhoneImporter
from db.models import Phone
from .manifest import IngestDiff

logger = logging.getLogger("ingest.db_apply")


# ──────────────────────────────────────────────────────────────────────
# Report
# ──────────────────────────────────────────────────────────────────────

@dataclass
class DBApplyReport:
    """Per-stage counters — used by the pipeline reporter."""

    inserted: int = 0
    updated: int = 0
    unchanged: int = 0
    removed: int = 0
    errors: list[str] = field(default_factory=list)
    duration_s: float = 0.0

    def to_dict(self) -> dict:
        return {
            "inserted": self.inserted,
            "updated": self.updated,
            "unchanged": self.unchanged,
            "removed": self.removed,
            "errors": self.errors,
            "duration_s": round(self.duration_s, 3),
        }


# ──────────────────────────────────────────────────────────────────────
# Public entry point
# ──────────────────────────────────────────────────────────────────────

def apply_records(
    session: Session,
    records: Mapping[str, dict],
    *,
    diff: IngestDiff | None = None,
    importer: PhoneImporter | None = None,
    batch_size: int = 200,
) -> DBApplyReport:
    """Apply ``records`` (and any removes from ``diff``) to the DB.

    Args:
        session:    Active SQLAlchemy session.
        records:    The canonical ``productUrl → record`` dict from
                    :class:`merge.PhoneBatch`. Only the entries whose
                    URL appears in ``diff.changed`` are pushed.
        diff:       Optional :class:`IngestDiff`. When present, only
                    ``added | updated`` URLs are written and
                    ``removed`` URLs are deleted.
        importer:   Optional pre-built importer (lets the caller share
                    batch-size settings with the bulk path).
        batch_size: Commit cadence when ``importer`` is not supplied.

    Returns:
        :class:`DBApplyReport` with per-stage counts.
    """
    import time
    from datetime import datetime, timezone

    started = time.perf_counter()
    report = DBApplyReport()

    # ----- 1. Determine the write set -------------------------------
    if diff is not None:
        changed_urls = diff.changed
        removed_urls = diff.removed
    else:
        # Caller passed a partial batch already — just write everything.
        changed_urls = set(records.keys())
        removed_urls = set()

    pending = [records[url] for url in (changed_urls & set(records.keys()))]
    logger.info(
        "DB apply: %d pending upserts, %d pending deletes",
        len(pending),
        len(removed_urls),
    )

    # ----- 2. Upsert the write set via the existing importer --------
    if pending:
        try:
            tmp_path = _write_pending_file(pending)
            try:
                impl = importer or PhoneImporter(
                    session, batch_size=batch_size, on_error="skip"
                )
                import_report: ImportReport = impl.run(tmp_path)
                report.inserted = import_report.inserted
                report.updated = import_report.updated
                report.unchanged = import_report.unchanged
                report.errors.extend(import_report.errors)
            finally:
                Path(tmp_path).unlink(missing_ok=True)
        except Exception as exc:  # noqa: BLE001
            logger.exception("PhoneImporter failed")
            report.errors.append(f"importer: {exc}")

    # ----- 3. Remove deleted productUrls ----------------------------
    if removed_urls:
        try:
            removed = _remove_urls(session, removed_urls)
            report.removed = removed
        except Exception as exc:  # noqa: BLE001
            logger.exception("Delete stage failed")
            report.errors.append(f"delete: {exc}")

    session.commit()
    report.duration_s = time.perf_counter() - started
    logger.info("DB apply done in %.2fs — %s", report.duration_s, report.to_dict())
    return report


# ──────────────────────────────────────────────────────────────────────
# Prune stage
# ──────────────────────────────────────────────────────────────────────

def _remove_urls(session: Session, urls) -> int:
    """Delete phones whose ``product_url`` is in ``urls``.

    Cascading deletes remove ``phone_stores`` rows automatically — see
    :class:`models.PhoneStore.__table_args__`.
    """
    if not urls:
        return 0
    stmt = delete(Phone).where(Phone.product_url.in_(list(urls)))
    result = session.execute(stmt)
    deleted = int(result.rowcount or 0)
    logger.info("Pruned %d phones from DB", deleted)
    return deleted


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _write_pending_file(records: list[dict]) -> str:
    """Write ``records`` to a unique JSON file. Returns the path."""
    fd, path = tempfile.mkstemp(prefix="ingest_pending_", suffix=".json")
    # Closed immediately; we hand the path to the importer.
    import os as _os
    _os.close(fd)
    Path(path).write_text(
        json.dumps(records, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    logger.debug("Wrote %d records to %s", len(records), path)
    return path


# ──────────────────────────────────────────────────────────────────────
# Convenience: full-cycle bulk rebuild (still incremental-friendly)
# ──────────────────────────────────────────────────────────────────────

def rebuild_full(session: Session, records: list[dict], *, batch_size: int = 200) -> DBApplyReport:
    """Push *every* record through the importer — non-incremental path.

    Used only when the operator explicitly asks for a full bootstrap.
    In day-to-day use, prefer :func:`apply_records` with a populated
    ``IngestDiff``.
    """
    if not records:
        return DBApplyReport()
    tmp_path = _write_pending_file(records)
    try:
        impl = PhoneImporter(session, batch_size=batch_size, on_error="skip")
        ir = impl.run(tmp_path)
        session.commit()
        return DBApplyReport(
            inserted=ir.inserted,
            updated=ir.updated,
            unchanged=ir.unchanged,
            errors=ir.errors,
            duration_s=ir.duration_s,
        )
    finally:
        Path(tmp_path).unlink(missing_ok=True)
