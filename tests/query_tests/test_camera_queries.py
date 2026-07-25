"""
tests/query_tests/test_camera_queries.py
==========================================
Query tests for Category 2: Camera & Imaging Domain.
"""

import pytest
from .utils import QueryTestCase, assert_query_specification

CAMERA_TEST_CASES = [
    QueryTestCase(
        query="Best camera phone under 40000 taka",
        category="Camera & Imaging",
        expected_intent="recommendation",
        expected_entities={"budget": 40000.0, "priority": "camera"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="SQL filter price_min <= 40000, rank by camera scorer (MP + OIS + Zoom)",
    ),
    QueryTestCase(
        query="Best phone with 200MP camera",
        category="Camera & Imaging",
        expected_intent="recommendation",
        expected_entities={"priority": "camera", "spec_fields": ["camera"]},
        expected_retrieval_engine="Recommendation",
        expected_response_type="SearchResponse",
        expected_ranking_logic="SQL spec filter camera_mp >= 200 or camera_text regex",
    ),
    QueryTestCase(
        query="Best camera phone with OIS stabilization",
        category="Camera & Imaging",
        expected_intent="recommendation",
        expected_entities={"priority": "camera"},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Rank candidates with OIS hardware bonus in camera scorer",
    ),
    QueryTestCase(
        query="Best 4K video recording phone for vlogging",
        category="Camera & Imaging",
        expected_intent="recommendation",
        expected_entities={"priority": "camera", "spec_fields": ["camera"]},
        expected_retrieval_engine="Recommendation",
        expected_response_type="RecommendResponse",
        expected_ranking_logic="Photography scorer + 4K/60fps video capture feature bonus",
    ),
]


@pytest.mark.parametrize("tc", CAMERA_TEST_CASES, ids=lambda tc: tc.query)
def test_camera_query_specification(tc: QueryTestCase):
    assert_query_specification(tc)
