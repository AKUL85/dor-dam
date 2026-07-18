"""CLI entry point — ``python -m db``.

Examples
--------

* Bootstrap once (creates tables, then loads the JSON):

    export DORDAM_DB_URL="postgresql+psycopg://user:pass@localhost:5432/dordam"
    python -m db --init
    python -m db --input processed/merged_phones.json

* Incremental re-run (no-op when hashes match):

    python -m db --input processed/merged_phones.json

* Force re-load from scratch (drops rows first):

    python -m db --input processed/merged_phones.json --truncate

* Smoke test against SQLite (no Postgres required):

    export DORDAM_DB_URL="sqlite:///./processed/dordam.db"
    python -m db --init
    python -m db --input processed/merged_phones.json
"""
from __future__ import annotations

import argparse
import json
import logging
import sys

from .config import load_settings
from .importer import PhoneImporter
from .session import init_schema, session_scope


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m db",
        description="DorDam structured phone DB loader.",
    )
    parser.add_argument(
        "--input",
        help="Path to merged_phones.json (defaults to settings.input_path)",
    )
    parser.add_argument(
        "--init",
        action="store_true",
        help="Create schema in the target DB before loading.",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Wipe phones + phone_stores tables before loading.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="Commit every N rows (defaults to settings.batch_size).",
    )
    parser.add_argument(
        "--on-error",
        choices=("raise", "skip"),
        default="raise",
        help="Behaviour when a single row is malformed.",
    )
    parser.add_argument(
        "--report-json",
        help="Write the import report to this path as JSON.",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable DEBUG logging.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    settings = load_settings()
    input_path = args.input or settings.input_path

    if args.init:
        logging.info("Creating schema at %s", settings.db_url)
        init_schema()

    with session_scope(settings) as session:
        importer = PhoneImporter(
            session,
            batch_size=args.batch_size or settings.batch_size,
            on_error=args.on_error,
        )
        report = importer.run(input_path, truncate=args.truncate)

    print(json.dumps(report.to_dict(), indent=2, default=str))

    if args.report_json:
        with open(args.report_json, "w", encoding="utf-8") as fh:
            json.dump(report.to_dict(), fh, indent=2, default=str)
        print(f"Report written to {args.report_json}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
