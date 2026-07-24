"""
embedding_pipeline
==================

Configurable, resumable embedding pipeline for the DorDam phone catalogue.

Submodules
----------
* :mod:`config`         — dataclass ``PipelineConfig`` + ``EmbeddingProvider`` enum.
* :mod:`utils`          — logging, ``FailureTracker``, batching helpers.
* :mod:`loaders`        — JSONL document loaders (``Document`` dataclass).
* :mod:`embedders`      — abstract base + factory wiring every provider.
* :mod:`_openai_embedder`, :mod:`_gemini_embedder`,
  :mod:`_st_embedder`, :mod:`_bge_embedder` — concrete providers.
* :mod:`chroma_store`   — Chroma wrapper with skip-if-exists semantics.
* :mod:`runner`         — end-to-end orchestrator with tqdm progress.
* :mod:`__main__`       — ``python -m embedding_pipeline`` CLI entrypoint.

Quickstart
----------

.. code-block:: bash

    # Local, no API keys needed:
    python -m embedding_pipeline \\
        --provider sentence_transformers

    # Hosted (reads OPENAI_API_KEY / GEMINI_API_KEY from env):
    OPENAI_API_KEY=... python -m embedding_pipeline --provider openai

    # Custom model + persistence directory:
    python -m embedding_pipeline \\
        --provider bge_m3 \\
        --model BAAI/bge-large-en-v1.5 \\
        --persist-dir storage/chroma
"""

from .config import EmbeddingProvider, PipelineConfig
from .loaders import Document, JsonlDocumentLoader, load_jsonl
from .embedders import BaseEmbedder, build_embedder
from .chroma_store import ChromaStore, IndexedRecord
from .runner import PipelineRunner, run_pipeline

__all__ = [
    "Document",
    "JsonlDocumentLoader",
    "load_jsonl",
    "EmbeddingProvider",
    "PipelineConfig",
    "BaseEmbedder",
    "build_embedder",
    "ChromaStore",
    "IndexedRecord",
    "PipelineRunner",
    "run_pipeline",
]

__version__ = "0.1.0"
