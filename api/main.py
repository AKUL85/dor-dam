"""FastAPI application factory.

Usage:

    from api import create_app
    app = create_app()

Or via uvicorn:

    uvicorn api.main:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .deps import (
    get_request_id,
    get_search_engine,
    override_settings,
    set_search_engine,
)
from .logging_conf import configure_logging
from .routers import (
    chat_router,
    compare_router,
    price_router,
    recommend_router,
    search_router,
    update_router,
)
from .schemas import ErrorResponse, HealthResponse

logger = logging.getLogger("api.main")


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Warm shared resources on startup, release on shutdown."""
    configure_logging(level="INFO")
    settings_loaded = __import__("db.config", fromlist=["load_settings"]).load_settings()
    override_settings(settings_loaded)
    settings = settings_loaded
    logger.info("starting api; db=%s", settings.db_url)

    # Build the search engine eagerly so /search doesn't pay the
    # cold-start cost on the first request.
    engine = get_search_engine()
    logger.info("search engine warm; corpus_size=%d", engine.corpus_size)

    try:
        yield
    finally:
        logger.info("shutting down api")
        set_search_engine(None)


def create_app() -> FastAPI:
    app = FastAPI(
        title="dordam API",
        version="0.1.0",
        description=(
            "Phone-buying assistant API for the Bangladeshi market. "
            "Endpoints: /chat, /recommend, /compare, /price, /search, /update."
        ),
        lifespan=_lifespan,
    )

    # Permissive CORS for the local frontend; tighten in production.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(chat_router)
    app.include_router(recommend_router)
    app.include_router(compare_router)
    app.include_router(price_router)
    app.include_router(search_router)
    app.include_router(update_router)

    # ── Health & metadata ──────────────────────────────────────────────
    @app.get("/healthz", response_model=HealthResponse, tags=["meta"])
    async def healthz() -> HealthResponse:
        engine = get_search_engine()
        return HealthResponse(
            status="ok",
            db="sqlite" if engine.corpus_size >= 0 else "unknown",
            search_corpus=engine.corpus_size,
        )

    # ── Error handlers ─────────────────────────────────────────────────
    @app.exception_handler(RequestValidationError)
    async def _on_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        rid = get_request_id.__wrapped__() if hasattr(get_request_id, "__wrapped__") else None
        logger.warning("validation failed: %s", exc.errors())
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ErrorResponse(
                error="validation_error",
                detail=str(exc.errors()),
                request_id=rid,
            ).model_dump(exclude_none=True),
        )

    @app.exception_handler(HTTPException)
    async def _on_http(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=_http_error_code(exc.status_code),
                detail=str(exc.detail),
                request_id=request.headers.get("X-Request-Id"),
            ).model_dump(exclude_none=True),
        )

    @app.exception_handler(Exception)
    async def _on_unhandled(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                error="internal_error",
                detail=type(exc).__name__,
                request_id=request.headers.get("X-Request-Id"),
            ).model_dump(exclude_none=True),
        )

    return app


def _http_error_code(status_code: int) -> str:
    return {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "validation_error",
        429: "rate_limited",
    }.get(status_code, "http_error")


# Module-level app instance for ``uvicorn api.main:app``.
app = create_app()