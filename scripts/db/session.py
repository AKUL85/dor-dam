"""Engine / Session helpers for the DorDam phone DB.

These are tiny wrappers around SQLAlchemy 2.0 so that:

* ``engine()`` is a singleton per process (cheap for Fastify/Python).
* ``SessionLocal()`` yields ``Session`` objects that already request
  ``expire_on_commit=False`` — friendly for background importers.
* ``init_schema()`` is a *non-Alembic* convenience that creates every
  table (handy in tests); production migrations should always go
  through Alembic.
"""
from __future__ import annotations

from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from contextlib import contextmanager

from .config import Settings, load_settings


# ──────────────────────────────────────────────────────────────────────
# Engine singleton
# ──────────────────────────────────────────────────────────────────────

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def engine(settings: Settings | None = None) -> Engine:
    """Return the process-wide SQLAlchemy engine."""
    global _engine, _SessionLocal
    if _engine is None:
        cfg = settings or load_settings()
        _engine = create_engine(
            cfg.db_url,
            echo=cfg.echo_sql,
            future=True,
            pool_pre_ping=True,
        )
        _SessionLocal = sessionmaker(
            bind=_engine,
            autoflush=False,
            autocommit=False,
            future=True,
            expire_on_commit=False,
        )
    return _engine


def SessionLocal(settings: Settings | None = None) -> sessionmaker[Session]:
    """Return the sessionmaker that produces fresh ``Session`` objects."""
    engine(settings)  # ensure the engine + factory exist.
    assert _SessionLocal is not None
    return _SessionLocal


@contextmanager
def session_scope(settings: Settings | None = None) -> Iterator[Session]:
    """Context-manager helper: yields a session, commits on success."""
    factory = SessionLocal(settings)
    s = factory()
    try:
        yield s
        s.commit()
    except Exception:
        s.rollback()
        raise
    finally:
        s.close()


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def reset_engine_cache() -> None:
    """Drop the cached engine — used by the importer test harness."""
    global _engine, _SessionLocal
    _engine = None
    _SessionLocal = None


def init_schema() -> None:
    """Create every table declared on ``Base.metadata``.

    Used by tests and by ``python -m db --init`` — production bootstrap
    goes through Alembic (``alembic upgrade head``).
    """
    from .models import Base  # local import: avoid cycle on package init.

    Base.metadata.create_all(engine())
