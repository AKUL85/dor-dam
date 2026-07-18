"""Head-to-head phone comparison engine.

Pipeline:
1. Resolve model slugs/names to ``Phone`` rows via SQL lookup.
2. Pair-wise rank across 9 dimensions: display, processor, camera, battery,
   charging, software, gaming, photography, value.
3. Emit a markdown table plus a final recommendation.

Vector search is intentionally NOT used here either — this engine only
reads from the relational DB.
"""
from compare.engine import (
    ComparisonQuery,
    ComparisonResult,
    compare,
    compare_phones,
    render_markdown,
)

__all__ = [
    "ComparisonQuery",
    "ComparisonResult",
    "compare",
    "compare_phones",
    "render_markdown",
]  # pragma: no cover