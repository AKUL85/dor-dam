"""Runtime settings for the DorDam structured phone database.

Centralises every knob that the importer / ORM / Alembic pipelines need,
so that ``import db`` is enough — there is no per-submodule config dance.
"""
from __future__ import annotations

import os
import urllib.parse
from dataclasses import dataclass


# ──────────────────────────────────────────────────────────────────────
# Defaults
# ──────────────────────────────────────────────────────────────────────

DEFAULT_DB_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/dordam"
DEFAULT_INPUT = "processed/merged_phones.json"
DEFAULT_BATCH_SIZE = 200


# ──────────────────────────────────────────────────────────────────────
# Settings
# ──────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Settings:
    """Resolved runtime configuration.

    Properties:
        db_url:        SQLAlchemy URL. ``DORDAM_DB_URL`` env var wins.
        input_path:    Default JSON path; overridable per-call.
        batch_size:    ``commit()`` cadence inside the importer.
        echo_sql:      Set ``DORDAM_SQL_ECHO=1`` to log SQL statements.
    """

    db_url: str
    input_path: str
    batch_size: int
    echo_sql: bool

    @classmethod
    def load(cls) -> "Settings":
        return cls(
            db_url=_resolve_db_url(),
            input_path=os.environ.get("DORDAM_INPUT", DEFAULT_INPUT),
            batch_size=int(os.environ.get("DORDAM_BATCH_SIZE", DEFAULT_BATCH_SIZE)),
            echo_sql=bool(int(os.environ.get("DORDAM_SQL_ECHO", "0"))),
        )


def load_settings() -> "Settings":
    """Module-level shorthand for ``Settings.load()``."""
    return Settings.load()


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _resolve_db_url() -> str:
    """Read DB URL from env, applying one small ergonomic tweak.

    * If ``DORDAM_DB_URL`` is set, use it as-is.
    * If the user passed a plain ``postgres://`` / ``postgresql://`` URL,
      we promote it to ``postgresql+psycopg://`` so SQLAlchemy 2.0 picks
      up the psycopg v3 driver.
    * Otherwise fall back to :data:`DEFAULT_DB_URL`.
    """
    raw = os.environ.get("DORDAM_DB_URL", DEFAULT_DB_URL).strip()
    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme in {"postgres", "postgresql"} and not parsed.scheme.startswith(
        "postgresql+"
    ):
        raw = raw.replace(f"{parsed.scheme}://", "postgresql+psycopg://", 1)
    return raw
