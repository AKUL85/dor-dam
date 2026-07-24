"""Structured (PostgreSQL-first) recommendation engine.

Pipeline: SQL filter → deterministic ranking by 7 priorities → result list.
Vector search is intentionally NOT used in the happy path; that's a fallback
the caller may attach later (see ``scripts/vector_db.py``).
"""
from recommend.engine import (
    RecommendationQuery,
    RecommendationResult,
    RankingEngine,
    FilterEngine,
    recommend,
    rank_candidates,
    score_camera,
    score_gaming,
    score_battery,
    score_performance,
    score_display,
    score_charging,
    score_value,
    get_cpu_tier_score,
)
from .extractors import extract_numeric_from_text

__all__ = [
    "RecommendationQuery",
    "RecommendationResult",
    "RankingEngine",
    "FilterEngine",
    "recommend",
    "rank_candidates",
    "score_camera",
    "score_gaming",
    "score_battery",
    "score_performance",
    "score_display",
    "score_charging",
    "score_value",
    "get_cpu_tier_score",
    "extract_numeric_from_text",
]
