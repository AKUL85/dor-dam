"""
embedders.py
============

Pluggable embedding back-ends.

Each embedder implements the :class:`BaseEmbedder` protocol:

* ``dimension`` — dimensionality of the produced vectors (used to size
  the Chroma collection at creation time).
* ``embed_documents(texts)`` — embed a batch of strings and return a
  list of vectors aligned with the input order.

The four supported providers are:

* :class:`OpenAIEmbedder`               — OpenAI's ``text-embedding-3-*``
                                           models via the official SDK.
* :class:`GeminiEmbedder`               — Google's ``text-embedding-004``
                                           via the ``google-generativeai``
                                           SDK.
* :class:`SentenceTransformerEmbedder`  — any model from the HuggingFace
                                           ``sentence-transformers`` hub.
* :class:`BGEEmbedder`                  — BAAI / BGE models (bge-m3 by
                                           default) loaded via the
                                           ``FlagEmbedding`` library
                                           which supports dense + sparse
                                           retrieval.

Each provider is **imported lazily** inside its module so the pipeline
remains importable even if only one provider's SDK is installed. The
``__init__`` of each class raises a clear ``ImportError`` pointing at
``pip install ...`` if the dependency is missing.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Iterable, Sequence

from .config import EmbeddingProvider, PipelineConfig


logger = logging.getLogger("embedding_pipeline.embedders")


# ──────────────────────────────────────────────────────────────────────
# Abstract base
# ──────────────────────────────────────────────────────────────────────

class BaseEmbedder(ABC):
    """Common contract for every embedding provider.

    A subclass is expected to:

    1. Open the heavy model / client handle in ``__init__``.
    2. Report its vector dimensionality via :attr:`dimension` so the
       Chroma collection can be created with the right shape.
    3. Implement :meth:`embed_documents` for batched embedding. The
       pipeline guarantees inputs are non-empty strings.

    Implementations should also expose the underlying model name as
    :attr:`model_name` so we can store it in the collection metadata.
    """

    #: Model identifier — populated by every concrete subclass.
    model_name: str = ""

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Dimensionality of the vectors this embedder produces."""

    @abstractmethod
    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed ``texts`` and return a list of float vectors.

        Implementations **must**:
        * preserve the input order,
        * return one vector per input string,
        * L2-normalise the vectors if the config asks for it.
        """

    @staticmethod
    def _validate_texts(texts: Sequence[str]) -> list[str]:
        cleaned = [t if isinstance(t, str) else str(t) for t in texts]
        if not cleaned:
            raise ValueError("embed_documents called with empty input list")
        return cleaned


# ──────────────────────────────────────────────────────────────────────
# Factory
# ──────────────────────────────────────────────────────────────────────

def build_embedder(cfg: PipelineConfig) -> BaseEmbedder:
    """Return the embedder implementation matching ``cfg.provider``.

    Raises:
        ValueError: If the provider string is not recognised.
        ImportError: If the provider's SDK is not installed.
    """
    if cfg.provider == EmbeddingProvider.OPENAI:
        from ._openai_embedder import OpenAIEmbedder

        return OpenAIEmbedder(cfg)
    if cfg.provider == EmbeddingProvider.GEMINI:
        from ._gemini_embedder import GeminiEmbedder

        return GeminiEmbedder(cfg)
    if cfg.provider == EmbeddingProvider.SENTENCE_TRANSFORMERS:
        from ._st_embedder import SentenceTransformerEmbedder

        return SentenceTransformerEmbedder(cfg)
    if cfg.provider == EmbeddingProvider.BGE_M3:
        from ._bge_embedder import BGEEmbedder

        return BGEEmbedder(cfg)
    raise ValueError(f"Unsupported embedding provider: {cfg.provider!r}")


# ──────────────────────────────────────────────────────────────────────
# Provider: OpenAI
# ──────────────────────────────────────────────────────────────────────
# File kept separate so each provider's heavy import is isolated.
