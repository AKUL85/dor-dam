"""
chroma_store.py
===============

Thin wrapper around a persistent ChromaDB collection with two extra
guarantees on top of the stock SDK:

* **Skip-if-exists.** ``already_indexed()`` checks the collection's
  ``get`` payload so re-runs don't double-insert documents.
* **Batched upsert.** ``add_batch`` accepts lists of (id, text,
  embedding, metadata) tuples and dispatches them in one
  ``collection.upsert`` call — Chroma handles the internal chunking.
* **Dimension validation.** The wrapper rejects vectors whose length
  does not match the embedder's dimensionality up front, with a single
  clear error instead of Chroma's cryptic internal KeyError.

Why not call chromadb directly from the runner?
----------------------------------------------
The runner stays a pure pipeline orchestrator; pushing the SDK behind a
small abstraction means swapping Chroma for Qdrant / Weaviate / pgvector
later is one module, not twenty.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from .config import PipelineConfig


logger = logging.getLogger("embedding_pipeline.chroma_store")


@dataclass
class IndexedRecord:
    """One row destined for the vector store."""

    id: str
    text: str
    embedding: list[float]
    metadata: dict | None = None


class ChromaStore:
    """Persistent Chroma collection with skip-if-exists semantics."""

    def __init__(self, cfg: PipelineConfig, expected_dimension: int) -> None:
        try:
            import chromadb  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "chromadb is required. Install it with `pip install chromadb`."
            ) from exc

        self._cfg = cfg
        self._expected_dimension = expected_dimension

        persist_dir = Path(cfg.persist_dir)
        persist_dir.mkdir(parents=True, exist_ok=True)
        # ``PersistentClient`` is the canonical way to spin up a local
        # Chroma store (replaces the older ``Settings(chroma_db_impl=...)``
        # + ``Client()`` combo).
        self._client = chromadb.PersistentClient(path=str(persist_dir))
        # ``get_or_create_collection`` is idempotent and lets us tag
        # metadata about which model populated the store.
        self._collection = self._client.get_or_create_collection(
            name=cfg.collection_name,
            metadata={
                "hnsw:space": "cosine",
                "embedding_provider": cfg.provider.value,
                "embedding_model": cfg.resolved_model(),
            },
        )
        logger.info(
            "Opened Chroma collection %r at %s (provider=%s, model=%s)",
            cfg.collection_name,
            persist_dir,
            cfg.provider.value,
            cfg.resolved_model(),
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def already_indexed(self, doc_id: str) -> bool:
        """Return ``True`` when ``doc_id`` is already present in the store."""
        result = self._collection.get(ids=[doc_id])
        return bool(result and result.get("ids"))

    def is_doc_unchanged(self, doc_id: str, text: str) -> bool:
        """Return True when doc_id is in the store and its content hash matches."""
        import hashlib
        doc_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        result = self._collection.get(ids=[doc_id], include=["metadatas"])
        if not result or not result.get("ids"):
            return False
        metas = (result.get("metadatas") or [{}])[0]
        return metas.get("doc_hash") == doc_hash

    def _validate_batch(self, records: Sequence[IndexedRecord]) -> None:
        if not records:
            return
        dim = self._expected_dimension
        for rec in records:
            if len(rec.embedding) != dim:
                raise ValueError(
                    f"Embedding dimension mismatch for {rec.id!r}: "
                    f"got {len(rec.embedding)}, expected {dim}"
                )

    def add_batch(self, records: Sequence[IndexedRecord]) -> int:
        """Upsert ``records`` into the collection. Returns count added."""
        if not records:
            return 0
        import hashlib
        self._validate_batch(records)
        ids = [r.id for r in records]
        documents = [r.text for r in records]
        embeddings = [r.embedding for r in records]
        metadatas: list[dict] = []
        for r in records:
            doc_hash = hashlib.sha256(r.text.encode("utf-8")).hexdigest()
            md = {"embedding_provider": self._cfg.provider.value, "doc_hash": doc_hash}
            md.update(r.metadata or {})
            # Chroma requires every metadata value to be str / int / float /
            # bool / None. Coerce anything else defensively.
            for k, v in list(md.items()):
                if not isinstance(v, (str, int, float, bool)) and v is not None:
                    md[k] = str(v)
            metadatas.append(md)
        # ``upsert`` is the right call: it inserts when the id is new
        # and updates when it already exists, so it harmonises with our
        # skip-if-exists strategy.
        self._collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        return len(records)

    @property
    def count(self) -> int:
        """Return the number of records currently in the collection."""
        return int(self._collection.count())

    def close(self) -> None:
        """Release client resources.

        ``chromadb``'s ``PersistentClient`` doesn't expose a close handle
        in older versions; this is a defensive hook for future versions.
        """
        close_fn = getattr(self._client, "close", None)
        if callable(close_fn):
            close_fn()