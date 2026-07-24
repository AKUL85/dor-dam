"""
pipeline.py
===========

End-to-end incremental ingest orchestrator.

Public entry point: :func:`run_ingest`.

Stages
------

1. **Load.** Parse every new scraper JSON file in ``backend/output/``,
   dedup to one record per productUrl.
2. **Diff.** Compare the fresh batch's content_hash / doc_hash against
   the persistent :class:`IngestManifest`.
3. **DB apply.** Upsert only ``added | updated`` phones via the existing
   ``PhoneImporter``. Delete phones in ``removed``.
4. **Embed apply.** Re-embed *only* phones whose prose ``doc_hash`` has
   changed (the expensive path). Upsert Chroma and delete pruned ids.
5. **Persist manifest.** Update + atomically save the manifest so the
   next run sees the new baseline.

The orchestrator never rebuilds from scratch — every stage has an
explicit set of URLs to touch, derived from the manifest diff. The same
code path runs whether the batch contains 0 changes (idempotent) or
10 000 changes (still incremental, just with a larger batch).
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .manifest import (
    IngestManifest,
    ManifestEntry,
    content_hash_stable,
    doc_hash,
)
from .merge import PhoneBatch, load_batch, render_doc_text

logger = logging.getLogger("ingest.pipeline")


# ──────────────────────────────────────────────────────────────────────
# Public config
# ──────────────────────────────────────────────────────────────────────

@dataclass
class IngestConfig:
    """Operator-tunable knobs for the incremental pipeline.

    Attributes:
        scrape_dir:    Directory the scrapers deposit JSON into. Typically
                       ``backend/output/``.
        manifest_path: Persistent manifest file. Relative to cwd unless
                       made absolute.
        batch_size:    Pass-through for the DB and embed batch sizes.
        db_enabled:    Run the Postgres apply stage (default True).
        embed_enabled: Run the Chroma apply stage (default True).
        pipeline_cfg:  An optional pre-built
                       :class:`embedding_pipeline.PipelineConfig`. When
                       ``None`` the embed stage is skipped.
    """

    scrape_dir: Path = Path("backend/output")
    manifest_path: Path = Path("processed/ingest_manifest.json")
    batch_size: int = 200
    db_enabled: bool = True
    embed_enabled: bool = True
    pipeline_cfg = None  # type: ignore[assignment]


# ──────────────────────────────────────────────────────────────────────
# Report
# ──────────────────────────────────────────────────────────────────────

@dataclass
class IngestReport:
    """End-to-end summary of one ingest run."""

    files_loaded: int = 0
    files_skipped: int = 0
    product_urls: int = 0
    added: int = 0
    updated: int = 0
    removed: int = 0
    unchanged: int = 0
    db_inserted: int = 0
    db_updated: int = 0
    db_unchanged: int = 0
    db_removed: int = 0
    embedded: int = 0
    embed_skipped_unchanged: int = 0
    embed_deleted: int = 0
    db_errors: list[str] = field(default_factory=list)
    embed_errors: list[str] = field(default_factory=list)
    duration_s: float = 0.0

    def to_dict(self) -> dict:
        return {
            "files": {
                "loaded": self.files_loaded,
                "skipped": self.files_skipped,
                "product_urls": self.product_urls,
            },
            "diff": {
                "added": self.added,
                "updated": self.updated,
                "removed": self.removed,
                "unchanged": self.unchanged,
            },
            "db": {
                "inserted": self.db_inserted,
                "updated": self.db_updated,
                "unchanged": self.db_unchanged,
                "removed": self.db_removed,
                "errors": self.db_errors,
            },
            "embed": {
                "embedded": self.embedded,
                "skipped_unchanged": self.embed_skipped_unchanged,
                "deleted": self.embed_deleted,
                "errors": self.embed_errors,
            },
            "duration_s": round(self.duration_s, 3),
        }


# ──────────────────────────────────────────────────────────────────────
# Public entry point
# ──────────────────────────────────────────────────────────────────────

def run_ingest(
    cfg: IngestConfig,
    *,
    session=None,
    manifest: IngestManifest | None = None,
    batch: PhoneBatch | None = None,
) -> IngestReport:
    """Run the incremental ingest pipeline end-to-end.

    Args:
        cfg:       Operator-tunable knobs.
        session:   Optional pre-opened SQLAlchemy Session. Useful in
                   tests where the engine must be a SQLite in-memory.
                   When ``None`` the function opens one via
                   ``db.session_scope``.
        manifest:  Optional pre-loaded :class:`IngestManifest`. When
                   ``None`` the manifest is loaded from
                   ``cfg.manifest_path``.
        batch:     Optional pre-built :class:`PhoneBatch`. When ``None``
                   the merge stage reads ``cfg.scrape_dir``.

    Returns:
        :class:`IngestReport`.
    """
    started = time.perf_counter()
    report = IngestReport()

    # 1. Load manifest -------------------------------------------------
    manifest = manifest or IngestManifest(cfg.manifest_path).load()

    # 2. Merge ---------------------------------------------------------
    batch = batch or load_batch(cfg.scrape_dir)
    report.files_loaded = len(batch.files_loaded)
    report.files_skipped = len(batch.files_skipped)
    report.product_urls = len(batch)
    logger.info(
        "Loaded %d JSON files (%d skipped) → %d unique phones",
        report.files_loaded,
        report.files_skipped,
        report.product_urls,
    )

    # 3. Diff ----------------------------------------------------------
    # We feed both content_hash (for DB diff) and doc_hash (for embed
    # diff) into the same diff primitive — the manifest keeps both
    # fields per row.
    batch_hashes: dict[str, tuple[str, str, str, str]] = {}
    for url, record in batch.records.items():
        ch = content_hash_stable(record)
        try:
            doc_text = render_doc_text(record)
        except Exception:  # pragma: no cover
            doc_text = ""
        batch_hashes[url] = (ch, doc_hash(doc_text), record.get("name", ""), record.get("brand", ""))

    diff = manifest.diff_against(batch_hashes)
    report.added = len(diff.added)
    report.updated = len(diff.updated)
    report.removed = len(diff.removed)
    report.unchanged = len(diff.unchanged)
    logger.info(
        "Diff: +%d ~%d -%d =%d phones",
        report.added,
        report.updated,
        report.removed,
        report.unchanged,
    )

    # 4. DB apply ------------------------------------------------------
    if cfg.db_enabled:
        _run_db_stage(cfg, batch, diff, session, report)

    # 5. Embed apply ---------------------------------------------------
    if cfg.embed_enabled:
        _run_embed_stage(cfg, batch, diff, manifest, report)

    # 6. Persist manifest ---------------------------------------------
    # We update manifest even if both apply stages were skipped — that's
    # the case where the diff itself was non-trivial but Postgres /
    # Chroma weren't reached for some reason (e.g. dry-run).
    _persist_manifest(manifest, batch, batch_hashes)

    report.duration_s = time.perf_counter() - started
    logger.info("Ingest done in %.2fs — %s", report.duration_s, report.to_dict())
    return report


# ──────────────────────────────────────────────────────────────────────
# Stage helpers
# ──────────────────────────────────────────────────────────────────────

def _run_db_stage(cfg, batch, diff, session, report) -> None:
    from .db_apply import apply_records
    from db.session import session_scope

    owns_session = session is None
    ctx = session_scope() if owns_session else _noop_context(session)
    with ctx as s:
        try:
            db_rep = apply_records(s, batch.records, diff=diff, batch_size=cfg.batch_size)
            report.db_inserted = db_rep.inserted
            report.db_updated = db_rep.updated
            report.db_unchanged = db_rep.unchanged
            report.db_removed = db_rep.removed
            report.db_errors.extend(db_rep.errors)
        except Exception as exc:  # noqa: BLE001
            logger.exception("DB stage failed")
            report.db_errors.append(str(exc))


def _run_embed_stage(cfg, batch, diff, manifest, report) -> None:
    if cfg.pipeline_cfg is None:
        logger.info("No PipelineConfig supplied — skipping embed stage")
        return
    from .embed_apply import apply_embeddings

    try:
        em = apply_embeddings(
            batch.records,
            diff=diff,
            cfg=cfg.pipeline_cfg,
            manifest=manifest,
            batch_size=cfg.batch_size,
        )
        report.embedded = em.embedded
        report.embed_skipped_unchanged = em.skipped_unchanged
        report.embed_deleted = em.deleted
        report.embed_errors.extend(em.errors)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Embed stage failed")
        report.embed_errors.append(str(exc))


def _persist_manifest(manifest, batch, batch_hashes) -> None:
    """Refresh the manifest with the freshly-seen batch.

    * For every URL in the new batch we write the new ``content_hash``
      and ``doc_hash`` — even if those hashes didn't change. This keeps
      the manifest self-consistent and means the next run's diff starts
      from the same baseline regardless of which apply stages ran.
    * For URLs in the previous manifest that the new batch does *not*
      contain, we drop them. They will not reappear unless the next
      scraper run sees them again.
    """
    for url, (ch, dh, name, brand) in batch_hashes.items():
        manifest.update(
            url,
            content_hash=ch,
            doc_hash=dh,
            name=name,
            brand=brand,
        )
    for stale in list(manifest.entries.keys()):
        if stale not in batch.records:
            del manifest.entries[stale]
    manifest.save()


class _noop_context:
    """Tiny stand-in for a single pre-opened session — yields it once."""
    def __init__(self, session):
        self._session = session
    def __enter__(self):
        return self._session
    def __exit__(self, *_):
        return False
