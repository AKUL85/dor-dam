"""
tests/query_tests/test_comparison_queries.py
==============================================
Query tests for Category 5: Brand & Model Comparison Domain.
"""

import pytest
from .utils import QueryTestCase, assert_query_specification

COMPARISON_TEST_CASES = [
    QueryTestCase(
        query="Samsung Galaxy S25 Ultra vs iPhone 16 Pro Max",
        category="Brand & Model Comparison",
        expected_intent="comparison",
        expected_entities={"models": ["Samsung Galaxy S25 Ultra", "Iphone 16 Pro Max"]},
        expected_retrieval_engine="Comparison",
        expected_response_type="CompareResponse",
        expected_ranking_logic="Side-by-side comparison across display, camera, battery, processor, and price",
    ),
    QueryTestCase(
        query="Redmi Note 13 Pro vs Realme 12 Pro",
        category="Brand & Model Comparison",
        expected_intent="comparison",
        expected_entities={"models": ["Redmi Note 13 Pro"]},
        expected_retrieval_engine="Comparison",
        expected_response_type="CompareResponse",
        expected_ranking_logic="Mid-range head-to-head spec matrix and value recommendation",
    ),
    QueryTestCase(
        query="Compare Samsung S24 Ultra and Pixel 9 Pro camera",
        category="Brand & Model Comparison",
        expected_intent="comparison",
        expected_entities={"spec_fields": ["camera"]},
        expected_retrieval_engine="Comparison",
        expected_response_type="CompareResponse",
        expected_ranking_logic="Camera aspect comparison table (sensor, OIS, telephoto, video)",
    ),
]


@pytest.mark.parametrize("tc", COMPARISON_TEST_CASES, ids=lambda tc: tc.query)
def test_comparison_query_specification(tc: QueryTestCase):
    assert_query_specification(tc)
