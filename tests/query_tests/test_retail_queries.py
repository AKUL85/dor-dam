"""
tests/query_tests/test_retail_queries.py
==========================================
Query tests for Category 8: BD Retail & Transactional Domain.
"""

import pytest
from .utils import QueryTestCase, assert_query_specification

RETAIL_TEST_CASES = [
    QueryTestCase(
        query="iPhone 16 Pro price in Bangladesh Star Tech Ryans Custom Mac BD",
        category="BD Retail & Transactional",
        expected_intent="price_lookup",
        expected_entities={"brand": "Apple"},
        expected_retrieval_engine="Price",
        expected_response_type="PriceResponse",
        expected_ranking_logic="Price check across BD stores sorted by lowest price",
    ),
    QueryTestCase(
        query="Is Samsung S24 Ultra in stock at Star Tech",
        category="BD Retail & Transactional",
        expected_intent="availability",
        expected_entities={"brand": "Samsung"},
        expected_retrieval_engine="Price",
        expected_response_type="PriceResponse",
        expected_ranking_logic="Filter store listings by in_stock=True",
    ),
    QueryTestCase(
        query="Official vs unofficial phone price difference BD",
        category="BD Retail & Transactional",
        expected_intent="comparison",
        expected_entities={},
        expected_retrieval_engine="Comparison",
        expected_response_type="PriceResponse",
        expected_ranking_logic="Compare official BDT price min with unofficial grey market price max",
    ),
]


@pytest.mark.parametrize("tc", RETAIL_TEST_CASES, ids=lambda tc: tc.query)
def test_retail_query_specification(tc: QueryTestCase):
    assert_query_specification(tc)
