"""FastAPI surface for the dordam assistant.

Public surface:

- ``api.app``       — the FastAPI app factory (``create_app``).
- ``api.deps``      — FastAPI dependency-injection providers.
- ``api.schemas``   — request/response Pydantic models.
- ``api.services``  — orchestrator (classify → plan → engines → final answer).
- ``api.routers``   — ``chat``, ``recommend``, ``compare``, ``price``,
                      ``search``, ``update`` route modules.

Run locally:

    PYTHONPATH=scripts:. uvicorn api.main:app --reload --port 8000

Or with the bundled runner:

    PYTHONPATH=scripts:. python -m api.runner
"""
from __future__ import annotations

from .main import create_app

__all__ = ["create_app"]