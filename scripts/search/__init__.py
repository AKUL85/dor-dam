"""Semantic search engine over the Chroma phone-document index.

This package depends only on ``numpy`` and ``chromadb`` — there are no
external embedding models required. The bundled
:class:`HashedTfIdfEmbedder` is a hashed-feature TF-IDF embedder that
runs in milliseconds on CPU and produces deterministic 384-dim vectors.

Pipeline:
    1. Embed the question with ``HashedTfIdfEmbedder``.
    2. Chroma cosine top-K (broad recall).
    3. Lexical BM25-lite rerank on the candidates (precise context).
    4. Return top-N reranked contexts with metadata.
"""
from search.engine import (
    SearchEngine,
    SearchHit,
    SearchResult,
    Bm25Reranker,
    render_markdown,
)
from search.embedder import (
    HashedTfIdfEmbedder,
    EmbedderConfig,
    compute_idf,
    build_bucket_idf,
    hashed_vector,
    tokenize,
)
from search.indexer import build_index, iter_docs, ParsedDoc

__all__ = [
    # engine
    "SearchEngine",
    "SearchHit",
    "SearchResult",
    "Bm25Reranker",
    "render_markdown",
    # embedder
    "HashedTfIdfEmbedder",
    "EmbedderConfig",
    "compute_idf",
    "build_bucket_idf",
    "hashed_vector",
    "tokenize",
    # indexer
    "build_index",
    "iter_docs",
    "ParsedDoc",
]