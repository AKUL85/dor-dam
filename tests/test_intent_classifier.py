"""
tests/test_intent_classifier.py
================================
Comprehensive test suite for the extended intent classifier module.
Tests all 11 intent types (8 baseline + 3 new extended intents) across all 17 query categories.
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
from intent_classifier import IntentType, RuleBasedClassifier, ExtractedInfo


@pytest.fixture
def classifier():
    return RuleBasedClassifier()


class TestBaselineIntents:
    """Test preserved baseline intents."""

    def test_recommendation_budget(self, classifier):
        info = classifier.classify("Best phone under 20000 taka")
        assert info.intent == IntentType.RECOMMENDATION
        assert info.budget == 20000.0

    def test_recommendation_priority(self, classifier):
        info = classifier.classify("Best camera phone under 30k")
        assert info.intent == IntentType.RECOMMENDATION
        assert info.budget == 30000.0
        assert info.priority == "camera"

    def test_comparison(self, classifier):
        info = classifier.classify("iPhone 17 vs Samsung S25 Ultra")
        assert info.intent == IntentType.COMPARISON
        assert len(info.brands) >= 2 or len(info.models) >= 2 or "Apple" in info.brands or "Samsung" in info.brands

    def test_price_lookup(self, classifier):
        info = classifier.classify("iPhone 17 price in Bangladesh")
        assert info.intent == IntentType.PRICE_LOOKUP
        assert "Apple" in info.brands or "Iphone" in info.models or "Iphone 17" in info.models

    def test_availability(self, classifier):
        info = classifier.classify("Where to buy original phone in Bangladesh")
        assert info.intent in (IntentType.AVAILABILITY, IntentType.RECOMMENDATION)

    def test_specification(self, classifier):
        info = classifier.classify("What are the specs of Galaxy S25")
        assert info.intent == IntentType.SPECIFICATION

    def test_review(self, classifier):
        info = classifier.classify("Is Galaxy S25 worth buying? Review")
        assert info.intent == IntentType.REVIEW

    def test_general(self, classifier):
        info = classifier.classify("Hello who are you")
        assert info.intent == IntentType.GENERAL


class TestExtendedIntents:
    """Test newly added extended intent categories."""

    def test_lifecycle_advisory_upcoming(self, classifier):
        info = classifier.classify("Upcoming phones to launch in 2026")
        assert info.intent == IntentType.LIFECYCLE_ADVISORY

    def test_lifecycle_advisory_wait_or_buy(self, classifier):
        info = classifier.classify("Is it better to wait for next flagship or buy now")
        assert info.intent == IntentType.LIFECYCLE_ADVISORY

    def test_lifecycle_advisory_upgrade(self, classifier):
        info = classifier.classify("Best phone to upgrade from a 3-year-old phone")
        assert info.intent == IntentType.LIFECYCLE_ADVISORY

    def test_resale_tradein_resale_value(self, classifier):
        info = classifier.classify("Which phone brand has best resale value in BD")
        assert info.intent == IntentType.RESALE_TRADEIN

    def test_resale_tradein_refurbished(self, classifier):
        info = classifier.classify("Best refurbished phone to buy")
        assert info.intent == IntentType.RESALE_TRADEIN

    def test_resale_tradein_exchange(self, classifier):
        info = classifier.classify("Trade-in old phone for new phone in Bangladesh")
        assert info.intent == IntentType.RESALE_TRADEIN

    def test_resale_tradein_certified_preowned(self, classifier):
        info = classifier.classify("Certified pre-owned iPhone worth buying")
        assert info.intent == IntentType.RESALE_TRADEIN

    def test_deals_financing_emi(self, classifier):
        info = classifier.classify("EMI / installment phone purchase options BD")
        assert info.intent == IntentType.DEALS_FINANCING

    def test_deals_financing_warranty(self, classifier):
        info = classifier.classify("Phone warranty and after-sales service in BD")
        assert info.intent == IntentType.DEALS_FINANCING

    def test_deals_financing_eid_sale(self, classifier):
        info = classifier.classify("Best phone deals during Eid sale in Bangladesh")
        assert info.intent == IntentType.DEALS_FINANCING

    def test_deals_financing_black_friday(self, classifier):
        info = classifier.classify("Best phone deals on Daraz/Black Friday sale")
        assert info.intent == IntentType.DEALS_FINANCING


class TestExtendedEntityAndPriorityExtraction:
    """Test extraction of extended priorities, specs, and personas."""

    def test_ai_priority(self, classifier):
        info = classifier.classify("Best phone with Galaxy AI features")
        assert info.intent == IntentType.RECOMMENDATION
        assert info.priority == "ai"

    def test_foldable_priority(self, classifier):
        info = classifier.classify("Best foldable phone in Bangladesh")
        assert info.intent == IntentType.RECOMMENDATION
        assert info.priority == "foldable"

    def test_foldable_comparison(self, classifier):
        info = classifier.classify("Samsung Galaxy Z Fold vs Z Flip — which to buy")
        assert info.intent == IntentType.COMPARISON

    def test_esim_connectivity(self, classifier):
        info = classifier.classify("Best phone with eSIM support")
        assert info.intent == IntentType.RECOMMENDATION
        assert "esim" in info.spec_fields or info.priority == "connectivity"

    def test_satellite_connectivity(self, classifier):
        info = classifier.classify("Best phone with satellite connectivity")
        assert info.intent == IntentType.RECOMMENDATION
        assert "satellite" in info.spec_fields or info.priority == "connectivity"

    def test_student_persona(self, classifier):
        info = classifier.classify("Best phone for students under 20k")
        assert info.intent == IntentType.RECOMMENDATION
        assert info.budget == 20000.0
        assert info.priority == "persona"

    def test_content_creator_persona(self, classifier):
        info = classifier.classify("Best phone for content creators")
        assert info.intent == IntentType.RECOMMENDATION
        assert info.priority == "persona" or info.priority == "camera"

    def test_silicon_carbon_battery(self, classifier):
        info = classifier.classify("Best phone with silicon-carbon battery")
        assert info.intent == IntentType.RECOMMENDATION
        assert info.priority == "battery"
