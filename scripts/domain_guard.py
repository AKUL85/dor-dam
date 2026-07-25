"""
scripts/domain_guard.py
========================
Domain Guard (Scope Guard) module for the DorDam Mobile Phone Hybrid RAG.

Classifies incoming messages into:
- PHONE_DOMAIN      : Mobile phone queries (recommendations, specs, prices, compare, brands, specs)
- GENERAL_GREETING  : Conversational greetings ("hi", "hello", "good morning")
- SMALL_TALK        : Polite casual chatter ("how are you", "thanks", "nice")
- UNRELATED         : Off-topic questions (cooking, python, sports, jokes, resumes)
- UNKNOWN           : Noise, gibberish, keyboard smash, unclassifiable text
"""

from __future__ import annotations

import logging
import re
from enum import Enum
from typing import Any, Dict, List, Optional, Set

from pydantic import BaseModel, Field

from guard_templates import get_guard_response

logger = logging.getLogger("domain_guard")


class ScopeCategory(str, Enum):
    """Supported scope categories for domain guarding."""
    PHONE_DOMAIN = "PHONE_DOMAIN"
    GENERAL_GREETING = "GENERAL_GREETING"
    SMALL_TALK = "SMALL_TALK"
    UNRELATED = "UNRELATED"
    UNKNOWN = "UNKNOWN"


class ScopeGuardResult(BaseModel):
    """Result of domain scope classification."""
    category: ScopeCategory
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    reason: str = Field(default="")
    response_text: Optional[str] = Field(default=None)

    def is_phone_domain(self) -> bool:
        return self.category == ScopeCategory.PHONE_DOMAIN


class ScopeClassifier:
    """Fast, accurate rule-based & heuristic classifier for domain guarding."""

    # Phone brands
    PHONE_BRANDS: Set[str] = {
        "samsung", "apple", "iphone", "xiaomi", "redmi", "realme", "vivo", "oppo",
        "oneplus", "google", "pixel", "infinix", "tecno", "symphony", "nothing",
        "poco", "iqoo", "asus", "rog", "honor", "sony", "xperia", "huawei", "zte",
        "nubia", "motorola", "moto", "nokia", "oneplus", "ipad", "galaxy", "redmagic"
    }

    # Mobile specification & feature keywords
    PHONE_KEYWORDS: Set[str] = {
        "phone", "phones", "mobile", "mobiles", "smartphone", "smartphones", "handset",
        "cellphone", "telephone", "budget", "price", "prices", "taka", "bdt", "under",
        "camera", "cameras", "gaming", "game", "pubg", "freefire", "processor", "chipset",
        "ram", "rom", "storage", "gb", "battery", "mah", "charging", "watt", "display",
        "screen", "amoled", "oled", "lcd", "hz", "refreshrate", "fps", "5g", "4g",
        "esim", "sim", "waterproof", "ip68", "ip67", "stylus", "spen", "foldable",
        "fold", "flip", "resale", "tradein", "used", "secondhand", "refurbished", "emi",
        "installment", "official", "unofficial", "variant", "snapdragon", "dimensity",
        "helio", "exynos", "bionic", "antutu", "benchmark", "vlogging", "telephoto",
        "zoom", "ois", "eis", "megapixel", "mp", "speaker", "stereo", "headphone",
        "jack", "sdcard", "nfc", "wireless", "fastcharging", "fastcharger", "batterytech",
        "software", "android", "ios", "hyperos", "oneui", "oxygenos", "coloros",
        "update", "updates", "ecosystem", "accessory", "accessories", "cover", "case",
        "tempered", "glass", "charger", "gadget", "gadgets", "store", "startech",
        "apple-gadgets", "gadgetngear", "diamu", "kry", "compare", "comparison",
        "versus", "vs", "which", "better", "best", "cheapest", "top", "worth", "buy",
        "buying", "recommend", "recommendation", "specs", "specification", "specifications",
        "review", "reviews", "upcoming", "launch", "release", "2024", "2025", "2026"
    }

    # Phone Regex Patterns
    PHONE_REGEXES: List[re.Pattern] = [
        re.compile(r"\b(iphone|galaxy|pixel|redmi|realme|nord|fold|flip)\s*(\d+|pro|max|ultra|plus|fe|c\d+|note\s*\d+)?\b", re.I),
        re.compile(r"\b\d+\s*(gb|mb|mah|w|hz|mp|bdt|taka|k)\b", re.I),
        re.compile(r"\bunder\s*\d+\b", re.I),
        re.compile(r"\b\d+\s*k\s*(under|budget|taka|bdt)?\b", re.I),
        re.compile(r"\b(vs|versus)\b", re.I),
        re.compile(r"\b(best|cheapest|top)\s+(phone|camera|gaming|battery|display)\b", re.I),
    ]

    # Greetings patterns
    GREETING_PATTERNS: List[re.Pattern] = [
        re.compile(r"^(hi|hello|hey|heythere|hi there|good morning|good afternoon|good evening|assalamu alaikum|assalamualaikum|slam|salaam|greetings|yo|sup|hola)\b", re.I),
    ]

    # Small talk patterns
    SMALL_TALK_PATTERNS: List[re.Pattern] = [
        re.compile(r"^(how are you|how r u|how do you do|thanks|thank you|thanks a lot|thank u|good job|nice|awesome|great|cool|super cool|who are you|what is your name|what can you do|well done|thankyou|you are awesome)\b", re.I),
        re.compile(r"\b(thank you|thanks|how are you|good job|nice work|awesome|super cool)\b", re.I),
    ]

    # Unrelated topic patterns
    UNRELATED_PATTERNS: List[re.Pattern] = [
        re.compile(r"\b(python|javascript|code|coding|programming|algorithm|java|c\+\+|html|css|sql|database)\b", re.I),
        re.compile(r"\b(world cup|football|messi|ronaldo|cricket|nba|match|score|tournament)\b", re.I),
        re.compile(r"\b(cook|recipe|biryani|food|pasta|pizza|baking|kitchen|dish|ingredients)\b", re.I),
        re.compile(r"\b(joke|funny story|riddle|poem|sing|song|music|lyrics)\b", re.I),
        re.compile(r"\b(resume|cv|cover letter|essay|thesis|homework|math|solve|equation|integral)\b", re.I),
        re.compile(r"\b(weather|temperature|rain|climate|president|capital of|country|history|explain|workout|fitness)\b", re.I),
        re.compile(r"\b(machine learning|deep learning|neural network|physics|chemistry|biology|gravity)\b", re.I),
        re.compile(r"\b(translate|translation|french|german|spanish|bangla|english)\b", re.I),
    ]

    def classify(self, message: str) -> ScopeGuardResult:
        """Classify message into ScopeCategory."""
        if not message or not isinstance(message, str):
            return ScopeGuardResult(
                category=ScopeCategory.UNKNOWN,
                confidence=1.0,
                reason="Empty or non-string input message",
                response_text=get_guard_response("UNKNOWN"),
            )

        cleaned = message.strip()
        cleaned_lower = cleaned.lower()
        words = set(re.findall(r"\w+", cleaned_lower))

        # Check for noise / gibberish / unknown first (e.g. keyboard smash, random punctuation)
        if len(cleaned) < 2 or (len(words) == 1 and len(cleaned) > 8 and len(set(cleaned)) < 4):
            return ScopeGuardResult(
                category=ScopeCategory.UNKNOWN,
                confidence=0.9,
                reason="Noise or keyboard smash detected",
                response_text=get_guard_response("UNKNOWN"),
            )

        # 1. PHONE_DOMAIN Check
        # Check brand matches
        brand_match = words.intersection(self.PHONE_BRANDS)
        keyword_match = words.intersection(self.PHONE_KEYWORDS)

        # Check regex matches for phone domain
        regex_phone_match = any(pattern.search(cleaned_lower) for pattern in self.PHONE_REGEXES)

        if brand_match or len(keyword_match) >= 1 or regex_phone_match:
            # If query contains explicit phone domain terms, it is PHONE_DOMAIN
            return ScopeGuardResult(
                category=ScopeCategory.PHONE_DOMAIN,
                confidence=0.95,
                reason=f"Phone domain detected (brands={brand_match}, keywords={keyword_match})",
                response_text=None,
            )

        # 2. GENERAL_GREETING Check
        for pat in self.GREETING_PATTERNS:
            if pat.search(cleaned_lower):
                # Ensure no non-greeting words override
                if len(words) <= 5:
                    return ScopeGuardResult(
                        category=ScopeCategory.GENERAL_GREETING,
                        confidence=0.95,
                        reason="Greeting intent detected",
                        response_text=get_guard_response("GENERAL_GREETING"),
                    )

        # 3. SMALL_TALK Check
        for pat in self.SMALL_TALK_PATTERNS:
            if pat.search(cleaned_lower):
                if len(words) <= 7:
                    return ScopeGuardResult(
                        category=ScopeCategory.SMALL_TALK,
                        confidence=0.95,
                        reason="Small talk intent detected",
                        response_text=get_guard_response("SMALL_TALK"),
                    )

        # 4. UNRELATED Check
        for pat in self.UNRELATED_PATTERNS:
            if pat.search(cleaned_lower):
                return ScopeGuardResult(
                    category=ScopeCategory.UNRELATED,
                    confidence=0.95,
                    reason="Unrelated off-topic domain detected",
                    response_text=get_guard_response("UNRELATED"),
                )

        # Common non-phone questions starting with "who", "what", "how to", "why", "give me" without phone context
        if re.match(r"^(who|what is|how to|teach me|tell me|solve|write|translate|give me|explain)\b", cleaned_lower):
            return ScopeGuardResult(
                category=ScopeCategory.UNRELATED,
                confidence=0.85,
                reason="General query outside phone scope",
                response_text=get_guard_response("UNRELATED"),
            )

        # 5. UNKNOWN Fallback (gibberish, unknown random strings)
        # If words contain only non-dictionary noise or unusual character ratios
        if len(words) == 1 and not words.intersection({"hi", "hello", "hey", "thanks"}):
            return ScopeGuardResult(
                category=ScopeCategory.UNKNOWN,
                confidence=0.8,
                reason="Single unclassified word fallback",
                response_text=get_guard_response("UNKNOWN"),
            )

        return ScopeGuardResult(
            category=ScopeCategory.UNKNOWN,
            confidence=0.7,
            reason="Unrecognized intent fallback",
            response_text=get_guard_response("UNKNOWN"),
        )


# Singleton instance
_scope_classifier: Optional[ScopeClassifier] = None


def get_scope_guard() -> ScopeClassifier:
    """Return singleton ScopeClassifier instance."""
    global _scope_classifier
    if _scope_classifier is None:
        _scope_classifier = ScopeClassifier()
    return _scope_classifier
