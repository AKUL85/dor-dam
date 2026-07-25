"""
tests/query_tests/test_budget_queries.py
==========================================
Query tests for Category 1: Budget & Price Tier Domain.
"""

import pytest
from .utils import QueryTestCase, assert_query_specification

BUDGET_TEST_CASES = [
    QueryTestCase(
        query="Best phone under 20000 taka",
        category="Budget & Price Tier",
        expected_intent="recommendation",
        expected_entities={"budget": 20000.0},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter price_min <= 20000, rank by composite baseline score",
    ),
    QueryTestCase(
        query="Best phone under 30k in Bangladesh",
        category="Budget & Price Tier",
        expected_intent="recommendation",
        expected_entities={"budget": 30000.0},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter price_min <= 30000, rank by value & general score",
    ),
    QueryTestCase(
        query="Phones between 15000 to 25000 taka",
        category="Budget & Price Tier",
        expected_intent="recommendation",
        expected_entities={"budget_min": 15000.0},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter 15000 <= price_min <= 25000, rank by overall score",
    ),
    QueryTestCase(
        query="Best Samsung phone under 50000 taka",
        category="Budget & Price Tier",
        expected_intent="recommendation",
        expected_entities={"brand": "Samsung", "budget": 50000.0},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter brand='Samsung' AND price_min <= 50000",
    ),
    QueryTestCase(
        query="Cheapest 5G phone in Bangladesh",
        category="Budget & Price Tier",
        expected_intent="mixed",
        expected_entities={"spec_fields": ["network"]},
        expected_retrieval_engine="Specification",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter 5g=true, sort price_min ASC",
    ),
]


@pytest.mark.parametrize("tc", BUDGET_TEST_CASES, ids=lambda tc: tc.query)
def test_budget_query_specification(tc: QueryTestCase):
    assert_query_specification(tc)
