"""CLI: `python -m recommend "<natural-language query>"`.

Calls ``IntentClassifier.classify`` → ``engine.recommend`` and prints a
JSON-serialised list of :class:`RecommendationResult`.
"""
from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from recommend.engine import recommend
from intent_classifier import IntentClassifier


def _render(results) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in results:
        out.append(
            {
                "rank": r.rank,
                "phone_id": r.phone_id,
                "brand": r.brand,
                "name": r.name,
                "category": r.category,
                "price_min": r.price_min,
                "price_max": r.price_max,
                "score": round(r.score, 4),
                "score_breakdown": {k: round(v, 4) for k, v in r.score_breakdown.items()},
                "reason": r.reason,
            }
        )
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="dordam-recommend",
        description="Structured (PostgreSQL-first) phone recommendation engine.",
    )
    parser.add_argument("query", help="Natural-language query, e.g. 'best gaming phone under 30000'")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    info = IntentClassifier().classify(args.query)
    if args.verbose:
        print(
            f"[intent] {info.intent} conf={info.confidence:.2f} "
            f"budget={info.budget}/{info.budget_min} brand={info.brand} "
            f"priority={info.priority} specs={info.spec_fields}",
            file=sys.stderr,
        )

    from recommend.engine import RecommendationQuery
    query = RecommendationQuery.from_extracted(info, limit=args.limit)
    results = recommend(query)
    print(json.dumps(_render(results), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())