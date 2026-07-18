"""FastAPI dependency-injection providers.

Each provider is a generator that yields the resource, then cleans up
on exit. Endpoints declare them as parameters and FastAPI wires them
up — no global state in the routes.

Usage in a route:

    @router.post("/recommend")
    async def recommend(
        payload: RecommendRequest,
        session: AsyncIterator[Session] = Depends(get_session),
        logger: BoundLogger = Depends(get_request_logger),
    ):
        ...

The :class:`BoundLogger` carries the request id and any structured
context (route, user) so every log line is correlated.
"""

from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Iterator, Optional

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from db.config import Settings, load_settings
from db.session import SessionLocal
from search import SearchEngine


# --------------------------------------------------------------------------- #
# Settings (process-singleton)
# --------------------------------------------------------------------------- #

_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Cache :func:`db.config.load_settings` for the process."""
    global _settings
    if _settings is None:
        _settings = load_settings()
    return _settings


def override_settings(settings: Settings) -> None:
    """Test-only: swap the cached settings instance."""
    global _settings
    _settings = settings


# --------------------------------------------------------------------------- #
# SQLAlchemy sessions (per request)
# --------------------------------------------------------------------------- #

def get_session() -> Iterator[Session]:
    """Yield a fresh ``Session`` and commit/rollback automatically.

    Synchronous SQLAlchemy — the engines do not issue async I/O, and
    wrapping them with ``run_in_threadpool`` would only add overhead.
    FastAPI handles the off-loop hop for us via the dependency.
    """
    factory = SessionLocal()
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# --------------------------------------------------------------------------- #
# Search engine (process-singleton; warmed in lifespan)
# --------------------------------------------------------------------------- #

_search_engine: Optional[SearchEngine] = None


def set_search_engine(engine: Optional[SearchEngine]) -> None:
    """Lifespan hook: install / replace the cached engine."""
    global _search_engine
    _search_engine = engine


def get_search_engine() -> SearchEngine:
    """Return the cached :class:`SearchEngine` (lazily built if missing)."""
    global _search_engine
    if _search_engine is None:
        _search_engine = SearchEngine()
    return _search_engine


# --------------------------------------------------------------------------- #
# Logging — request-scoped BoundLogger
# --------------------------------------------------------------------------- #

class BoundLogger(logging.LoggerAdapter):
    """A logger that always stamps ``request_id``, ``path``, ``method``."""

    def process(self, msg: str, kwargs: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        extra = dict(self.extra or {})
        extra.update(kwargs.get("extra") or {})
        kwargs["extra"] = extra
        return msg, kwargs


def _make_logger(request: Request, request_id: str) -> BoundLogger:
    base = logging.getLogger("api")
    return BoundLogger(base, {
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
    })


def get_request_id(
    x_request_id: Optional[str] = Header(default=None, alias="X-Request-Id"),
) -> str:
    """Reuse a client-provided id, or mint a UUID4."""
    if x_request_id and len(x_request_id) <= 128:
        return x_request_id
    return str(uuid.uuid4())


def get_request_logger(
    request: Request,
    request_id: str = Depends(get_request_id),
) -> BoundLogger:
    """A :class:`BoundLogger` scoped to the current request."""
    return _make_logger(request, request_id)


# --------------------------------------------------------------------------- #
# Async-to-sync bridge helpers (used by endpoints that wrap sync engines)
# --------------------------------------------------------------------------- #

@asynccontextmanager
async def sync_in_threadpool() -> AsyncIterator[None]:
    """No-op async context — placeholder if we later add off-loop work."""
    yield None
