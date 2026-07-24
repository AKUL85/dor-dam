"""
vector_db.py
============

Production-grade ChromaDB wrapper for the DorDam phone catalogue.

The :class:`VectorDatabase` class provides a small, opinionated CRUD +
search surface on top of a persistent ChromaDB collection:

* :meth:`add`        — upsert one or many phone records
* :meth:`update`     — partial update of existing records
* :meth:`delete`     — remove records by id or ``where`` filter
* :meth:`search`     — cosine-similarity top-k search, returns ranked
                       :class:`SearchHit` objects with normalised scores

Design goals
------------

1. **Explicit dimensionality.** The wrapper refuses to add vectors that
   don't match the collection's configured dimension, so silent drift
   between batches is impossible.

2. **Cosine everywhere.** All collections are created with
   ``hnsw:space="cosine"`` and the wrapper exposes cosine *similarity*
   scores on the search path (1 − distance, since Chroma's cosine
   distance is ``1 − cos θ``).

3. **Tidy metadata.** Phone ``name``, ``brand``, ``price`` live in the
   metadata payload so they can be filtered with ``where={...}`` and
   surfaced in search results. Arbitrary sidecar data goes in
   ``metadata.extra`` without disturbing those reserved fields.

4. **Type-safe dataclasses.** Public IO uses :class:`PhoneRecord` and
   :class:`SearchHit` so callers don't have to juggle Chroma's
   ``ids / documents / embeddings / metadatas`` four-tuple shape.

5. **Low surface area.** The class is a thin façade — swapping in
   Qdrant / Weaviate / pgvector later is a one-file change.

Quickstart
----------

>>> from vector_db import VectorDatabase, PhoneRecord
>>> db = VectorDatabase(persist_dir="processed/chroma", collection="phones",
...                    dimension=384)
>>> db.add([
...     PhoneRecord(id="p1", name="iPhone 17 Pro", brand="Apple", price=152000,
...                 embedding=[0.1] * 384, description="..."),
... ])
>>> for hit in db.search(query_embedding=[0.1] * 384, top_k=3):
...     print(hit.score, hit.record.name)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Sequence

logger = logging.getLogger("vector_db")


# ──────────────────────────────────────────────────────────────────────
# Reserved metadata fields.
# ──────────────────────────────────────────────────────────────────────

# These keys are written to / read from Chroma metadata directly. They
# are first-class search inputs (see :meth:`VectorDatabase.search`) and
# MUST be passed on every :class:`PhoneRecord` consumed by this
# wrapper. Extra sidecar data goes under ``metadata["extra"]``.
RESERVED_FIELDS: frozenset[str] = frozenset({"name", "brand", "price"})


# ──────────────────────────────────────────────────────────────────────
# Public data classes
# ──────────────────────────────────────────────────────────────────────

@dataclass
class PhoneRecord:
    """One phone indexed in the vector store.

    Attributes:
        id:          Stable identifier (string). Used as the Chroma ``ids``
                     entry — collisions overwrite the previous document.
        embedding:   Vector embedding of the phone document. Length MUST
                     match the configured collection dimension.
        name:        Phone display name (e.g. ``"iPhone 17 Pro Max"``).
        brand:       Manufacturer (e.g. ``"Apple"``).
        price:       Listing price in your reporting currency. Use ``None``
                     to omit; ``0`` is treated as a valid (free / barter)
                     listing.
        description: Optional natural-language blob (full doc text from
                     ``build_rag_documents.py``). Stored on the
                     ``document`` slot — NOT in metadata — so it can be
                     retrieved verbatim on hits.
        metadata:    Optional sidecar dict; values must be JSON-serialisable
                     scalars. Stored as plain Chroma metadata.
    """

    id: str
    embedding: list[float]
    name: str = ""
    brand: str = ""
    price: float | int | None = None
    description: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass
class SearchHit:
    """One ranked search result.

    Attributes:
        record:   The matching :class:`PhoneRecord` reconstructed from
                  Chroma's payload (description / metadata included).
        score:    Cosine *similarity* in ``[-1.0, 1.0]`` (``1`` = identical,
                  ``0`` = orthogonal). Higher is better.
        distance: Raw cosine distance reported by Chroma (``1 − score``).
        rank:     0-based result rank within the originating search call.
    """

    record: PhoneRecord
    score: float
    distance: float
    rank: int


@dataclass
class SearchResponse:
    """A complete top-k search response.

    Attributes:
        query_embedding: The query vector that was searched. Echoed for
                         convenience when chaining follow-up queries.
        top_k:           The ``top_k`` that was applied (after clamping
                         against collection size).
        hits:            Ordered results, best-first.
    """

    query_embedding: list[float]
    top_k: int
    hits: list[SearchHit] = field(default_factory=list)

    def __iter__(self):
        return iter(self.hits)

    def __len__(self) -> int:
        return len(self.hits)

    def __bool__(self) -> bool:
        return bool(self.hits)


# ──────────────────────────────────────────────────────────────────────
# Vector database
# ──────────────────────────────────────────────────────────────────────

class VectorDatabase:
    """ChromaDB-backed phone vector store.

    All operations are synchronous and thread-safe for the underlying
    SQLite-backed Chroma client. Persist to disk by passing
    ``persist_dir``; omit it for an in-memory database useful in tests.

    Args:
        persist_dir:  Filesystem directory for the persistent store.
                      ``None`` runs purely in memory.
        collection:   Collection name (acts as a logical namespace —
                      different collections on the same persist_dir keep
                      disjoint document ids).
        dimension:    Required vector dimensionality. The collection is
                      tagged with this value and the wrapper rejects
                      mismatched vectors at write time.
        distance:     One of ``"cosine"``, ``"l2"``, ``"ip"`` (inner
                      product). Defaults to ``"cosine"``.
    """

    DEFAULT_DISTANCE = "cosine"

    def __init__(
        self,
        *,
        persist_dir: str | Path | None = "processed/chroma",
        collection: str = "phone_documents",
        dimension: int,
        distance: str = DEFAULT_DISTANCE,
    ) -> None:
        if dimension <= 0:
            raise ValueError(f"dimension must be a positive int, got {dimension!r}")
        if distance not in {"cosine", "l2", "ip"}:
            raise ValueError(
                f"distance must be one of 'cosine', 'l2', 'ip'; got {distance!r}"
            )

        # Lazy-import chromadb so the module remains importable in a
        # project that hasn't installed the SDK yet (e.g. during lint).
        try:
            import chromadb  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "chromadb is required. Install it with `pip install chromadb`."
            ) from exc

        if persist_dir is not None:
            persist_path = Path(persist_dir)
            persist_path.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(path=str(persist_path))
        else:
            # In-memory client for tests / ephemeral use.
            self._client = chromadb.EphemeralClient()

        self._persist_dir = persist_dir
        self._dimension = int(dimension)
        self._distance = distance

        # ``get_or_create_collection`` is idempotent — opening an existing
        # collection keeps whatever dimensionality / model metadata was
        # previously written.
        self._collection = self._client.get_or_create_collection(
            name=collection,
            metadata={
                "hnsw:space": distance,
                "vector_dimension": self._dimension,
            },
        )
        self._collection_name = collection
        logger.info(
            "Opened collection %r at %s (distance=%s, dimension=%d)",
            collection,
            persist_dir,
            distance,
            self._dimension,
        )

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def dimension(self) -> int:
        """Configured vector dimensionality."""
        return self._dimension

    @property
    def count(self) -> int:
        """Number of records currently in the collection."""
        return int(self._collection.count())

    @property
    def collection_name(self) -> str:
        """The Chroma collection name this instance is bound to."""
        return self._collection_name

    # ------------------------------------------------------------------
    # CRUD — Add / Upsert
    # ------------------------------------------------------------------

    def add(self, records: PhoneRecord | Iterable[PhoneRecord]) -> int:
        """Upsert one or many phone records into the collection.

        Chroma's ``upsert`` is used under the hood, so an existing record
        with the same ``id`` is overwritten with the new payload —
        exactly the semantics most callers expect from ``add``.

        Args:
            records: A single :class:`PhoneRecord` or any iterable of them.

        Returns:
            The number of records submitted (validation errors are raised
            and abort the call; nothing is partially-written).

        Raises:
            ValueError: If any vector length does not match
                        ``self.dimension``, or required fields are missing.
        """
        batch = self._normalise(records)
        if not batch:
            return 0
        self._validate_batch(batch)

        ids, documents, embeddings, metadatas = self._explode_batch(batch)
        self._collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.debug("Upserted %d record(s) into %r", len(batch), self._collection_name)
        return len(batch)

    # ------------------------------------------------------------------
    # CRUD — Update
    # ------------------------------------------------------------------

    def update(
        self,
        records: PhoneRecord | Iterable[PhoneRecord],
        *,
        rebuild_embedding: bool = False,
    ) -> int:
        """Apply a *partial* update to existing records.

        Chroma does not support true partial updates, so we implement
        this by:

        1. Reading the existing record(s).
        2. Overwriting user-provided fields on top.
        3. Re-upserting the merged record.

        Embeddings are preserved by default (so ``update(name="...",
        brand="...")`` doesn't require a recompute). Set
        ``rebuild_embedding=True`` if you have a fresh vector and want
        it installed.

        Args:
            records:          The :class:`PhoneRecord` instances to update.
                              ``id`` is mandatory; the remaining fields
                              keep their previous values when left at the
                              dataclass default.
            rebuild_embedding: When ``True``, replaces the stored
                               embedding with ``record.embedding``.
                               When ``False`` (default), the existing
                               embedding is preserved.

        Returns:
            Number of records updated.

        Raises:
            KeyError: If an ``id`` does not exist in the collection.
        """
        batch = self._normalise(records)
        if not batch:
            return 0

        existing = self._collection.get(
            ids=[r.id for r in batch],
            include=["embeddings", "metadatas", "documents"],
        )
        existing_by_id = dict(zip(existing["ids"], zip(
            existing["embeddings"] or [],
            existing["metadatas"] or [],
            existing["documents"] or [],
        )))

        merged: list[PhoneRecord] = []
        for rec in batch:
            payload = existing_by_id.get(rec.id)
            if payload is None:
                raise KeyError(f"Cannot update missing record: {rec.id!r}")
            prev_emb, prev_meta, prev_doc = payload

            if rebuild_embedding:
                new_emb = list(rec.embedding)
            else:
                # Sentinel: empty list on a fresh PhoneRecord means
                # "leave alone".
                new_emb = list(rec.embedding) if rec.embedding else list(prev_emb)

            merged.append(
                PhoneRecord(
                    id=rec.id,
                    embedding=new_emb,
                    name=rec.name or prev_meta.get("name", ""),
                    brand=rec.brand or prev_meta.get("brand", ""),
                    price=(
                        rec.price
                        if rec.price is not None
                        else prev_meta.get("price")
                    ),
                    description=rec.description if rec.description else prev_doc,
                    metadata={**prev_meta, **(rec.metadata or {})},
                )
            )

        return self.add(merged)

    # ------------------------------------------------------------------
    # CRUD — Delete
    # ------------------------------------------------------------------

    def delete(
        self,
        ids: str | Iterable[str] | None = None,
        *,
        where: dict | None = None,
    ) -> int:
        """Delete records by id list, by ``where`` filter, or both.

        Chroma's ``delete`` returns nothing, so we measure the impact
        by counting the collection size before/after.

        Args:
            ids:   A single id or an iterable of ids to remove.
            where: A Chroma ``where`` filter (e.g. ``{"brand": "Apple"}``).

        Returns:
            Number of records removed (best effort — estimated by
            collection size delta; Chroma does not return the count).

        Raises:
            ValueError: If neither ``ids`` nor ``where`` is supplied.
        """
        if ids is None and where is None:
            raise ValueError(
                "delete() requires at least one of `ids` or `where`."
            )

        if isinstance(ids, str):
            ids = [ids]
        elif ids is not None:
            ids = list(ids)

        before = self.count
        if ids is not None and where is not None:
            self._collection.delete(ids=ids, where=where)
        elif ids is not None:
            self._collection.delete(ids=ids)
        else:
            self._collection.delete(where=where)
        after = self.count
        removed = max(before - after, 0)
        logger.debug(
            "Deleted from %r (requested ids=%s, where=%s); removed ~%d",
            self._collection_name,
            ids,
            where,
            removed,
        )
        return removed

    # ------------------------------------------------------------------
    # Read — Search (cosine similarity top-k)
    # ------------------------------------------------------------------

    def search(
        self,
        *,
        query_embedding: Sequence[float],
        top_k: int = 5,
        where: dict | None = None,
        where_document: dict | None = None,
        include: Sequence[str] = ("documents", "metadatas"),
    ) -> SearchResponse:
        """Cosine-similarity top-k search.

        Args:
            query_embedding: Single query vector. Its length MUST match
                             ``self.dimension``; mismatches raise
                             ``ValueError`` before any work is done.
            top_k:           Maximum hits to return (clamped to the
                             collection size).
            where:           Optional Chroma metadata filter.
            where_document:  Optional Chroma document-text filter.
            include:         Payload sections to retrieve. The minimum
                             needed for hit reconstruction is always
                             added automatically.

        Returns:
            A :class:`SearchResponse` whose ``hits`` are ordered by
            cosine *similarity* (descending). Each hit carries the
            reconstructed :class:`PhoneRecord`, the raw cosine distance,
            and a 0-based rank.

        Raises:
            ValueError: If ``query_embedding`` is empty / wrong length
                        or ``top_k`` is non-positive.
        """
        if not query_embedding:
            raise ValueError("query_embedding must be a non-empty sequence")
        if len(query_embedding) != self._dimension:
            raise ValueError(
                f"query_embedding length {len(query_embedding)} does not match "
                f"configured dimension {self._dimension}"
            )
        if top_k <= 0:
            raise ValueError(f"top_k must be a positive int, got {top_k!r}")

        clamped_k = min(int(top_k), self.count) if self.count else 0
        if clamped_k == 0:
            return SearchResponse(query_embedding=list(query_embedding),
                                 top_k=int(top_k))

        # Chroma requires embeddings for queries; we must always include
        # them in the include list, plus the minimum we need.
        include_set = {"embeddings", "metadatas"} | set(include)
        raw = self._collection.query(
            query_embeddings=[list(query_embedding)],
            n_results=clamped_k,
            where=where,
            where_document=where_document,
            include=sorted(include_set),
        )

        ids       = (raw.get("ids") or [[]])[0]
        dists     = (raw.get("distances") or [[]])[0]
        embs      = (raw.get("embeddings") or [[]])[0]
        metas     = (raw.get("metadatas") or [[]])[0]
        documents = (raw.get("documents") or [[]])[0]

        hits: list[SearchHit] = []
        for rank, (id_, dist, emb, meta, doc) in enumerate(
            zip(ids, dists, embs, metas, documents)
        ):
            distance = float(dist)
            # Cosine similarity = 1 − cosine distance. For L2 / IP the
            # metric is reported differently; the caller can pick.
            if self._distance == "cosine":
                score = 1.0 - distance
            elif self._distance == "ip":
                # Chroma returns ``1 - inner_product`` for ip distance
                # on newer versions; we surface raw inner product as score.
                score = -distance
            else:
                # For L2 we keep ``distance`` only and expose similarity
                # as ``-distance`` so larger-is-better stays intuitive.
                score = -distance

            hits.append(
                SearchHit(
                    record=self._build_record(
                        id_=id_,
                        embedding=emb,
                        metadata=meta or {},
                        document=doc or "",
                    ),
                    score=float(score),
                    distance=distance,
                    rank=rank,
                )
            )

        return SearchResponse(
            query_embedding=list(query_embedding),
            top_k=int(top_k),
            hits=hits,
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Release the underlying client (no-op on EphemeralClient)."""
        close_fn = getattr(self._client, "close", None)
        if callable(close_fn):
            close_fn()

    def reset(self) -> None:
        """Delete every record in the collection (collection stays open).

        Useful when you want to re-index from scratch without losing
        the collection's metadata.
        """
        # Chroma accepts an empty ``where`` filter with ``delete_many``,
        # but the documented path is ``delete(where={})``.
        self._collection.delete(where={})

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalise(
        records: PhoneRecord | Iterable[PhoneRecord],
    ) -> list[PhoneRecord]:
        if isinstance(records, PhoneRecord):
            return [records]
        return list(records)

    def _validate_batch(self, batch: Sequence[PhoneRecord]) -> None:
        dim = self._dimension
        for rec in batch:
            if not rec.id:
                raise ValueError("every PhoneRecord must have a non-empty id")
            if not isinstance(rec.embedding, (list, tuple)):
                raise ValueError(
                    f"embedding for {rec.id!r} must be a list/tuple of floats"
                )
            if len(rec.embedding) != dim:
                raise ValueError(
                    f"embedding length {len(rec.embedding)} for {rec.id!r} "
                    f"does not match collection dimension {dim}"
                )

    @staticmethod
    def _explode_batch(
        batch: Sequence[PhoneRecord],
    ) -> tuple[list[str], list[str], list[list[float]], list[dict]]:
        ids: list[str] = []
        documents: list[str] = []
        embeddings: list[list[float]] = []
        metadatas: list[dict] = []
        for rec in batch:
            ids.append(rec.id)
            documents.append(rec.description or "")
            embeddings.append(list(rec.embedding))
            md: dict[str, Any] = {
                "name": str(rec.name),
                "brand": str(rec.brand),
            }
            if rec.price is not None:
                # Chroma metadata values must be str / int / float / bool.
                md["price"] = rec.price if isinstance(rec.price, (int, float)) else str(rec.price)
            # Merge arbitrary sidecar metadata but forbid reserved keys.
            for key, value in (rec.metadata or {}).items():
                if key in RESERVED_FIELDS:
                    raise ValueError(
                        f"reserved metadata key {key!r} on {rec.id!r} — set "
                        "the field on PhoneRecord directly"
                    )
                md[key] = value
            metadatas.append(md)
        return ids, documents, embeddings, metadatas

    @staticmethod
    def _build_record(
        *,
        id_: str,
        embedding: Any,
        metadata: dict,
        document: str,
    ) -> PhoneRecord:
        return PhoneRecord(
            id=id_,
            embedding=list(embedding) if embedding is not None else [],
            name=str(metadata.get("name", "")),
            brand=str(metadata.get("brand", "")),
            price=metadata.get("price"),
            description=str(document or ""),
            metadata={
                k: v
                for k, v in metadata.items()
                if k not in {"name", "brand", "price"}
            },
        )
