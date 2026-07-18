"""
Google Gemini embeddings via the ``google-generativeai`` SDK.

Install:    pip install google-generativeai
Env var:    GEMINI_API_KEY  (or GOOGLE_API_KEY)
Default model: text-embedding-004  (768 dims)
"""

from __future__ import annotations

import logging
import os
from typing import Sequence

from .config import PipelineConfig
from .embedders import BaseEmbedder


logger = logging.getLogger("embedding_pipeline.embedders.gemini")


class GeminiEmbedder(BaseEmbedder):
    """Embed documents using Google's Gemini embedding model."""

    def __init__(self, cfg: PipelineConfig) -> None:
        try:
            import google.generativeai as genai  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "google-generativeai is required for the Gemini provider. "
                "Install it with `pip install google-generativeai`."
            ) from exc

        cfg.require_api_key()
        api_key = cfg.resolved_api_key()
        # google-generativeai accepts either GEMINI_API_KEY or GOOGLE_API_KEY.
        os.environ.setdefault("GOOGLE_API_KEY", api_key)
        genai.configure(api_key=api_key)
        self._genai = genai
        self.model_name = cfg.resolved_model()
        # text-embedding-004 → 768, embedding-001 → 768.
        self._dimension = 768
        logger.info("Initialised GeminiEmbedder model=%s", self.model_name)

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        texts = self._validate_texts(texts)
        # The SDK accepts a list of strings; one API call returns one
        # embedding per input. ``task_type`` is set to RETRIEVAL_DOCUMENT
        # which is the canonical choice for RAG indexing.
        result = self._genai.embed_content(
            model=f"models/{self.model_name}",
            content=list(texts),
            task_type="retrieval_document",
        )
        # The SDK returns either {"embedding": [...]} for a single input or
        # {"embeddings": [{"values": [...]}, ...]} for batch input.
        if "embeddings" in result:
            return [e["values"] for e in result["embeddings"]]
        return [result["embedding"]]