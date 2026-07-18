"""
OpenAI embeddings via the official ``openai`` Python SDK.

Install:    pip install openai
Env var:    OPENAI_API_KEY
Default model: text-embedding-3-small  (1536 dims, cheap + fast)

Notes
-----
``text-embedding-3-*`` models natively support a ``dimensions`` parameter
which we forward from the config so the produced vectors match the size
our Chroma collection expects.
"""

from __future__ import annotations

import logging
from typing import Sequence

from .config import PipelineConfig
from .embedders import BaseEmbedder


logger = logging.getLogger("embedding_pipeline.embedders.openai")


class OpenAIEmbedder(BaseEmbedder):
    """Embed documents with OpenAI's embedding API."""

    def __init__(self, cfg: PipelineConfig) -> None:
        try:
            from openai import OpenAI  # type: ignore
        except ImportError as exc:  # pragma: no cover - exercised at runtime
            raise ImportError(
                "openai is required for the OpenAI provider. "
                "Install it with `pip install openai`."
            ) from exc

        cfg.require_api_key()
        self._client = OpenAI(api_key=cfg.resolved_api_key())
        self.model_name = cfg.resolved_model()
        self._normalize = cfg.normalize
        # Newer 3-* models support the ``dimensions`` parameter; older
        # ada-002 does not. We always send it for 3-* and silently skip
        # otherwise.
        self._supports_dim_param = self.model_name.startswith("text-embedding-3-")
        # text-embedding-3-small default dimension is 1536; let the API
        # tell us the actual size for the chosen model on first call.
        self._dimension: int | None = None
        logger.info("Initialised OpenAIEmbedder model=%s", self.model_name)

    @property
    def dimension(self) -> int:
        if self._dimension is None:
            # Best-effort default for the canonical models; the first call
            # will overwrite this with the real size returned by OpenAI.
            self._dimension = {
                "text-embedding-3-small": 1536,
                "text-embedding-3-large": 3072,
                "text-embedding-ada-002": 1536,
            }.get(self.model_name, 1536)
        return self._dimension

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        texts = self._validate_texts(texts)
        kwargs: dict = {"model": self.model_name, "input": list(texts)}
        if self._supports_dim_param:
            kwargs["dimensions"] = self.dimension
        response = self._client.embeddings.create(**kwargs)
        vectors = [item.embedding for item in response.data]
        # Cache the *actual* dimensionality reported by the response so
        # the property stays accurate.
        if vectors and len(vectors[0]) != self._dimension:
            self._dimension = len(vectors[0])
        return vectors