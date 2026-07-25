"""
tests/test_router.py
====================
Unit tests for the extended Hybrid Router services and decision rubric.
Verifies engine execution plan generation across all 11 intent types and 10 retrieval engines.
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
from api.services import plan, Plan, EnginePlan
from intent_classifier import IntentType


class TestRouterEnginePlans:
    """Test deterministic planning logic for each intent type."""

    def test_recommendation_plan(self):
        p = plan("Best phone under 20000 taka", IntentType.RECOMMENDATION)
        assert p.intent == IntentType.RECOMMENDATION
        engine_names = [e.name for e in p.engines]
        assert "recommend" in engine_names
        assert "buying_guide" in engine_names or "search" in engine_names

    def test_comparison_plan(self):
        p = plan("iPhone 17 vs Samsung S25 Ultra", IntentType.COMPARISON)
        assert p.intent == IntentType.COMPARISON
        engine_names = [e.name for e in p.engines]
        assert "specs" in engine_names
        assert "compare" in engine_names

    def test_price_lookup_plan(self):
        p = plan("iPhone 17 price in Bangladesh", IntentType.PRICE_LOOKUP)
        assert p.intent == IntentType.PRICE_LOOKUP
        engine_names = [e.name for e in p.engines]
        assert "pricing" in engine_names

    def test_specification_plan(self):
        p = plan("What are the specs of Galaxy S25", IntentType.SPECIFICATION)
        assert p.intent == IntentType.SPECIFICATION
        engine_names = [e.name for e in p.engines]
        assert "specs" in engine_names

    def test_review_plan(self):
        p = plan("Is Galaxy S25 worth buying? Review", IntentType.REVIEW)
        assert p.intent == IntentType.REVIEW
        engine_names = [e.name for e in p.engines]
        assert "review" in engine_names or "search" in engine_names

    def test_lifecycle_advisory_plan(self):
        p = plan("Is it better to wait for next flagship or buy now", IntentType.LIFECYCLE_ADVISORY)
        assert p.intent == IntentType.LIFECYCLE_ADVISORY
        engine_names = [e.name for e in p.engines]
        assert "future_phones" in engine_names
        assert "buying_guide" in engine_names or "search" in engine_names

    def test_resale_tradein_plan(self):
        p = plan("Which phone brand has best resale value in BD", IntentType.RESALE_TRADEIN)
        assert p.intent == IntentType.RESALE_TRADEIN
        engine_names = [e.name for e in p.engines]
        assert "resale" in engine_names
        assert "pricing" in engine_names

    def test_deals_financing_plan(self):
        p = plan("EMI / installment phone purchase options BD", IntentType.DEALS_FINANCING)
        assert p.intent == IntentType.DEALS_FINANCING
        engine_names = [e.name for e in p.engines]
        assert "deals" in engine_names
        assert "pricing" in engine_names

    def test_general_plan(self):
        p = plan("Hello who are you", IntentType.GENERAL)
        assert p.intent == IntentType.GENERAL
        engine_names = [e.name for e in p.engines]
        assert "search" in engine_names
