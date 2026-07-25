"""
scripts/guard_templates.py
===========================
Reusable, structured response templates for the Domain Guard (Scope Guard).

Provides polite, helpful, domain-specific responses when user queries are
classified as non-phone queries (GENERAL_GREETING, SMALL_TALK, UNRELATED, UNKNOWN).
"""

from __future__ import annotations

from typing import Dict

GREETING_RESPONSE = (
    "Hello! 👋 I'm your AI Mobile Assistant.\n\n"
    "I can help you compare smartphones, recommend phones based on your budget, "
    "explain specifications, compare cameras, gaming performance, battery life, and much more.\n\n"
    "Try asking something like:\n"
    "• Best phone under 30,000 BDT\n"
    "• Compare Galaxy S25 vs iPhone 17\n"
    "• Best gaming phone\n"
    "• Cheapest phone with AMOLED display"
)

SMALL_TALK_RESPONSE = (
    "I'm doing great! 😊\n\n"
    "I'm here to help you find the best smartphone based on your needs.\n\n"
    "Ask me anything about mobile phones, prices, comparisons, specifications, or buying advice."
)

UNRELATED_RESPONSE = (
    "I'm designed specifically to help with smartphones and mobile technology.\n\n"
    "I can't answer general questions, but I'd be happy to help you with:\n"
    "• Phone recommendations\n"
    "• Price comparisons\n"
    "• Camera comparisons\n"
    "• Gaming phones\n"
    "• Battery life\n"
    "• Buying advice\n"
    "• Mobile specifications\n\n"
    "Try asking:\n"
    "'Best phone under 25,000 BDT'\n"
    "or\n"
    "'Compare Galaxy S25 and iPhone 17'."
)

UNKNOWN_RESPONSE = (
    "I'm not sure what you're looking for.\n\n"
    "Could you ask your question about a mobile phone, price, comparison, or specification?"
)

_TEMPLATES: Dict[str, str] = {
    "GENERAL_GREETING": GREETING_RESPONSE,
    "SMALL_TALK": SMALL_TALK_RESPONSE,
    "UNRELATED": UNRELATED_RESPONSE,
    "UNKNOWN": UNKNOWN_RESPONSE,
}


def get_guard_response(category: str) -> str:
    """Return the structured template string for a given non-phone scope category."""
    category_upper = category.upper()
    return _TEMPLATES.get(category_upper, UNKNOWN_RESPONSE)
