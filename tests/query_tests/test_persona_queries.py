"""
tests/query_tests/test_persona_queries.py
===========================================
Query tests for Category 6: User Persona & Use-Case Domain.
"""

import pytest
from .utils import QueryTestCase, assert_query_specification

PERSONA_TEST_CASES = [
    QueryTestCase(
        query="Best phone for students under 20000 taka",
        category="User Persona & Use-Case",
        expected_intent="recommendation",
        expected_entities={"budget": 20000.0, "priority": "persona"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Student persona algorithm (battery 40% + display 30% + durability 30%)",
    ),
    QueryTestCase(
        query="Best phone for business professionals",
        category="User Persona & Use-Case",
        expected_intent="recommendation",
        expected_entities={"priority": "persona"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Business persona algorithm (performance 35% + battery 35% + software 30%)",
    ),
    QueryTestCase(
        query="Best phone for content creators and vlogging",
        category="User Persona & Use-Case",
        expected_intent="recommendation",
        expected_entities={"priority": "camera"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Content creator algorithm (camera 50% + performance 30% + display 20%)",
    ),
    QueryTestCase(
        query="Best phone for travel and international roaming",
        category="User Persona & Use-Case",
        expected_intent="recommendation",
        expected_entities={"priority": "connectivity"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Travel algorithm (battery 40% + durability 30% + camera 30%)",
    ),
]


@pytest.mark.parametrize("tc", PERSONA_TEST_CASES, ids=lambda tc: tc.query)
def test_persona_query_specification(tc: QueryTestCase):
    assert_query_specification(tc)
