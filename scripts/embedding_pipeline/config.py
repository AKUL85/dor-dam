"""
config.py
=========

Centralised runtime configuration for the embedding pipeline.

Every other module reads its settings from :class:`PipelineConfig` so the
operator only has to edit / pass values in one place. The defaults are
chosen so the pipeline can be re-run end-to-end with no environment
variables, assuming the chosen provider is installed and (for hosted
providers) its API key is set.

Typical usage
-------------

.. code-block:: python

    from embedding_pipeline.config import PipelineConfig, EmbeddingProvider
    cfg = PipelineConfig(provider=EmbeddingProvider.OPENAI)
    cfg.require_api_key()        # raises if OPENAI_API_KEY is missing
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


# ──────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────

# Default local persistence directory for ChromaDB.
DEFAULT_PERSIST_DIR = Path("processed/chroma")

# Default Chroma collection name.
DEFAULT_COLLECTION = "phone_documents"

# Default JSONL source produced by ``build_rag_documents.py``.
DEFAULT_INPUT = Path("processed/phone_documents.jsonl")

# Provider → (env var name, default model id)
#
# ``default_model`` is what we use when the operator does not pass one
# explicitly. Every model here is a sensible, widely-available choice.
PROVIDER_DEFAULTS: dict[str, tuple[str, str]] = {
    "openai":               ("OPENAI_API_KEY",               "text-embedding-3-small"),
    "gemini":               ("GEMINI_API_KEY",               "text-embedding-004"),
    "sentence_transformers":("",                             "sentence-transformers/all-MiniLM-L6-v2"),
    "bge_m3":               ("",                             "BAAI/bge-m3"),
}


# ──────────────────────────────────────────────────────────────────────
# Public types
# ──────────────────────────────────────────────────────────────────────

class EmbeddingProvider(str, Enum):
    """Supported embedding back-ends.

    Inheriting from ``str`` lets the enum be passed straight to ``argparse``
    while also comparing equal to plain strings — convenient when a caller
    reads the value back from disk.
    """

    OPENAI = "openai"
    GEMINI = "gemini"
    SENTENCE_TRANSFORMERS = "sentence_transformers"
    BGE_M3 = "bge_m3"


@dataclass(frozen=True)
class PipelineConfig:
    """Immutable configuration for one pipeline run.

    Frozen so we can pass it around freely without worrying about a
    downstream module mutating provider / persist_dir mid-run.
    """

    provider: EmbeddingProvider
    model: str = ""
    input_path: Path = DEFAULT_INPUT
    persist_dir: Path = DEFAULT_PERSIST_DIR
    collection_name: str = DEFAULT_COLLECTION
    batch_size: int = 32
    api_key: str = ""            # explicit override; otherwise read from env
    device: str = "cpu"          # torch device for local models
    normalize: bool = True       # L2-normalise embeddings (Chroma cosine sim)
    extra: dict = field(default_factory=dict)

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    def resolved_model(self) -> str:
        """Return the configured model or the provider's default."""
        if self.model:
            return self.model
        return PROVIDER_DEFAULTS[self.provider.value][1]

    def resolved_api_key(self) -> str:
        """Return the explicit key, falling back to the matching env var."""
        if self.api_key:
            return self.api_key
        env_var = PROVIDER_DEFAULTS[self.provider.value][0]
        return os.environ.get(env_var, "")

    def require_api_key(self) -> str:
        """Return the API key, raising ``RuntimeError`` if missing.

        Only relevant for hosted providers. Local sentence-transformers and
        bge-m3 do not require a key, so calling this on them always succeeds.
        """
        key = self.resolved_api_key()
        if self.provider in (EmbeddingProvider.OPENAI, EmbeddingProvider.GEMINI):
            if not key:
                env_var = PROVIDER_DEFAULTS[self.provider.value][0]
                raise RuntimeError(
                    f"Missing API key for {self.provider.value}. "
                    f"Set ${env_var} or pass --api-key."
                )
        return key