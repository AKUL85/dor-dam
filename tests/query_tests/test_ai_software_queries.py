"""
tests/query_tests/test_ai_software_queries.py
================================================
Query tests for Category 9: AI & Software Intelligence Domain.
"""

import pytest
from .utils import QueryTestCase, assert_query_specification

AI_SOFTWARE_TEST_CASES = [
    QueryTestCase(
        query="Best phone with Galaxy AI features",
        category="AI & Software Intelligence",
        expected_intent="recommendation",
        expected_entities={"priority": "ai"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Rank candidates with AI features bonus in ai_features scorer",
    ),
    QueryTestCase(
        query="Best phone with 7 years software update support",
        category="AI & Software Intelligence",
        expected_intent="recommendation",
        expected_entities={"spec_fields": ["os"]},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Software scorer evaluation for long-term OS support",
    ),
    QueryTestCase(
        query="Phones with stock Android and no bloatware",
        category="AI & Software Intelligence",
        expected_intent="mixed",
        expected_entities={"spec_fields": ["os"]},
        expected_retrieval_engine="Specification",
        expected_response_type="SearchResponse",
        expected_ranking_logic="Software score evaluation for clean OS (Pixel UI, Nothing OS, Motorola)",
    ),
]


@pytest.mark.parametrize("tc", AI_SOFTWARE_TEST_CASES, ids=lambda tc: tc.query)
def test_ai_software_query_specification(tc: QueryTestCase):
    assert_query_specification(tc)
