# Structured Phone Database

Postgres-backed relational store for the DorDam catalogue, paired with a
YAML / JSON-LD-style importer that loads `processed/merged_phones.json`.

## Submodules

| Module                | Purpose                                                   |
|-----------------------|-----------------------------------------------------------|
| `config`              | `load_settings()` → `Settings` dataclass (env-driven).    |
| `session`             | `engine()`, `SessionLocal()`, `init_schema()`.             |
| `models`              | SQLAlchemy 2.0 declarative `Base` + `Phone` + `PhoneStore`.|
| `importer`            | `PhoneImporter` — load JSON, hash, upsert, replace stores. |

## Quickstart (Postgres)

```bash
export DORDAM_DB_URL="postgresql+psycopg://user:pass@localhost:5432/dordam"
pip install -r requirements.txt
alembic upgrade head                # create the tables + indexes
python -m db --input processed/merged_phones.json
python -m db --input processed/merged_phones.json   # second run = no-op
```

## Quickstart (SQLite — for local checks)

```bash
export DORDAM_DB_URL="sqlite:///./processed/dordam.db"
alembic upgrade head
python -m db --input processed/merged_phones.json
```
