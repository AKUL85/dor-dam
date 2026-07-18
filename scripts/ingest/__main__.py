"""
__main__.py
===========

CLI for the incremental ingest pipeline.

Usage
-----

.. code-block:: bash

    # Defaults: scrape-dir=backend/output, manifest=processed/ingest_manifest.json
    python -m ingest

    # Override paths
    python -m ingest --scrape-dir backend/output --manifest processed/ingest_manifest.json

    # Skip the (slow) embed stage and only push to Postgres
    python -m ingest --skip-embed

    # Run without touching the DB at all (just compute the diff + manifest)
    python -m ingest --skip-db --skip-embed

Exit code
---------
* ``0`` — clean run (including the case where zero phones changed)
* ``1`` — an exception escaped one of the stages (the message is logged)
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from .pipeline import IngestConfig, run_ingest


def _setup_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s :: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m ingest",
        description="Incremental ingest: read scraper output, "
                    "diff against the manifest, push only changes "
                    "to Postgres + Chroma.",
    )
    parser.add_argument(
        "--scrape-dir",
        type=Path,
        default=Path("backend/output"),
        help="Directory holding the latest scraper JSON files "
             "(default: backend/output).",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("processed/ingest_manifest.json"),
        help="Persistent manifest file (default: processed/ingest_manifest.json).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=200,
        help="Commit cadence for the DB importer (default 200).",
    )
    parser.add_argument(
        "--skip-db",
        action="store_true",
        help="Skip the Postgres apply stage (compute diff only).",
    )
    parser.add_argument(
        "--skip-embed",
        action="store_true",
        help="Skip the Chroma re-embed stage.",
    )
    parser.add_argument(
        "--report-json",
        type=Path,
        default=None,
        help="If supplied, write the JSON report to this path.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    _setup_logging(args.log_level)

    cfg = IngestConfig(
        scrape_dir=args.scrape_dir,
        manifest_path=args.manifest,
        batch_size=args.batch_size,
        db_enabled=not args.skip_db,
        embed_enabled=not args.skip_embed,
    )

    try:
        report = run_ingest(cfg)
    except Exception as exc:
        logging.getLogger("ingest").exception("Ingest run failed")
        print(json.dumps({"error": repr(exc)}), file=sys.stderr)
        return 1

    payload = report.to_dict()
    if args.report_json:
        args.report_json.parent.mkdir(parents=True, exist_ok=True)
        args.report_json.write_text(json.dumps(payload, indent=2))
    # Always emit a one-line summary so the operator sees what happened
    # even when stdout is the only channel.
    print(json.dumps(payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
