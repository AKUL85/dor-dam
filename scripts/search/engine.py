"""Semantic search engine over the Chroma phone-document index.

Pipeline (per query):
    1. Embed the question with the hashed TF-IDF embedder.
    2. Chroma cosine top-K (configurable; default 25) — broad recall
       pass over the corpus, optionally filtered by metadata.
    3. Lexical BM25-lite rerank on the K candidates, blended with the
       cosine score — pushes the most keyword-relevant context to the
       top of the response.
    4. Return the top-``top_k`` reranked contexts as
       :class:`SearchResult`.

The reranker is intentionally lightweight:

* TF computed per-document at index time.
* IDF read from the same table the embedder was fit on.
* Document length normalised by the corpus mean.

The blend is a simple weighted sum of normalised cosine similarity
and normalised BM25 — both land in ``[0, 1]`` after normalisation.
"""
from __future__ import annotations

import json
import logging
import math
import re
import statistics
from contextlib import ExitStack
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence

import numpy as np

from search.embedder import (
    EmbedderConfig,
    HashedTfIdfEmbedder,
    compute_idf,
    load_idf,
    tokenize,
)

logger = logging.getLogger("search.engine")


DEFAULT_PERSIST_DIR = Path("processed/chroma")
DEFAULT_COLLECTION = "phone_documents"
DEFAULT_CACHE_DIR = Path("processed/search_cache")
DEFAULT_DIM = 384


# ──────────────────────────────────────────────────────────────────────
# Public dataclasses
# ──────────────────────────────────────────────────────────────────────

@dataclass
class SearchHit:
    id: str
    name: str
    brand: str
    category: str
    snippet: str                 # first ~280 chars of the document
    score: float                 # blended cosine + BM25 score, larger better
    cosine_score: float
    bm25_score: float
    rank: int
    metadata: dict = field(default_factory=dict)


@dataclass
class SearchResult:
    query: str
    top_k: int
    candidates: int              # how many came back from Chroma
    hits: list[SearchHit] = field(default_factory=list)

    def __iter__(self):
        return iter(self.hits)

    def __len__(self) -> int:
        return len(self.hits)

    def __bool__(self) -> bool:
        return bool(self.hits)


# ──────────────────────────────────────────────────────────────────────
# BM25-lite reranker
# ──────────────────────────────────────────────────────────────────────

@dataclass
class _DocStats:
    """Per-document stats cached at retrieval time so we can compute
    BM25 over candidates without re-tokenising every query."""
    tf: dict[str, int]
    length: int


class Bm25Reranker:
    """Stateless OKapi BM25 scorer.

    Computed on-demand from the candidate texts + the corpus IDF table.
    Not a full inverted index — the corpus is small (a few hundred
    candidates after Chroma filtering) so a per-query scan is fine.
    """

    def __init__(
        self,
        *,
        idf: dict[str, float],
        k1: float = 1.5,
        b: float = 0.75,
    ) -> None:
        self.idf = idf
        self.k1 = k1
        self.b = b

    def fit_docs(self, docs: Sequence[str]) -> tuple[list[_DocStats], float]:
        """Tokenise ``docs`` and return (per-doc stats, mean doc length)."""
        stats: list[_DocStats] = []
        lengths: list[int] = []
        for d in docs:
            tokens = tokenize(d)
            tf: dict[str, int] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            stats.append(_DocStats(tf=tf, length=len(tokens) or 1))
            lengths.append(len(tokens) or 1)
        mean = statistics.mean(lengths) if lengths else 1.0
        return stats, float(mean)

    def score(
        self,
        query_tokens: Sequence[str],
        stats: list[_DocStats],
        mean_length: float,
    ) -> list[float]:
        if not stats:
            return []
        scores = [0.0] * len(stats)
        for q in set(query_tokens):
            idf = self.idf.get(q, 0.0)
            if idf <= 0:
                continue
            for i, doc in enumerate(stats):
                f = doc.tf.get(q, 0)
                if f == 0:
                    continue
                denom = f + self.k1 * (1.0 - self.b + self.b * (doc.length / mean_length))
                scores[i] += idf * (f * (self.k1 + 1)) / denom
        return scores


# ──────────────────────────────────────────────────────────────────────
# Engine
# ──────────────────────────────────────────────────────────────────────

class SearchEngine:
    """End-to-end semantic search.

    Initialise once (loads IDF + opens Chroma); call :meth:`search`
    as many times as you need.

    Args:
        persist_dir:  Where the Chroma store lives.
        collection:   Chroma collection name.
        dim:          Embedder dimension. Must match the index.
        cache_dir:    Where the IDF table was persisted by the indexer.
        candidate_k:  How many candidates to fetch from Chroma before
                      reranking (default 25).
    """

    def __init__(
        self,
        *,
        persist_dir: Path | str = DEFAULT_PERSIST_DIR,
        collection: str = DEFAULT_COLLECTION,
        dim: int = DEFAULT_DIM,
        cache_dir: Path | str = DEFAULT_CACHE_DIR,
        candidate_k: int = 25,
    ) -> None:
        self.persist_dir = Path(persist_dir)
        self.collection_name = collection
        self.dim = dim
        self.cache_dir = Path(cache_dir)
        self.candidate_k = candidate_k

        self.embedder = HashedTfIdfEmbedder(EmbedderConfig(
            dim=dim, cache_dir=self.cache_dir,
        ))
        # Load persisted IDF so queries live in the same vector space
        # as the indexed docs.
        try:
            self.embedder.load()
        except FileNotFoundError:
            logger.warning(
                "No IDF table at %s; falling back to TF-only vectors",
                self.cache_dir / "idf.json",
            )

        try:
            self.idf = load_idf(self.cache_dir / "idf.json")
        except FileNotFoundError:
            self.idf = {}

        try:
            import chromadb
            self._client = chromadb.PersistentClient(path=str(self.persist_dir))
            self._collection = self._client.get_or_create_collection(
                name=collection,
                metadata={"hnsw:space": "cosine", "vector_dimension": dim},
            )
        except Exception as exc:
            logger.error("Failed to open Chroma collection: %s", exc)
            raise

    @property
    def corpus_size(self) -> int:
        return int(self._collection.count())

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search(
        self,
        query: str,
        *,
        top_k: int = 5,
        candidate_k: int | None = None,
        where: dict | None = None,
        where_document: dict | None = None,
        blend_alpha: float = 0.5,
    ) -> SearchResult:
        """Top-``top_k`` documents that best answer ``query``.

        Args:
            query:          Free-form question (English).
            top_k:          Final size of the reranked result.
            candidate_k:    Override the candidate fan-out for this
                            call only (default ``self.candidate_k``).
            where:          Chroma metadata filter (e.g.
                            ``{"brand": "Samsung"}`` or
                            ``{"price_min": {"$lte": 30000}}``).
            where_document: Chroma document-text filter.
            blend_alpha:    Weight on the BM25 rerank (``0`` ⇒ pure
                            cosine, ``1`` ⇒ pure BM25). Default 0.5.
        """
        if not query or not query.strip():
            raise ValueError("query must be a non-empty string")
        if top_k <= 0:
            raise ValueError("top_k must be positive")

        cand = int(candidate_k or self.candidate_k)
        cand = max(cand, top_k)

        # 1) Embed
        q_vec = self.embedder.embed_query(query)

        # 2) Chroma top-k
        response = self._collection.query(
            query_embeddings=[q_vec.tolist()],
            n_results=min(cand, max(1, self.corpus_size)),
            where=where,
            where_document=where_document,
            include=["documents", "metadatas", "distances"],
        )
        ids = (response.get("ids") or [[]])[0]
        docs = (response.get("documents") or [[]])[0]
        metas = (response.get("metadatas") or [[]])[0]
        dists = (response.get("distances") or [[]])[0]
        if not ids:
            return SearchResult(query=query, top_k=top_k, candidates=0)

        # 3) Lexical BM25 rerank
        reranker = Bm25Reranker(idf=self.idf)
        stats, mean_len = reranker.fit_docs(docs)
        bm_scores = reranker.score(tokenize(query), stats, mean_len)

        cosine_scores = [1.0 - float(d) for d in dists]
        blended = _blend(cosine_scores, bm_scores, blend_alpha)

        # 4) Order + slice
        order = np.argsort(-np.asarray(blended))[:top_k]
        hits: list[SearchHit] = []
        for out_rank, idx in enumerate(order):
            md = metas[idx] or {}
            hits.append(SearchHit(
                id=ids[idx],
                name=str(md.get("name", "")),
                brand=str(md.get("brand", "")),
                category=str(md.get("category", "")),
                snippet=_snippet(docs[idx]),
                score=float(blended[idx]),
                cosine_score=float(cosine_scores[idx]),
                bm25_score=float(bm_scores[idx]),
                rank=out_rank,
                metadata=_safe_meta(md),
            ))
        return SearchResult(
            query=query,
            top_k=top_k,
            candidates=len(ids),
            hits=hits,
        )


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _blend(cos: list[float], bm: list[float], alpha: float) -> list[float]:
    """Min-max normalise each list, then ``alpha * bm + (1-alpha) * cos``."""
    n = len(cos)
    if n == 0:
        return []
    cos_arr = np.asarray(cos, dtype=np.float32)
    bm_arr = np.asarray(bm, dtype=np.float32)
    cos_n = _minmax(cos_arr)
    bm_n = _minmax(bm_arr)
    blended = (1.0 - alpha) * cos_n + alpha * bm_n
    return blended.tolist()


def _minmax(arr: np.ndarray) -> np.ndarray:
    lo = float(arr.min())
    hi = float(arr.max())
    if hi - lo < 1e-9:
        return np.zeros_like(arr)
    return (arr - lo) / (hi - lo)


def _snippet(text: str, *, max_len: int = 280) -> str:
    text = (text or "").strip()
    text = re.sub(r"\s+", " ", text)
    if len(text) <= max_len:
        return text
    cut = text[:max_len].rsplit(" ", 1)[0]
    return cut + "…"


def _safe_meta(md: dict) -> dict:
    """Return a JSON-safe copy of the metadata (drop non-scalars)."""
    out: dict = {}
    for k, v in md.items():
        if isinstance(v, (int, float, str, bool)) or v is None:
            out[k] = v
        else:
            out[k] = str(v)
    return out


# ──────────────────────────────────────────────────────────────────────
# Markdown rendering
# ──────────────────────────────────────────────────────────────────────

def render_markdown(result: SearchResult) -> str:
    if not result.hits:
        return f"# Search — \"{result.query}\"\n\n_No matching documents._\n"
    lines = [
        f"# Search — \"{result.query}\"",
        f"_{len(result.hits)} best contexts (reranked from {result.candidates} candidates)_",
        "",
    ]
    for h in result.hits:
        name = h.name or "(unknown)"
        brand = f" — {h.brand}" if h.brand else ""
        title = f"## {name}{brand}" if brand else f"## {name}"
        lines.append(f"{title}")
        meta_bits = []
        if h.category:
            meta_bits.append(f"category: {h.category}")
        if "price_min" in h.metadata and "price_max" in h.metadata:
            meta_bits.append(
                f"price: {h.metadata['price_min']:,}–{h.metadata['price_max']:,} BDT"
            )
        if "in_stock_count" in h.metadata:
            meta_bits.append(f"in stock: {h.metadata['in_stock_count']} stores")
        meta_bits.append(f"score: {h.score:.3f}")
        lines.append("  " + " · ".join(meta_bits))
        lines.append("")
        lines.append(f"> {h.snippet}")
        lines.append("")
    return "\n".join(lines)