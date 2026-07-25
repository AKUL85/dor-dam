"""
tests/test_recommend_engine.py
===============================
Unit tests for the extended Recommendation Engine.
Tests all 17 recommendation categories and priority scorers.
"""

import sys
from pathlib import Path

# Add workspace root and scripts to python path
ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pytest
from db.models import Phone
from recommend.scorers import PhoneFeatures, score_for, PRIORITY_SCORERS
from recommend.engine import RecommendationQuery, RankingEngine


@pytest.fixture
def sample_phone():
    """Create a mock Phone object for testing recommendation scorers."""
    phone = Phone()
    phone.id = 1
    phone.name = "Samsung Galaxy S25 Ultra 5G"
    phone.brand = "Samsung"
    phone.category = "Flagship Foldable"
    phone.price_min = 120000.0
    phone.price_max = 140000.0
    phone.ram_gb = 12
    phone.storage_gb = 256
    phone.battery_mah = 5000
    phone.charging_w = 45
    phone.display_inches = 6.8
    phone.display_text = "6.8 inch Dynamic AMOLED 2X 120Hz 2600 nits LTPO Gorilla Glass Victus 2"
    phone.camera_text = "200 MP wide OIS + 50 MP telephoto 5x optical zoom + 12 MP ultrawide, 8K video ProRes"
    phone.processor_text = "Qualcomm Snapdragon 8 Gen 3 for Galaxy"
    phone.os_text = "Android 15, One UI 7, 7 years software updates, Galaxy AI"
    phone.body_text = "IP68 dust/water resistant, Titanium frame, Armor Aluminum"
    return phone


class TestRecommendationCategories:
    """Test individual priority scorers across all 17 categories."""

    CATEGORIES = [
        "budget", "gaming", "camera", "battery", "software", "foldable",
        "compact", "business", "student", "travel", "photography",
        "durability", "resale", "ecosystem", "accessibility", "content_creator", "ai_features"
    ]

    def test_all_17_categories_registered(self):
        for category in self.CATEGORIES:
            assert category in PRIORITY_SCORERS, f"Category '{category}' is missing in PRIORITY_SCORERS registry!"

    def test_sample_phone_scoring(self, sample_phone):
        features = PhoneFeatures.from_phone(sample_phone)
        for category in self.CATEGORIES:
            score, note = score_for(category, features)
            assert 0.0 <= score <= 1.0, f"Score for {category} out of range: {score}"
            assert isinstance(note, str)

    def test_ai_features_scorer(self, sample_phone):
        features = PhoneFeatures.from_phone(sample_phone)
        score, note = score_for("ai_features", features)
        assert score >= 0.85
        assert "AI" in note or "NPU" in note

    def test_photography_scorer(self, sample_phone):
        features = PhoneFeatures.from_phone(sample_phone)
        score, note = score_for("photography", features)
        assert score >= 0.80

    def test_durability_scorer(self, sample_phone):
        features = PhoneFeatures.from_phone(sample_phone)
        score, note = score_for("durability", features)
        assert score >= 0.85
        assert "IP68" in note

    def test_resale_scorer(self, sample_phone):
        features = PhoneFeatures.from_phone(sample_phone)
        score, note = score_for("resale", features)
        assert score >= 0.80

    def test_ranking_engine_extended_priorities(self, sample_phone):
        query = RecommendationQuery(
            query_text="Best phone with Galaxy AI for content creators under 150000 taka",
            budget_max=150000.0,
            priorities=["ai_features", "content_creator", "camera"],
            limit=5
        )
        results = RankingEngine.score_and_rank([sample_phone], query)
        assert len(results) == 1
        res = results[0]
        assert res.phone_id == 1
        assert res.score > 0.5
        assert "ai_features" in res.score_breakdown
        assert "content_creator" in res.score_breakdown

    def test_recommendation_result_schema_fields(self, sample_phone):
        query = RecommendationQuery(
            query_text="Best camera phone under 150000 taka",
            budget_max=150000.0,
            priorities=["camera"],
            limit=1
        )
        results = RankingEngine.score_and_rank([sample_phone], query)
        assert len(results) == 1
        res = results[0]

        # Verify all 12 core requested schema fields
        assert res.rank == 1
        assert res.phone == "Samsung Samsung Galaxy S25 Ultra 5G" or "Samsung" in res.phone
        assert res.price == 120000.0
        assert isinstance(res.summary, str) and len(res.summary) > 0
        assert isinstance(res.advantages, list) and len(res.advantages) > 0
        assert isinstance(res.disadvantages, list) and len(res.disadvantages) > 0
        assert isinstance(res.store_availability, list)
        assert res.official_price == 120000.0
        assert res.unofficial_price == 140000.0
        assert isinstance(res.why_recommended, str) and len(res.why_recommended) > 0
        assert 0.0 <= res.comparison_score <= 1.0
        assert 0.0 <= res.confidence_score <= 1.0

        # Verify backward compatibility fields
        assert res.phone_id == 1
        assert res.brand == "Samsung"
        assert res.name == "Samsung Galaxy S25 Ultra 5G"
        assert res.score == res.comparison_score or res.score > 0.0
        assert res.reason == res.why_recommended
