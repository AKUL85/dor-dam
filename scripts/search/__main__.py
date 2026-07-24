"""CLI for the semantic search engine.

Examples:
    PYTHONPATH=scripts python -m search "Is this phone worth buying?"
    PYTHONPATH=scripts python -m search --top-k 5 --rerank-candidates 50 \
        --where brand=Samsung --json "best phone for photography"
    PYTHONPATH=scripts python -m search "does it overheat?"
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from pathlib import Path

from search import SearchEngine, render_markdown


def _parse_where(pairs: list[str] | None) -> dict | None:
    """Translate ``--where key=value`` repeated flags into a Chroma
    filter dict.

    Chroma's top-level ``where`` only accepts one operator, so we wrap
    multiple conditions in ``$and``. Equality only — for range filters
    use ``--where-key`` / ``--where-op`` pairs directly.

    Syntax accepted:
        --where brand=Samsung
        --where price_max=30000

    For operator-style filters (>= / <= / > / < / !=), pass
    ``--where-expr key>=value`` (e.g. ``--where-expr price_max<=50000``).
    Multiple expressions are AND-combined; equality and expressions can
    be mixed freely.
    """
    if not pairs:
        return None
    clauses: list[dict] = []
    for pair in pairs:
        if "=" not in pair:
            raise SystemExit(f"--where expects key=value, got {pair!r}")
        k, v = pair.split("=", 1)
        k = k.strip()
        v = v.strip()
        coerced: int | float | str
        try:
            coerced = int(v)
        except ValueError:
            try:
                coerced = float(v)
            except ValueError:
                coerced = v
        clauses.append({k: coerced})
    return _finalise_where(clauses)


def _parse_where_expr(pairs: list[str] | None) -> dict | None:
    if not pairs:
        return None
    clauses: list[dict] = []
    for pair in pairs:
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*(<=|>=|<|>|!=|=)\s*(.+)$", pair)
        if not m:
            raise SystemExit(
                f"--where-expr expects key<op>value (e.g. price_max<=50000), got {pair!r}"
            )
        key, op, raw = m.group(1), m.group(2), m.group(3).strip()
        try:
            value: int | float | str = int(raw)
        except ValueError:
            try:
                value = float(raw)
            except ValueError:
                value = raw
        if op == "=":
            clauses.append({key: value})
        else:
            chroma_op = {
                "<=": "$lte",
                ">=": "$gte",
                "<":  "$lt",
                ">":  "$gt",
                "!=": "$ne",
            }[op]
            clauses.append({key: {chroma_op: value}})
    return _finalise_where(clauses)


def _finalise_where(clauses: list[dict]) -> dict | None:
    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Semantic search over phone documents.")
    parser.add_argument("query", help="Natural-language question")
    parser.add_argument("--top-k", type=int, default=5,
                        help="Final number of contexts to return (default 5).")
    parser.add_argument("--rerank-candidates", type=int, default=25,
                        help="Candidate fan-out from Chroma before rerank.")
    parser.add_argument("--alpha", type=float, default=0.5,
                        help="Blend weight on BM25 rerank (0=cosine, 1=BM25).")
    parser.add_argument("--where", action="append", default=[],
                        help="Equality metadata filter, repeatable: brand=Samsung price_max=30000")
    parser.add_argument("--where-expr", action="append", default=[],
                        help="Operator metadata filter, repeatable: price_max<=50000 price_min>=15000")
    parser.add_argument("--where-document", action="append", default=[],
                        help="Document-text filter (Chroma where_document syntax).")
    parser.add_argument("--persist-dir", default="processed/chroma")
    parser.add_argument("--collection", default="phone_documents")
    parser.add_argument("--cache-dir", default="processed/search_cache")
    parser.add_argument("--dim", type=int, default=384)
    parser.add_argument("--json", dest="as_json", action="store_true",
                        help="Emit structured JSON instead of markdown.")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.WARNING)

    eq_clauses = _parse_where(args.where)
    expr_clauses = _parse_where_expr(args.where_expr)
    clauses: list[dict] = []
    if eq_clauses:
        clauses.append(eq_clauses)
    if expr_clauses:
        clauses.append(expr_clauses)
    where = _finalise_where(clauses)

    engine = SearchEngine(
        persist_dir=Path(args.persist_dir),
        collection=args.collection,
        dim=args.dim,
        cache_dir=Path(args.cache_dir),
        candidate_k=args.rerank_candidates,
    )
    if engine.corpus_size == 0:
        print("error: collection is empty. Run `python -m search.indexer` first.",
              file=sys.stderr)
        return 2

    result = engine.search(
        args.query,
        top_k=args.top_k,
        candidate_k=args.rerank_candidates,
        where=where,
        blend_alpha=args.alpha,
    )

    if args.as_json:
        print(json.dumps(
            {
                "query": result.query,
                "top_k": result.top_k,
                "candidates": result.candidates,
                "hits": [
                    {
                        "rank": h.rank,
                        "id": h.id,
                        "name": h.name,
                        "brand": h.brand,
                        "category": h.category,
                        "snippet": h.snippet,
                        "score": h.score,
                        "cosine_score": h.cosine_score,
                        "bm25_score": h.bm25_score,
                        "metadata": h.metadata,
                    }
                    for h in result.hits
                ],
            },
            ensure_ascii=False,
            indent=2,
        ))
        return 0

    print(render_markdown(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
