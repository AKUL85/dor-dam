"""
tests/query_tests/test_gaming_queries.py
==========================================
Query tests for Category 3: Gaming & Performance Domain.
"""

import pytest
from .utils import QueryTestCase, assert_query_specification

GAMING_TEST_CASES = [
    QueryTestCase(
        query="Best gaming phone under 30000 taka",
        category="Gaming & Performance",
        expected_intent="recommendation",
        expected_entities={"budget": 30000.0, "priority": "gaming"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Rank by gaming scorer (CPU tier 50% + RAM 30% + Hz 20%)",
    ),
    QueryTestCase(
        query="Phone with Snapdragon 8 Gen 3 processor",
        category="Gaming & Performance",
        expected_intent="specification",
        expected_entities={"spec_fields": ["processor"]},
        expected_retrieval_engine="Specification",
        expected_response_type="SearchResponse",
        expected_ranking_logic="SQL filter processor_text LIKE %Snapdragon 8 Gen 3%",
    ),
    QueryTestCase(
        query="Best phone with 120Hz AMOLED display under 25k",
        category="Gaming & Performance",
        expected_intent="recommendation",
        expected_entities={"budget": 25000.0, "priority": "display"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter price_min <= 25000 + 120Hz refresh display score",
    ),
    QueryTestCase(
        query="Best phone with 16GB RAM for heavy gaming",
        category="Gaming & Performance",
        expected_intent="recommendation",
        expected_entities={"priority": "gaming"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter ram_gb >= 16 + gaming score",
    ),
]


@pytest.mark.parametrize("tc", GAMING_TEST_CASES, ids=lambda tc: tc.query)
def test_gaming_query_specification(tc: QueryTestCase):
    assert_query_specification(tc)
