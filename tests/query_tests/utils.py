"""
tests/query_tests/utils.py
==========================
Shared dataclass and helper validator for automated query tests.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Ensure path imports
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
API_DIR = ROOT_DIR / "api"
for d in [str(SCRIPTS_DIR), str(ROOT_DIR), str(API_DIR)]:
    if d not in sys.path:
        sys.path.insert(0, d)

from api.services import plan
from intent_classifier import IntentType, get_default_classifier


@dataclass
class QueryTestCase:
    """Test specification for a single query."""
    query: str
    category: str
    expected_intent: str
    expected_entities: dict[str, Any]
    expected_retrieval_engine: str
    expected_response_type: str
    expected_ranking_logic: str


def assert_query_specification(tc: QueryTestCase) -> None:
    """Validate query against Intent Classifier and Router Extension."""
    classifier = get_default_classifier()
    info = classifier.classify(tc.query)

    # 1. Assert Intent
    assert info.intent == tc.expected_intent, (
        f"Query: '{tc.query}' -> Expected intent '{tc.expected_intent}', got '{info.intent}'"
    )

    # 2. Assert Entities (Brand, Budget, Priority, etc.)
    for key, expected_val in tc.expected_entities.items():
        actual_val = getattr(info, key, None)
        if actual_val is None and hasattr(info, "entities") and info.entities is not None:
            actual_val = getattr(info.entities, key, None)

        if expected_val is not None:
            if isinstance(expected_val, list):
                actual_list = [str(x).lower() for x in (actual_val or [])]
                for item in expected_val:
                    assert str(item).lower() in actual_list, (
                        f"Query: '{tc.query}' -> Entity '{key}' missing item '{item}' in {actual_val}"
                    )
            elif isinstance(expected_val, str):
                assert str(actual_val).lower() == str(expected_val).lower(), (
                    f"Query: '{tc.query}' -> Entity '{key}' expected '{expected_val}', got '{actual_val}'"
                )
            elif isinstance(expected_val, (int, float)):
                assert actual_val is not None and abs(float(actual_val) - float(expected_val)) < 1.0, (
                    f"Query: '{tc.query}' -> Entity '{key}' expected {expected_val}, got {actual_val}"
                )

    # 3. Assert Retrieval Engine & Route
    intent_enum = IntentType(info.intent) if not isinstance(info.intent, IntentType) else info.intent
    p = plan(tc.query, intent_enum)
    routed_engine_names = [e.name for e in p.engines]
    assert len(routed_engine_names) > 0, f"Query: '{tc.query}' routed to empty engines!"
    
    # Engine name mapping check
    target = tc.expected_retrieval_engine.lower()
    match = any(
        target in name or name in target or
        (target == "recommendation" and name in ("recommend", "buying_guide")) or
        (target == "comparison" and name in ("compare", "specs")) or
        (target == "price" and name in ("pricing", "deals")) or
        (target == "specification" and name in ("specs", "search")) or
        (target == "future phones" and name in ("future_phones", "buying_guide"))
        for name in routed_engine_names
    )
    assert match, (
        f"Query: '{tc.query}' -> Expected engine '{tc.expected_retrieval_engine}' in {routed_engine_names}"
    )

    # 4. Assert Expected Response Type & Ranking Logic metadata fields
    assert isinstance(tc.expected_response_type, str) and len(tc.expected_response_type) > 0
    assert isinstance(tc.expected_ranking_logic, str) and len(tc.expected_ranking_logic) > 0
