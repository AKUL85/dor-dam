"""Smoke tests for the ``ingest`` incremental pipeline.

Run with ``scripts/`` on PYTHONPATH so the flat ``from db import …``
imports work:

    cd /home/akul/AllPractice/dordam
    PYTHONPATH=scripts python -m pytest scripts/ingest/tests/ -q

Three scenarios are covered:

1. **Manifest diff only** — verify ``IngestManifest.diff_against`` produces
   the right ``added``/``updated``/``removed``/``unchanged`` sets.
2. **End-to-end ``run_ingest`` with DB + embed disabled** — drive the
   orchestrator against a tmpdir of fake scraper JSON, assert idempotency
   (2nd run is a no-op) and that a real change is picked up on the 3rd run.
3. **DB apply via SQLite in-memory** — bind an in-process engine, run the
   real ``PhoneImporter`` through ``apply_records`` twice, and assert the
   second pass is detected as ``unchanged``.

Each scenario uses ``tmp_path`` for hermetic isolation.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pytest

# Make sure flat ``from db import …`` works when this file is executed
# directly with ``python scripts/ingest/tests/test_smoke.py``.
_HERE = Path(__file__).resolve()
_SCRIPTS = _HERE.parents[2]  # scripts/ingest/tests -> scripts
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))


# ──────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────

def _make_product(url: str, *, name: str, price: int, brand: str = "Acme") -> dict:
    """Build a single scraper-style product entry."""
    return {
        "productUrl": url,
        "url": url,
        "name": name,
        "brand": brand,
        "store": "TestStore",
        "price": price,
        "originalPrice": price,
        "inStock": True,
        "keySpecs": {
            "ram": "8GB RAM",
            "battery": "5000 mAh",
            "display": '6.5"',
        },
        "specs": {"Network": "5G"},
        "merged_specs": {
            "ram": "8GB",
            "battery": "5000 mAh",
            "display": '6.5"',
            "network": "5G",
        },
    }


def _write_scrape_file(directory: Path, name: str, products: list[dict]) -> Path:
    """Drop a single scraper JSON file shaped like the real ones."""
    path = directory / name
    path.write_text(
        json.dumps({"store": "TestStore", "products": products}, ensure_ascii=False),
        encoding="utf-8",
    )
    return path


# ──────────────────────────────────────────────────────────────────────
# 1. Manifest diff
# ──────────────────────────────────────────────────────────────────────

def test_manifest_diff_classifies_urls(tmp_path: Path) -> None:
    """``diff_against`` should split URLs into add/update/remove/unchanged."""
    from ingest.manifest import (
        IngestManifest,
        content_hash_stable,
        doc_hash,
    )

    manifest = IngestManifest(tmp_path / "manifest.json")

    # Seed manifest with two known URLs. We seed a "Phone D" as a phantom
    # so the diff can prove a removal happened.
    seed = [
        ("https://x/a", "Phone A", 100),
        ("https://x/b", "Phone B", 200),
        ("https://x/d", "Phone D", 400),  # will disappear from the batch
    ]
    for url, name, price in seed:
        rec = _make_product(url, name=name, price=price)
        manifest.update(
            url,
            content_hash=content_hash_stable(rec),
            doc_hash=doc_hash(f"{name} prose"),
            name=name,
            brand=rec.get("brand", ""),
        )
    manifest.save()

    # Batch: A unchanged, B content_changed (different price), C new.
    # D is gone. Each content_hash uses the same _make_product call so
    # the record keys under the hood are byte-identical to the seed.
    def _entry(url: str, name: str, price: int, prose: str) -> tuple:
        rec = _make_product(url, name=name, price=price)
        return (content_hash_stable(rec), doc_hash(prose), name, "Acme")

    batch = {
        "https://x/a": _entry("https://x/a", "Phone A", 100, "Phone A prose"),
        "https://x/b": _entry("https://x/b", "Phone B", 999, "Phone B NEW prose"),
        "https://x/c": _entry("https://x/c", "Phone C", 300, "Phone C prose"),
    }

    diff = manifest.diff_against(batch)

    assert diff.added == {"https://x/c"}
    assert diff.updated == {"https://x/b"}
    assert diff.unchanged == {"https://x/a"}
    assert diff.removed == {"https://x/d"}
    assert diff.changed == diff.added | diff.updated


# ──────────────────────────────────────────────────────────────────────
# 2. End-to-end run_ingest (DB + embed disabled)
# ──────────────────────────────────────────────────────────────────────

def _seed_two_files(tmp_path: Path, *, price_b: int = 200) -> tuple[Path, Path, Path]:
    """Create a fake scrape-dir with two phones, return (dir, manifest, phone_a_url)."""
    scrape_dir = tmp_path / "scrapes"
    scrape_dir.mkdir()
    manifest_path = tmp_path / "ingest_manifest.json"

    _write_scrape_file(
        scrape_dir,
        "test-2026-07-18T00-00-00-000Z.json",
        [
            _make_product("https://x/a", name="Phone A", price=100),
            _make_product("https://x/b", name="Phone B", price=price_b),
        ],
    )
    return scrape_dir, manifest_path, "https://x/a"


def test_run_ingest_is_idempotent(tmp_path: Path) -> None:
    """Running on identical input twice should mark everything unchanged."""
    from ingest import IngestConfig, run_ingest

    scrape_dir, manifest_path, _ = _seed_two_files(tmp_path)

    cfg = IngestConfig(
        scrape_dir=scrape_dir,
        manifest_path=manifest_path,
        db_enabled=False,
        embed_enabled=False,
    )

    first = run_ingest(cfg)
    assert first.added == 2
    assert first.updated == 0
    assert first.unchanged == 0

    second = run_ingest(cfg)
    # Manifest now has both URLs → 2nd run is a no-op diff.
    assert second.added == 0
    assert second.updated == 0
    assert second.unchanged == 2
    assert second.files_loaded == 1


def test_run_ingest_picks_up_change(tmp_path: Path) -> None:
    """A price change in the second batch should show up as ``updated=1``."""
    from ingest import IngestConfig, run_ingest

    scrape_dir, manifest_path, _ = _seed_two_files(tmp_path, price_b=200)

    cfg = IngestConfig(
        scrape_dir=scrape_dir,
        manifest_path=manifest_path,
        db_enabled=False,
        embed_enabled=False,
    )
    run_ingest(cfg)  # warm the manifest

    # Rewrite the file with Phone B's price changed.
    for f in scrape_dir.iterdir():
        f.unlink()
    _write_scrape_file(
        scrape_dir,
        "test-2026-07-18T01-00-00-000Z.json",
        [
            _make_product("https://x/a", name="Phone A", price=100),
            _make_product("https://x/b", name="Phone B", price=250),  # changed
        ],
    )

    second = run_ingest(cfg)
    assert second.added == 0
    assert second.updated == 1
    assert second.unchanged == 1


def test_run_ingest_removes_dropped_phone(tmp_path: Path) -> None:
    """Dropping a URL between runs should land in ``removed``."""
    from ingest import IngestConfig, run_ingest

    scrape_dir, manifest_path, _ = _seed_two_files(tmp_path)
    cfg = IngestConfig(
        scrape_dir=scrape_dir,
        manifest_path=manifest_path,
        db_enabled=False,
        embed_enabled=False,
    )
    run_ingest(cfg)

    # Rewrite with only Phone A.
    for f in scrape_dir.iterdir():
        f.unlink()
    _write_scrape_file(
        scrape_dir,
        "test-2026-07-18T02-00-00-000Z.json",
        [_make_product("https://x/a", name="Phone A", price=100)],
    )

    second = run_ingest(cfg)
    assert second.removed == 1
    assert second.unchanged == 1


# ──────────────────────────────────────────────────────────────────────
# 3. DB apply via SQLite in-memory
# ──────────────────────────────────────────────────────────────────────

def test_db_apply_skip_unchanged_on_repeat(tmp_path: Path) -> None:
    """A second apply with identical records should report unchanged > 0.

    We bind a private SQLite in-memory engine to ``db.session.engine``
    so the existing ``PhoneImporter.run`` path executes against SQLite.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from db.models import Base
    from db.session import reset_engine_cache

    # Force a fresh SQLite-backed engine.
    reset_engine_cache()
    eng = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(eng)
    Factory = sessionmaker(bind=eng, autoflush=False, autocommit=False, expire_on_commit=False)

    records = {
        "https://x/a": _make_product("https://x/a", name="Phone A", price=100),
        "https://x/b": _make_product("https://x/b", name="Phone B", price=200),
    }

    # First apply — both rows are inserts.
    from ingest.db_apply import apply_records
    from ingest.manifest import IngestDiff

    diff_all_new = IngestDiff(added=set(records.keys()))
    with Factory() as s:
        rep1 = apply_records(s, records, diff=diff_all_new, batch_size=10)
    assert rep1.inserted == 2
    assert rep1.errors == []

    # Second apply — same records, all marked "changed" in the diff so
    # the importer actually sees them and its per-row hash-skip kicks in.
    diff_all_updated = IngestDiff(updated=set(records.keys()))
    with Factory() as s:
        rep2 = apply_records(s, records, diff=diff_all_updated, batch_size=10)
    assert rep2.unchanged == 2
    assert rep2.inserted == 0
    assert rep2.updated == 0

    # Third apply — flip one row's price. Both URLs are submitted so
    # the unchanged one is still classified.
    flipped = dict(records)
    flipped["https://x/a"] = _make_product("https://x/a", name="Phone A", price=150)
    diff_flip = IngestDiff(updated={"https://x/a", "https://x/b"})
    with Factory() as s:
        rep3 = apply_records(s, flipped, diff=diff_flip, batch_size=10)
    assert rep3.updated == 1
    assert rep3.unchanged == 1

    # And pruning works.
    with Factory() as s:
        diff_prune = IngestDiff(removed={"https://x/b"})
        rep4 = apply_records(s, flipped, diff=diff_prune, batch_size=10)
    assert rep4.removed == 1

    # Reset again so other tests aren't pinned to this engine.
    reset_engine_cache()


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(pytest.main([__file__, "-v"]))
