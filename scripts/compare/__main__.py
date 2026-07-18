"""CLI: `python -m compare "Galaxy S25 Ultra" vs "iPhone 16 Pro"`.

Prints a markdown comparison block.
"""
from __future__ import annotations

import argparse
import sys

from compare.engine import compare, render_markdown


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="dordam-compare",
        description="Head-to-head phone comparison engine.",
    )
    parser.add_argument("names", nargs="+", help="Two or more phone names, e.g. 'Galaxy S25 Ultra' 'iPhone 16 Pro'")
    parser.add_argument(
        "--dimensions", nargs="+", default=None,
        help="Subset of dimensions to score (default: all 9)",
    )
    args = parser.parse_args(argv)

    if len(args.names) < 2:
        print("need at least two phone names", file=sys.stderr)
        return 2

    try:
        result = compare(args.names, dimensions=args.dimensions)
    except (LookupError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    print(render_markdown(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())