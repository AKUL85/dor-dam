"""
tests/query_tests/test_lifecycle_foldables_queries.py
=======================================================
Query tests for Category 10: Strategic Buying & Form Factor Domain.
"""

import pytest
from .utils import QueryTestCase, assert_query_specification

LIFECYCLE_FOLDABLES_TEST_CASES = [
    QueryTestCase(
        query="Best foldable phone in Bangladesh",
        category="Strategic Buying & Form Factor",
        expected_intent="recommendation",
        expected_entities={"priority": "foldable"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Foldable form factor score + hinge/display quality metrics",
    ),
    QueryTestCase(
        query="Samsung Z Fold vs Z Flip which to buy",
        category="Strategic Buying & Form Factor",
        expected_intent="comparison",
        expected_entities={"brand": "Samsung"},
        expected_retrieval_engine="Comparison",
        expected_response_type="CompareResponse",
        expected_ranking_logic="Book vs Flip foldable form factor comparison table",
    ),
    QueryTestCase(
        query="Upcoming flagship phones launching in 2026",
        category="Strategic Buying & Form Factor",
        expected_intent="lifecycle_advisory",
        expected_entities={},
        expected_retrieval_engine="Future Phones",
        expected_response_type="SearchResponse",
        expected_ranking_logic="Semantic retrieval of upcoming launch roadmaps and expected specs",
    ),
    QueryTestCase(
        query="Best phone with active stylus or S Pen support",
        category="Strategic Buying & Form Factor",
        expected_intent="recommendation",
        expected_entities={},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Stylus support feature flag + flagship productivity score",
    ),
]


@pytest.mark.parametrize("tc", LIFECYCLE_FOLDABLES_TEST_CASES, ids=lambda tc: tc.query)
def test_lifecycle_foldables_query_specification(tc: QueryTestCase):
    assert_query_specification(tc)
