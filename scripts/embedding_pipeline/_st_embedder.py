"""
Sentence-Transformers embeddings (HuggingFace).

Install:    pip install sentence-transformers torch
Default model: sentence-transformers/all-MiniLM-L6-v2  (384 dims)

Runs entirely locally — GPU is auto-selected when ``device="cuda"`` is
passed in the config, otherwise CPU.
"""

from __future__ import annotations

import logging
from typing import Sequence

from .config import PipelineConfig
from .embedders import BaseEmbedder


logger = logging.getLogger("embedding_pipeline.embedders.st")


class SentenceTransformerEmbedder(BaseEmbedder):
    """Embed documents with the ``sentence-transformers`` library."""

    def __init__(self, cfg: PipelineConfig) -> None:
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "sentence-transformers is required for the local provider. "
                "Install it with `pip install sentence-transformers`."
            ) from exc

        self.model_name = cfg.resolved_model()
        self._normalize = cfg.normalize
        self._device = cfg.device
        logger.info(
            "Loading sentence-transformers model %s on device=%s",
            self.model_name,
            self._device,
        )
        self._model = SentenceTransformer(self.model_name, device=self._device)
        # ``get_sentence_embedding_dimension`` is the canonical way to read
        # the model's output size without doing a probe embedding.
        self._dimension: int = int(self._model.get_sentence_embedding_dimension())
        logger.info(
            "Initialised SentenceTransformerEmbedder model=%s dim=%d",
            self.model_name,
            self._dimension,
        )

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        texts = self._validate_texts(texts)
        vectors = self._model.encode(
            list(texts),
            convert_to_numpy=True,
            normalize_embeddings=self._normalize,
            show_progress_bar=False,
        )
        return [v.tolist() for v in vectors]