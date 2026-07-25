"""
tests/query_tests/test_battery_queries.py
===========================================
Query tests for Category 4: Battery, Power & Charging Domain.
"""

import pytest
from .utils import QueryTestCase, assert_query_specification

BATTERY_TEST_CASES = [
    QueryTestCase(
        query="Best phone with 6000mAh battery",
        category="Battery & Power",
        expected_intent="recommendation",
        expected_entities={"priority": "battery"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter battery_mah >= 6000, rank by battery endurance scorer",
    ),
    QueryTestCase(
        query="Best phone with 120W fast charging",
        category="Battery & Power",
        expected_intent="recommendation",
        expected_entities={"priority": "battery"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter charging_w >= 120, rank by charging wattage score",
    ),
    QueryTestCase(
        query="Best wireless charging phone under 50000 taka",
        category="Battery & Power",
        expected_intent="recommendation",
        expected_entities={"budget": 50000.0},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter price_min <= 50000 + wireless charging capability flag",
    ),
]


@pytest.mark.parametrize("tc", BATTERY_TEST_CASES, ids=lambda tc: tc.query)
def test_battery_query_specification(tc: QueryTestCase):
    assert_query_specification(tc)
