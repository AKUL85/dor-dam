"""Specification lookup engine — SQL-only phone spec retrieval.

Answers questions like
- Does Pixel 9a support wireless charging?
- How much RAM does Galaxy A56 have?
- What processor does Nothing Phone (3a) use?

Vector search is intentionally NOT used; every fact comes from the
``phones`` table (parsed scalars or free-text spec columns).
"""
from specs.engine import (
    SpecQuery,
    SpecResult,
    SpecField,
    SPEC_FIELDS,
    lookup,
    spec_for,
    render_markdown,
)

__all__ = [
    "SpecQuery",
    "SpecResult",
    "SpecField",
    "SPEC_FIELDS",
    "lookup",
    "spec_for",
    "render_markdown",
]  # pragma: no cover