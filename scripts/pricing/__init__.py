"""Pricing engine — SQL-only price discovery for a single phone.

Answers:
- Where can I buy it? (all stores, sorted by price)
- Cheapest / highest-price store
- Stock availability per store
- Price range and discount headline

Vector search is intentionally NOT used; everything comes from
``phone_stores`` rows joined to ``phones``.
"""
from pricing.engine import (
    PricingQuery,
    PricingResult,
    StoreOffer,
    PriceRange,
    price_check,
    price_for,
    render_markdown,
)

__all__ = [
    "PricingQuery",
    "PricingResult",
    "StoreOffer",
    "PriceRange",
    "price_check",
    "price_for",
    "render_markdown",
]