"""POST /update — trigger an out-of-band scrape + re-index.

Two flows:

* **Live mode (``dry_run=False``)** — runs the incremental ingest
  pipeline (``scripts.ingest.run_ingest``) inline, off the event loop
  via ``run_in_threadpool``. Reads already-scraped JSON from
  ``backend/output/``, diffs against the persistent manifest, and only
  touches Postgres / Chroma for *changed* phones.
* **Dry-run** — logs the plan and returns immediately. Used as a cheap
  "what would this do?" probe.

Both branches share the same response shape. Live mode also embeds a
short :class:`IngestReport.to_dict` in the response ``detail`` field so
operators can inspect the run from the API client without trawling
logs.
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from ..deps import BoundLogger, get_request_logger
from ..schemas import UpdateRequest, UpdateResponse

router = APIRouter(prefix="/update", tags=["update"])
_logger = logging.getLogger("api.routers.update")


def _build_ingest_config(repo_root: Path, log: BoundLogger):
    """Build an :class:`ingest.IngestConfig` wired to repo-root paths."""
    # Imported lazily so a request that only hits the dry-run branch
    # never pays for a Chroma import.
    from ingest import IngestConfig

    pipeline_cfg = None
    if os.environ.get("INGEST_EMBEDDINGS", "1").lower() not in {"0", "false", "no"}:
        try:
            from embedding_pipeline.config import EmbeddingProvider, PipelineConfig

            provider_name = os.environ.get(
                "INGEST_EMBEDDING_PROVIDER", "sentence_transformers"
            )
            pipeline_cfg = PipelineConfig(
                provider=EmbeddingProvider(provider_name),
                input_path=repo_root / "processed" / "phone_documents.jsonl",
                persist_dir=repo_root / "processed" / "chroma",
                batch_size=int(os.environ.get("INGEST_BATCH_SIZE", "200")),
            )
        except Exception as exc:  # noqa: BLE001
            log.warning(
                "embed pipeline init failed (%s) — running DB-only ingest", exc
            )
            pipeline_cfg = None

    return IngestConfig(
        scrape_dir=repo_root / "backend" / "output",
        manifest_path=repo_root / "processed" / "ingest_manifest.json",
        db_enabled=True,
        embed_enabled=pipeline_cfg is not None,
        pipeline_cfg=pipeline_cfg,
    )


async def _run_pipeline_in_thread(repo_root: Path, log: BoundLogger) -> dict:
    """Run :func:`ingest.run_ingest` in a worker thread."""
    from ingest import run_ingest

    cfg = _build_ingest_config(repo_root, log)
    report = await run_in_threadpool(run_ingest, cfg)
    return report.to_dict()


@router.post("", response_model=UpdateResponse)
async def post_update(
    payload: UpdateRequest,
    log: BoundLogger = Depends(get_request_logger),
) -> UpdateResponse:
    job_id = str(uuid.uuid4())
    repo_root = Path(__file__).resolve().parents[2]

    if payload.dry_run:
        log.info(
            "update dry_run job=%s stores=%s reindex=%s",
            job_id, payload.stores or ["<all>"], payload.reindex,
        )
        return UpdateResponse(
            started=True,
            dry_run=True,
            stores=payload.stores,
            reindex=payload.reindex,
            job_id=job_id,
        )

    log.info("update job=%s running incremental ingest", job_id)
    try:
        detail = await _run_pipeline_in_thread(repo_root, log)
    except Exception as exc:  # noqa: BLE001
        log.exception("update job=%s failed", job_id)
        return UpdateResponse(
            started=False,
            dry_run=False,
            stores=payload.stores,
            reindex=payload.reindex,
            job_id=job_id,
            detail={"error": type(exc).__name__, "message": str(exc)},
        )

    log.info(
        "update job=%s done — %s",
        job_id,
        {k: detail[k] for k in ("diff", "db", "embed") if k in detail},
    )
    return UpdateResponse(
        started=True,
        dry_run=False,
        stores=payload.stores,
        reindex=payload.reindex,
        job_id=job_id,
        detail=detail,
    )