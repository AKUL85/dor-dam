"""
tests/test_domain_guard.py
===========================
Comprehensive unit test suite for ScopeClassifier (Domain Guard).

Tests over 100 query examples across:
- GENERAL_GREETING
- SMALL_TALK
- UNRELATED
- UNKNOWN / Edge cases
- PHONE_DOMAIN (verifying zero regressions for phone queries)
"""

import sys
from pathlib import Path

# Add workspace root and scripts to python path
ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
API_DIR = ROOT_DIR / "api"
for d in [str(SCRIPTS_DIR), str(ROOT_DIR), str(API_DIR)]:
    if d not in sys.path:
        sys.path.insert(0, d)

import pytest
from domain_guard import ScopeCategory, ScopeClassifier, get_scope_guard


@pytest.fixture
def classifier():
    return get_scope_guard()


# ── 1. GENERAL_GREETING Test Cases (20 Examples) ─────────────────────
GREETING_CASES = [
    "Hi",
    "Hello",
    "Good morning",
    "Hey",
    "Hey there",
    "Good afternoon",
    "Good evening",
    "Assalamu Alaikum",
    "Assalamualaikum",
    "Slam",
    "Salaam",
    "Greetings",
    "Yo",
    "Sup",
    "Hola",
    "Hi there assistant",
    "Hello AI",
    "Hey bot",
    "Good morning team",
    "Hello!",
]

@pytest.mark.parametrize("query", GREETING_CASES)
def test_greetings(classifier: ScopeClassifier, query: str):
    res = classifier.classify(query)
    assert res.category == ScopeCategory.GENERAL_GREETING, f"Failed greeting query: {query}"
    assert res.response_text is not None
    assert "AI Mobile Assistant" in res.response_text or "Hello" in res.response_text


# ── 2. SMALL_TALK Test Cases (20 Examples) ────────────────────────────
SMALL_TALK_CASES = [
    "How are you?",
    "How r u",
    "Thanks",
    "Thank you",
    "Thank you so much",
    "Good job",
    "Nice",
    "Awesome",
    "Great work",
    "Cool",
    "Who are you?",
    "What is your name?",
    "What can you do?",
    "Nice work",
    "Well done",
    "Thanks a lot",
    "Thank u",
    "How do you do",
    "You are awesome",
    "Super cool",
]

@pytest.mark.parametrize("query", SMALL_TALK_CASES)
def test_small_talk(classifier: ScopeClassifier, query: str):
    res = classifier.classify(query)
    assert res.category == ScopeCategory.SMALL_TALK, f"Failed small talk query: {query}"
    assert res.response_text is not None
    assert "doing great" in res.response_text or "help" in res.response_text


# ── 3. UNRELATED Test Cases (25 Examples) ────────────────────────────
UNRELATED_CASES = [
    "Who won the World Cup?",
    "Teach me Python",
    "What is machine learning?",
    "Solve this math problem: 2 + 2",
    "Tell me a joke",
    "Write my resume",
    "Translate this paragraph to French",
    "How to cook biryani",
    "What is the capital of France?",
    "Explain gravity",
    "Who is the president of USA?",
    "Write a javascript function",
    "How to bake a chocolate cake?",
    "Solve x^2 + 5x + 6 = 0",
    "Sing me a song",
    "What is quantum computing?",
    "Give me a workout plan",
    "Tell me a bedtime story",
    "What is the speed of light?",
    "How to lose weight fast",
    "Who wrote Hamlet?",
    "What is photosynthesis?",
    "Teach me SQL queries",
    "Recipe for chicken curry",
    "What is the weather today in Dhaka?",
]

@pytest.mark.parametrize("query", UNRELATED_CASES)
def test_unrelated(classifier: ScopeClassifier, query: str):
    res = classifier.classify(query)
    assert res.category == ScopeCategory.UNRELATED, f"Failed unrelated query: {query}"
    assert res.response_text is not None
    assert "specifically to help with smartphones" in res.response_text or "smartphones" in res.response_text


# ── 4. UNKNOWN / Edge Cases (15 Examples) ───────────────────────────
UNKNOWN_CASES = [
    "asdfghjkl",
    "qwertyuiop",
    "???",
    "123456789",
    "a",
    "...................",
    "zxczxczxczxc",
    "hjklhjklhjkl",
    "!!!???",
    "bbbbbbbbbbbbb",
    "randomtext12345",
    "xyz123abc",
    "foobar123",
    "asdfasdf",
    "lkjhgfdsa",
]

@pytest.mark.parametrize("query", UNKNOWN_CASES)
def test_unknown_edge_cases(classifier: ScopeClassifier, query: str):
    res = classifier.classify(query)
    assert res.category == ScopeCategory.UNKNOWN, f"Failed unknown query: {query}"
    assert res.response_text is not None
    assert "not sure what you're looking for" in res.response_text or "Could you ask" in res.response_text


# ── 5. PHONE_DOMAIN Test Cases (25 Examples - Zero Regressions) ───────
PHONE_DOMAIN_CASES = [
    "Best phone under 30000",
    "Compare iPhone 17 vs S25 Ultra",
    "Which phone has the best camera?",
    "What is the price of Galaxy S25?",
    "Cheapest 5G phone in Bangladesh",
    "Phones with 5000mAh battery",
    "Best gaming phone under 50k",
    "Redmi Note 13 Pro specs",
    "Best phone for students under 20k taka",
    "Is Samsung Galaxy Z Flip 6 worth buying?",
    "Best camera phone under 40000 BDT",
    "Upcoming phones in 2026",
    "Phones with 120Hz AMOLED display",
    "Best phone for resale value after 2 years",
    "EMI options for iPhone in BD",
    "Xiaomi vs Realme which is better",
    "Best Snapdragon 8 Gen 3 phone",
    "iPhone 16 Pro Max price in Bangladesh",
    "Phones with 12GB RAM under 30k",
    "Best waterproof phone IP68 rating",
    "Phones with fast charging 67W",
    "Best phone with eSIM support",
    "Oppo vs Vivo camera comparison",
    "Best telephoto lens camera phone",
    "Cheapest phone with 256GB storage",
]

@pytest.mark.parametrize("query", PHONE_DOMAIN_CASES)
def test_phone_domain(classifier: ScopeClassifier, query: str):
    res = classifier.classify(query)
    assert res.category == ScopeCategory.PHONE_DOMAIN, f"Failed phone domain query: {query}"
    assert res.is_phone_domain() is True
    assert res.response_text is None
