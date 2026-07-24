"""Command-line interface for the specification lookup engine.

Examples:
    python -m specs "Pixel 9a" wireless_charging
    python -m specs "Galaxy A56" ram
    python -m specs "Nothing Phone (3a)"
    python -m specs --question "Does Pixel 9a support wireless charging?"
"""
from __future__ import annotations

import argparse
import json
import logging
import sys

from specs.engine import (
    SPEC_FIELDS,
    field_label,
    lookup,
    render_markdown,
    answer_question,
    SpecResult,
)


def _render_summary(result: SpecResult) -> str:
    """Plain-text digest used when only one field is requested."""
    if result.is_empty:
        return "(no specifications)"
    if len(result.fields) == 1:
        f = result.fields[0]
        name = result.name if result.name.lower().startswith(result.brand.lower()) else f"{result.brand} {result.name}"
        return f"{name} — {f.label}: {f.display}"
    return render_markdown(result).rstrip()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Look up phone specifications.")
    parser.add_argument("name", nargs="?", help="Phone model name (e.g. 'Pixel 9a')")
    parser.add_argument(
        "field",
        nargs="?",
        default=None,
        help=(
            "Specific spec field to retrieve. Use one of: "
            + ", ".join(sorted(SPEC_FIELDS))
            + ". Omit for all fields."
        ),
    )
    parser.add_argument(
        "--question",
        help="Free-form question. The engine will pick the field that best matches.",
    )
    parser.add_argument(
        "--json",
        dest="as_json",
        action="store_true",
        help="Emit a structured JSON payload instead of markdown.",
    )
    parser.add_argument(
        "--list-fields",
        action="store_true",
        help="List available spec fields and exit.",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose logging.",
    )

    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.WARNING)

    if args.list_fields:
        print("Available spec fields:")
        for k in SPEC_FIELDS:
            print(f"  {k:<20} {field_label(k)}")
        return 0

    if not args.name and not args.question:
        parser.error("Provide a phone name (and optionally a field), or use --question.")

    try:
        if args.question:
            result = answer_question(args.question)
        else:
            fields = [args.field] if args.field else None
            result = lookup(args.name, fields=fields)
    except LookupError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except Exception as e:
        print(f"error: {e!r}", file=sys.stderr)
        if args.verbose:
            raise
        return 1

    if args.as_json:
        print(json.dumps(
            {
                "phone": {"id": result.phone_id, "brand": result.brand, "name": result.name},
                "fields": [
                    {
                        "key": f.key,
                        "label": f.label,
                        "value": f.value,
                        "display": f.display,
                        "source": f.source,
                    }
                    for f in result.fields
                ],
            },
            ensure_ascii=False,
            indent=2,
            default=str,
        ))
        return 0

    output = _render_summary(result)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
