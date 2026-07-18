"""CLI: `python -m pricing "Galaxy S25 Ultra" [--in-stock] [--on-sale]`.

Prints markdown pricing block.
"""
from __future__ import annotations

import argparse
import sys

from pricing.engine import price_check, render_markdown


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="dordam-pricing",
        description="Pricing lookup engine — SQL-only.",
    )
    parser.add_argument("name", help="Phone name or slug")
    parser.add_argument("--in-stock", action="store_true", help="Only show in-stock listings")
    parser.add_argument("--on-sale", action="store_true", help="Only show discounted listings")
    args = parser.parse_args(argv)

    try:
        result = price_check(args.name, in_stock_only=args.in_stock, on_sale_only=args.on_sale)
    except LookupError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    print(render_markdown(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())