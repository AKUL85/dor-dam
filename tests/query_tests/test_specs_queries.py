"""
tests/query_tests/test_specs_queries.py
=========================================
Query tests for Category 7: Feature & Technical Spec Domain.
"""

import pytest
from .utils import QueryTestCase, assert_query_specification

SPECS_TEST_CASES = [
    QueryTestCase(
        query="Samsung Galaxy S25 Ultra full specifications",
        category="Feature & Technical Spec",
        expected_intent="specification",
        expected_entities={"models": ["Samsung Galaxy S25 Ultra"]},
        expected_retrieval_engine="Specification",
        expected_response_type="SearchResponse",
        expected_ranking_logic="SQL spec lookup for named model",
    ),
    QueryTestCase(
        query="Phones with IP68 waterproof rating",
        category="Feature & Technical Spec",
        expected_intent="review",
        expected_entities={"priority": "build"},
        expected_retrieval_engine="Specification",
        expected_response_type="SearchResponse",
        expected_ranking_logic="SQL filter features LIKE %IP68%",
    ),
    QueryTestCase(
        query="Best phone with headphone jack still available",
        category="Feature & Technical Spec",
        expected_intent="recommendation",
        expected_entities={"priority": "audio"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter 3.5mm headphone jack present + score",
    ),
]


@pytest.mark.parametrize("tc", SPECS_TEST_CASES, ids=lambda tc: tc.query)
def test_specs_query_specification(tc: QueryTestCase):
    assert_query_specification(tc)
