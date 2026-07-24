"""
ingest
======

Incremental update pipeline for new scraper batches.

Public surface
--------------

* :mod:`manifest`  — per-productUrl tracking on disk (content_hash + doc_hash).
* :mod:`merge`     — read ``backend/output/*.json``, normalise to one record per URL.
* :mod:`db_apply`  — push only-changed rows into Postgres.
* :mod:`embed_apply` — re-embed and upsert only the changed phones into Chroma.
* :mod:`pipeline`  — orchestrator + :func:`run_ingest` end-to-end.

Quickstart
----------

.. code-block:: bash

    # From the repo root, with PYTHONPATH=scripts
    python -m ingest --scrape-dir backend/output
"""
from .manifest import (
    IngestDiff,
    IngestManifest,
    ManifestEntry,
    canonicalise,
    content_hash,
    content_hash_stable,
    doc_hash,
    stable_payload,
)
from .merge import (
    PhoneBatch,
    discover_scrape_files,
    load_batch,
    render_doc_text,
)
from .db_apply import DBApplyReport, apply_records, rebuild_full
from .embed_apply import EmbedApplyReport, apply_embeddings, doc_id_for
from .pipeline import IngestConfig, IngestReport, run_ingest

__all__ = [
    # manifest
    "IngestDiff",
    "IngestManifest",
    "ManifestEntry",
    "canonicalise",
    "content_hash",
    "content_hash_stable",
    "doc_hash",
    "stable_payload",
    # merge
    "PhoneBatch",
    "discover_scrape_files",
    "load_batch",
    "render_doc_text",
    # db
    "DBApplyReport",
    "apply_records",
    "rebuild_full",
    # embed
    "EmbedApplyReport",
    "apply_embeddings",
    "doc_id_for",
    # pipeline
    "IngestConfig",
    "IngestReport",
    "run_ingest",
]

__version__ = "0.1.0"
