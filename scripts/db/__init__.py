"""db — Structured phone database.

Public re-exports for ergonomic ``from db import …`` use.
"""

from .config import Settings, load_settings
from .importer import ImportReport, PhoneImporter
from .models import Base, Phone, PhoneStore
from .session import SessionLocal, engine, init_schema, session_scope

__all__ = [
    "Base",
    "ImportReport",
    "Phone",
    "PhoneImporter",
    "PhoneStore",
    "SessionLocal",
    "Settings",
    "engine",
    "init_schema",
    "load_settings",
    "session_scope",
]
