"""
runner.py
=========

Pipeline orchestrator. Walks every document, embeds it in batches, drops
it into Chroma, and tracks failures — with a tqdm progress bar and a
final summary printed to stdout.

Public entry point: :func:`run_pipeline`.

Why a dedicated runner?
-----------------------
The runner keeps three concerns out of the modules it composes:

1. **Skip-if-exists policy.** Decides per-document whether to ask the
   embedder to do work.
2. **Failure isolation.** One bad document doesn't kill the run; the
   exception is logged to ``FailureTracker`` and we move on.
3. **Observability.** tqdm + per-stage timing give an honest picture of
   where time is being spent when the corpus grows.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Iterable

try:
    from tqdm import tqdm  # type: ignore
except ImportError:  # pragma: no cover
    tqdm = None  # type: ignore

from .chroma_store import ChromaStore, IndexedRecord
from .config import PipelineConfig
from .embedders import BaseEmbedder, build_embedder
from .loaders import Document, JsonlDocumentLoader
from .utils import FailureTracker, chunked, time_block, utc_now_iso


logger = logging.getLogger("embedding_pipeline.runner")


class PipelineRunner:
    """End-to-end orchestrator. Reusable across runs and providers."""

    def __init__(
        self,
        cfg: PipelineConfig,
        embedder: BaseEmbedder | None = None,
        store: ChromaStore | None = None,
    ) -> None:
        self.cfg = cfg
        self.embedder = embedder or build_embedder(cfg)
        self.store = store or ChromaStore(cfg, expected_dimension=self.embedder.dimension)
        self.failures = FailureTracker(
            Path(cfg.persist_dir) / f"failures_{utc_now_iso().replace(':', '-')}.jsonl"
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, documents: Iterable[Document] | None = None) -> dict:
        """Embed + index every document returned by ``documents``.

        If ``documents`` is ``None`` we open the JSONL configured on
        ``cfg.input_path`` lazily. Returns a summary dict.
        """
        docs_iter = documents if documents is not None else JsonlDocumentLoader(self.cfg.input_path)
        # We materialise once so the tqdm progress bar can render an
        # accurate total. For 100k+ docs you'd swap this for
        # ``tqdm(iterable, total=None)``.
        docs = list(docs_iter)
        total = len(docs)
        logger.info(
            "Starting pipeline run on %d documents (provider=%s, model=%s)",
            total,
            self.cfg.provider.value,
            self.embedder.model_name,
        )

        skipped = 0
        added = 0
        failed = 0
        embed_seconds = 0.0
        upsert_seconds = 0.0

        # tqdm is optional; fall back to a logged loop if it's missing.
        iterator = (
            tqdm(docs, desc="Embedding", unit="doc")
            if tqdm is not None
            else docs
        )
        if tqdm is None:
            logger.warning(
                "tqdm is not installed — install it (`pip install tqdm`) "
                "to see a progress bar. Falling back to logged progress."
            )

        # Walk in batches so the embedder provider's batching is used
        # efficiently.
        batch: list[Document] = []
        for doc in iterator:
            batch.append(doc)
            if len(batch) < self.cfg.batch_size:
                continue

            added_inc, skipped_inc, failed_inc, embed_t, upsert_t = self._process_batch(batch)
            added += added_inc
            skipped += skipped_inc
            failed += failed_inc
            embed_seconds += embed_t
            upsert_seconds += upsert_t
            batch = []

        # Flush tail
        if batch:
            added_inc, skipped_inc, failed_inc, embed_t, upsert_t = self._process_batch(batch)
            added += added_inc
            skipped += skipped_inc
            failed += failed_inc
            embed_seconds += embed_t
            upsert_seconds += upsert_t

        summary = {
            "total": total,
            "added": added,
            "skipped": skipped,
            "failed": failed,
            "embed_seconds": round(embed_seconds, 3),
            "upsert_seconds": round(upsert_seconds, 3),
            "provider": self.cfg.provider.value,
            "model": self.embedder.model_name,
            "dimension": self.embedder.dimension,
            "collection_count": self.store.count,
            "failures_log": str(self.failures.path),
        }
        logger.info("Run summary: %s", summary)
        return summary

    def close(self) -> None:
        """Release persistent resources (failure log + chroma client)."""
        try:
            self.failures.close()
        finally:
            self.store.close()

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _process_batch(self, batch: list[Document]) -> tuple[int, int, int, float, float]:
        """Embed + upsert a single batch.

        Returns:
            (added, skipped, failed, embed_seconds, upsert_seconds).
        """
        # 1. Skip-if-exists filter
        pending: list[Document] = []
        skipped = 0
        for doc in batch:
            if self.store.already_indexed(doc.id):
                logger.debug("Skipping %s (already indexed)", doc.id)
                skipped += 1
            else:
                pending.append(doc)

        if not pending:
            return 0, skipped, 0, 0.0, 0.0

        # 2. Embed
        texts = [d.text for d in pending]
        try:
            t0 = time_block()
            vectors = self.embedder.embed_documents(texts)
            embed_seconds = time_block() - t0
        except Exception as exc:  # noqa: BLE001 - we want every failure type
            failed = 0
            for doc in pending:
                self.failures.record(doc_id=doc.id, stage="embed", exc=exc)
                logger.exception("Embedding failed for %s", doc.id)
                failed += 1
            return 0, skipped, failed, 0.0, 0.0

        # 3. Upsert
        records = [
            IndexedRecord(
                id=doc.id,
                text=doc.text,
                embedding=vec,
                metadata=doc.metadata,
            )
            for doc, vec in zip(pending, vectors)
        ]
        try:
            t0 = time_block()
            self.store.add_batch(records)
            upsert_seconds = time_block() - t0
        except Exception as exc:
            failed = len(records)
            for rec in records:
                self.failures.record(doc_id=rec.id, stage="upsert", exc=exc)
            logger.exception("Upsert failed for batch of size %d", len(records))
            return 0, skipped, failed, embed_seconds, 0.0

        return len(records), skipped, 0, embed_seconds, upsert_seconds


# ──────────────────────────────────────────────────────────────────────
# Convenience entry point
# ──────────────────────────────────────────────────────────────────────

def run_pipeline(cfg: PipelineConfig) -> dict:
    """Build a runner, execute the run, and return its summary."""
    runner = PipelineRunner(cfg)
    try:
        return runner.run()
    finally:
        runner.close()