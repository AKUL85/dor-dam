"""
embed_apply.py
==============

Incremental ChromaDB apply — embed and upsert *only* the phones whose
text actually changed, then delete any phones that disappeared from the
scraper batch.

Strategy
--------

1. **doc_hash filter.** Compute the rendered prose for each canonical
   record. Compare against the manifest's stored ``doc_hash`` for that
   productUrl. Only re-embed when the hashes differ. This avoids
   spending an LLM call (or worse, a sentence-transformer batch) on
   rows whose only delta was a stock flip.

2. **Batch embeddings.** When N phones need re-embedding, call the
   embedder once with all N texts in a single batch — same batching
   strategy as the full pipeline runner, just scoped to the delta.

3. **Delete pruned URLs.** For phones removed by the manifest diff,
   delete the matching Chroma documents by id. Stale vectors in the
   index hurt retrieval quality far more than their small disk cost.

Embedder choice
---------------
We deliberately reuse the :mod:`embedding_pipeline` package (and its
``ChromaStore`` wrapper) so providers and persistence settings stay in
sync with the bulk pipeline. The chunking, validation and metadata
serialisation rules are identical.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Mapping

from .manifest import IngestDiff
from .merge import render_doc_text

logger = logging.getLogger("ingest.embed_apply")


# ──────────────────────────────────────────────────────────────────────
# Report
# ──────────────────────────────────────────────────────────────────────

@dataclass
class EmbedApplyReport:
    """Per-stage counters — used by the pipeline reporter."""

    embedded: int = 0
    skipped_unchanged: int = 0
    skipped_missing: int = 0
    deleted: int = 0
    errors: list[str] = field(default_factory=list)
    duration_s: float = 0.0
    collection_count: int = 0

    def to_dict(self) -> dict:
        return {
            "embedded": self.embedded,
            "skipped_unchanged": self.skipped_unchanged,
            "skipped_missing": self.skipped_missing,
            "deleted": self.deleted,
            "errors": self.errors,
            "duration_s": round(self.duration_s, 3),
            "collection_count": self.collection_count,
        }


# ──────────────────────────────────────────────────────────────────────
# ID derivation — content-based, stable across reruns
# ──────────────────────────────────────────────────────────────────────

def doc_id_for(url: str) -> str:
    """Stable Chroma document id derived from the productUrl.

    Chroma ids must be non-empty ASCII-ish strings ≤ 64 chars. We hash
    the URL with SHA-1 (cheap, 40-hex output, well within limits) and
    prefix with ``phone_`` for human-readability.

    This is content-based — same productUrl always lands on the same
    Chroma id — which is what makes incremental upserts / deletes
    idempotent across reruns and across scraper file re-orderings.
    """
    import hashlib
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:24]
    return f"phone_{digest}"


# ──────────────────────────────────────────────────────────────────────
# Public entry point
# ──────────────────────────────────────────────────────────────────────

def apply_embeddings(
    records: Mapping[str, dict],
    *,
    diff: IngestDiff,
    cfg,  # embedding_pipeline.config.PipelineConfig
    manifest=None,  # ingest.manifest.IngestManifest (for prior hash lookup)
    embedder=None,  # embedding_pipeline.BaseEmbedder
    store=None,  # embedding_pipeline.ChromaStore
    batch_size: int = 32,
) -> EmbedApplyReport:
    """Apply embeddings for changed phones + delete removed phones.

    Args:
        records:    The canonical ``productUrl → record`` dict from
                    :class:`merge.PhoneBatch`.
        diff:       The :class:`IngestDiff` produced by the merge step.
        cfg:        A configured :class:`PipelineConfig` (used to build
                    the embedder + store if not supplied).
        manifest:   The current :class:`IngestManifest`. Used to look up
                    prior ``doc_hash`` so we can skip records whose prose
                    is unchanged even when ``content_hash`` shifted.
        embedder:   Optional pre-built embedder.
        store:      Optional pre-built ChromaStore.
        batch_size: Embedding batch size.

    Returns:
        :class:`EmbedApplyReport`.
    """
    started = time.perf_counter()
    report = EmbedApplyReport()

    embedder = embedder or _build_embedder(cfg)
    store = store or _build_store(cfg, expected_dimension=embedder.dimension)

    # ----- 1. Decide which URLs actually need re-embedding ------------
    pending: list[tuple[str, dict, str]] = []  # (url, record, doc_text)
    for url in diff.changed:
        if url not in records:
            report.skipped_missing += 1
            continue
        record = records[url]
        try:
            doc_text = render_doc_text(record)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to render doc for %s (%s)", url, exc)
            report.errors.append(f"render:{url}:{exc}")
            continue

        prev = manifest.entries.get(url) if manifest is not None else None
        # Skip if prose hasn't actually drifted — this is the expensive
        # bit we want to avoid paying for.
        from .manifest import doc_hash as _doc_hash
        new_hash = _doc_hash(doc_text)
        if prev is not None and prev.doc_hash == new_hash:
            report.skipped_unchanged += 1
            continue
        pending.append((url, record, doc_text))

    # ----- 2. Embed in batches ----------------------------------------
    if pending:
        try:
            for start in range(0, len(pending), batch_size):
                chunk = pending[start : start + batch_size]
                texts = [t for _, _, t in chunk]
                vectors = embedder.embed_documents(texts)

                from embedding_pipeline.chroma_store import IndexedRecord

                indexed = [
                    IndexedRecord(
                        id=doc_id_for(url),
                        text=doc_text,
                        embedding=vec,
                        metadata={
                            "product_url": url,
                            "name": (record.get("name") or ""),
                            "brand": (record.get("brand") or ""),
                            "price": record.get("price"),
                            "category": record.get("category") or "Mobile Phone",
                        },
                    )
                    for (url, record, doc_text), vec in zip(chunk, vectors)
                ]
                store.add_batch(indexed)
                report.embedded += len(indexed)
                logger.debug(
                    "Embedded + upserted batch [%d:%d]",
                    start,
                    start + len(indexed),
                )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Embed stage failed")
            report.errors.append(f"embed: {exc}")

    # ----- 3. Delete pruned URLs --------------------------------------
    if diff.removed:
        try:
            ids = [doc_id_for(u) for u in diff.removed]
            store.delete(ids=ids)
            report.deleted = len(ids)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Chroma delete stage failed")
            report.errors.append(f"delete: {exc}")

    # ----- 4. Tidy up --------------------------------------------------
    try:
        report.collection_count = store.count
    except Exception:  # pragma: no cover
        report.collection_count = -1

    report.duration_s = time.perf_counter() - started
    logger.info(
        "Embed apply done in %.2fs — %s", report.duration_s, report.to_dict()
    )
    return report


# ──────────────────────────────────────────────────────────────────────
# Lazy factory helpers
# ──────────────────────────────────────────────────────────────────────

def _build_embedder(cfg):
    from embedding_pipeline.embedders import build_embedder
    return build_embedder(cfg)


def _build_store(cfg, *, expected_dimension: int):
    from embedding_pipeline.chroma_store import ChromaStore
    return ChromaStore(cfg, expected_dimension=expected_dimension)


# ──────────────────────────────────────────────────────────────────────
# ID exposure — used by callers that need to sync search index caches
# ──────────────────────────────────────────────────────────────────────

def iter_changed_doc_ids(diff: IngestDiff) -> Iterable[str]:
    """Yield the Chroma document ids for ``diff.changed`` URLs."""
    for url in diff.changed:
        yield doc_id_for(url)