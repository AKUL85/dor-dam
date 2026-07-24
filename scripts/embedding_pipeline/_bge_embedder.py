"""
BAAI / BGE embeddings via the ``FlagEmbedding`` library.

Install:    pip install FlagEmbedding
Default model: BAAI/bge-m3  (1024 dims, multilingual)

The library supports several BGE variants (``bge-large``, ``bge-small``,
``bge-m3``); we expose ``model_name`` as a plain constructor argument so
the caller can swap freely.

Why a separate module?
----------------------
FlagEmbedding ships a separate ``BGEM3FlagModel`` API for ``bge-m3`` with
optional sparse / multi-vector retrieval; we use the dense-only path here
to keep the output shape aligned with the other providers.
"""

from __future__ import annotations

import logging
from typing import Sequence

from .config import PipelineConfig
from .embedders import BaseEmbedder


logger = logging.getLogger("embedding_pipeline.embedders.bge")


class BGEEmbedder(BaseEmbedder):
    """Embed documents with a BAAI / BGE model."""

    def __init__(self, cfg: PipelineConfig) -> None:
        try:
            from FlagEmbedding import FlagModel  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "FlagEmbedding is required for the BGE provider. "
                "Install it with `pip install FlagEmbedding`."
            ) from exc

        self.model_name = cfg.resolved_model()
        self._normalize = cfg.normalize
        logger.info("Loading BGE model %s (query_max_length=256)", self.model_name)
        # ``use_fp16`` only on CUDA; flag toggled internally by the library.
        self._model = FlagModel(
            self.model_name,
            query_instruction_for_retrieval="Represent this sentence for searching relevant passages: ",
            use_fp16=False,
        )
        # BGE-M3 dense vector dim is 1024; older models vary. Read once.
        self._dimension: int = 1024
        logger.info(
            "Initialised BGEEmbedder model=%s dim=%d", self.model_name, self._dimension
        )

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        texts = self._validate_texts(texts)
        # FlagModel.encode returns numpy arrays of shape (n, dim).
        vectors = self._model.encode(list(texts))
        return [v.tolist() for v in vectors]