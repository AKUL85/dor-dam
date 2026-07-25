"""
intent_classifier.py
====================

An intent classification and structured extraction module for phone queries.
Supports rule-based heuristics, hosted LLM APIs (Gemini/OpenAI), and automatic fallback.
"""

from __future__ import annotations

import abc
import json
import logging
import os
import re
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import requests
from pydantic import BaseModel, ConfigDict, Field

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("intent_classifier")


# ──────────────────────────────────────────────────────────────────────
# Pydantic Schema
# ──────────────────────────────────────────────────────────────────────

class IntentType(str, Enum):
    """Supported intent categories for user queries."""
    RECOMMENDATION = "recommendation"
    COMPARISON = "comparison"
    PRICE_LOOKUP = "price_lookup"
    AVAILABILITY = "availability"
    SPECIFICATION = "specification"
    REVIEW = "review"
    GENERAL = "general"
    MIXED = "mixed"
    # Extended intents for new capabilities
    LIFECYCLE_ADVISORY = "lifecycle_advisory"
    RESALE_TRADEIN = "resale_tradein"
    DEALS_FINANCING = "deals_financing"



from entity_extractor import ExtractedEntities, EntityExtractor


class ExtractedInfo(BaseModel):
    """Structured information extracted from a user query."""
    model_config = ConfigDict(
        extra="allow",
        use_enum_values=True,
    )

    intent: IntentType = Field(
        ..., 
        description="The primary classified intent of the user query."
    )
    budget: Optional[float] = Field(
        None, 
        description="Extracted maximum budget in BDT (if any)."
    )
    budget_min: Optional[float] = Field(
        None, 
        description="Extracted minimum budget in BDT (if any)."
    )
    priority: Optional[str] = Field(
        None, 
        description="User's primary focus or requirement (e.g. 'camera', 'gaming', 'battery')."
    )
    brand: Optional[str] = Field(
        None, 
        description="Primary brand name mentioned in the query."
    )
    brands: List[str] = Field(
        default_factory=list, 
        description="All brand names mentioned in the query."
    )
    model: Optional[str] = Field(
        None, 
        description="Primary model name mentioned in the query."
    )
    models: List[str] = Field(
        default_factory=list, 
        description="All model names mentioned in the query."
    )
    spec_fields: List[str] = Field(
        default_factory=list, 
        description="Specific spec fields the user is interested in."
    )
    entities: Optional[ExtractedEntities] = Field(
        None,
        description="Comprehensive structured entities extracted from query."
    )
    raw_query: str = Field(
        ..., 
        description="The original user query."
    )
    confidence: float = Field(
        1.0, 
        description="Confidence score of the classification (between 0.0 and 1.0)."
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Additional context, scores, or intermediate parser data."
    )


# ──────────────────────────────────────────────────────────────────────
# Constants & Helper Functions
# ──────────────────────────────────────────────────────────────────────

KNOWN_BRANDS_DEFAULT = {
    "apple", "samsung", "xiaomi", "redmi", "realme", "oneplus",
    "oppo", "vivo", "infinix", "tecno", "motorola", "google", "nothing"
}

BRAND_PREFIX_MAP = {
    "iphone": "Apple",
    "ipad": "Apple",
    "galaxy": "Samsung",
    "redmi": "Xiaomi",
    "poco": "Xiaomi",
    "pixel": "Google",
    "nord": "OnePlus",
}

PRIORITY_MAP = {
    "camera": ["camera", "photo", "photography", "selfie", "lens", "video", "recording", "zoom", "megapixel", "mp", "vlogging", "vlog", "telephoto", "low-light", "night", "prores", "raw"],
    "gaming": ["gaming", "game", "pubg", "freefire", "lag-free", "gpu", "graphics", "antutu", "cooling", "triggers"],
    "battery": ["battery", "backup", "charging", "charger", "mah", "life", "standby", "silicon-carbon"],
    "display": ["display", "screen", "amoled", "refresh rate", "hz", "oled", "brightness", "size", "curved", "pwm"],
    "storage": ["storage", "rom", "space", "memory", "expandable", "sd card"],
    "build": ["build", "look", "design", "color", "pretty", "beautiful", "thin", "lightweight", "durable", "waterproof", "ip68", "ip67", "glass", "armor", "rugged", "titanium", "compact", "matte"],
    "value": ["cheap", "value", "affordable", "cheapest", "low cost", "value-for-money"],
    "ai": ["ai", "galaxy ai", "gemini", "apple intelligence", "magic eraser", "translation", "on-device ai", "artificial intelligence"],
    "connectivity": ["esim", "isim", "wifi 7", "wi-fi 7", "satellite", "uwb", "roaming", "5g"],
    "audio": ["stereo speakers", "dolby atmos", "headphone jack", "3.5mm", "mic quality", "musician"],
    "foldable": ["foldable", "fold", "flip", "hinge", "crease"],
    "persona": ["student", "students", "business", "elderly", "senior", "kids", "vlogger", "content creator", "photographer", "musician", "driver", "trading", "freelancer", "e-commerce"]
}

SPEC_KEYWORDS = {
    "processor": ["processor", "cpu", "chipset", "soc", "snapdragon", "exynos", "mediatek", "helio", "dimensity", "bionic", "tensor"],
    "ram": ["ram", "memory"],
    "storage": ["storage", "rom", "internal", "expandable", "sd card"],
    "display": ["display", "screen", "amoled", "oled", "lcd", "refresh rate", "hz", "resolution", "curved", "pwm"],
    "camera": ["camera", "megapixels", "mp", "selfie", "lens", "zoom", "sensor", "telephoto", "ois", "vlogging", "prores", "raw"],
    "battery": ["battery", "mah", "charging", "charger", "wireless charging", "silicon-carbon", "standby"],
    "os": ["os", "android", "ios", "operating system", "update", "updates", "bloatware", "clean android"],
    "network": ["network", "5g", "4g", "lte", "sim", "esim", "isim", "wifi 7", "satellite", "uwb"],
}


def capitalize_brand(brand: str) -> str:
    """Standardize brand name capitalizations."""
    brand_map = {
        "apple": "Apple",
        "samsung": "Samsung",
        "xiaomi": "Xiaomi",
        "redmi": "Redmi",
        "realme": "Realme",
        "oneplus": "OnePlus",
        "oppo": "Oppo",
        "vivo": "Vivo",
        "infinix": "Infinix",
        "tecno": "Tecno",
        "motorola": "Motorola",
        "google": "Google",
        "nothing": "Nothing",
    }
    return brand_map.get(brand.lower(), brand.capitalize())


def has_word(text: str, keywords: List[str]) -> bool:
    """Check if any of the keywords are present in the text as whole words or exact phrases."""
    for kw in keywords:
        if " " in kw:
            # Phrase check
            if kw in text:
                return True
        else:
            # Word boundary check
            if re.search(rf'\b{re.escape(kw)}\b', text):
                return True
    return False


# ──────────────────────────────────────────────────────────────────────
# Classifier Interfaces & Implementations
# ──────────────────────────────────────────────────────────────────────

class BaseIntentClassifier(abc.ABC):
    """Abstract base class for all intent classifiers."""

    @abc.abstractmethod
    def classify(self, query: str) -> ExtractedInfo:
        """Classify a query and extract entities into ExtractedInfo schema."""
        pass


class RuleBasedClassifier(BaseIntentClassifier):
    """A rules and keyword-based classifier that executes entirely offline."""

    def __init__(self, data_path: Optional[str] = None) -> None:
        self.known_brands = set(KNOWN_BRANDS_DEFAULT)
        self.known_models = set()

        # Load known models from catalog if available
        path = Path(data_path or "processed/merged_phones.json")
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for item in data:
                            brand = item.get("brand")
                            name = item.get("name")
                            if brand:
                                self.known_brands.add(brand.lower().strip())
                            if name:
                                n_lower = name.lower().strip()
                                self.known_models.add(n_lower)
                                # Clean names for substring matching
                                cleaned = re.sub(r'[\(\[\{].*?[\)\]\}]', '', n_lower)
                                cleaned = re.sub(r'\b(?:5g|4g|lte)\b', '', cleaned)
                                cleaned = re.sub(r'\s+', ' ', cleaned).strip()
                                if cleaned:
                                    self.known_models.add(cleaned)
                logger.info("Loaded %d models from %s", len(self.known_models), path.name)
            except Exception as e:
                logger.warning("Could not build models catalog from merged_phones.json: %s", e)

    def _extract_budget(self, query: str) -> Tuple[Optional[float], Optional[float]]:
        """Extract max and min budget values in BDT."""
        q = query.lower()

        # 1. Budget ranges: "between 20k and 30k", "20000 - 30000"
        range_match = re.search(
            r'\b(?:between\s+)?(\d+(?:\.\d+)?)\s*(?:k|thousand)?\s*(?:and|to|-)\s*(\d+(?:\.\d+)?)\s*(?:k|thousand)?\b',
            q
        )
        if range_match:
            val1_str, val2_str = range_match.groups()
            val1 = float(val1_str)
            val2 = float(val2_str)
            match_idx = range_match.start()
            full_match = range_match.group(0)

            if "k" in q[match_idx : match_idx + len(val1_str) + 5] or val1 < 1000:
                val1 *= 1000
            if "k" in q[match_idx + len(val1_str) : match_idx + len(full_match) + 5] or val2 < 1000:
                val2 *= 1000

            return max(val1, val2), min(val1, val2)

        # 2. Maximum limits: "under 35000", "below 30k"
        max_match = re.search(
            r'\b(?:under|below|less\s+than|within|max(?:imum)?|upto|up\s+to|cheap(?:er)?\s+than)\s*(\d+(?:\.\d+)?)\s*(k|thousand)?\b',
            q
        )
        if max_match:
            val = float(max_match.group(1))
            suffix = max_match.group(2)
            if suffix == 'k' or val < 1000:
                val *= 1000
            return val, None

        # 3. Minimum limits: "above 20000", "starting from 15k"
        min_match = re.search(
            r'\b(?:above|over|more\s+than|min(?:imum)?|start(?:ing)?\s+from)\s*(\d+(?:\.\d+)?)\s*(k|thousand)?\b',
            q
        )
        if min_match:
            val = float(min_match.group(1))
            suffix = min_match.group(2)
            if suffix == 'k' or val < 1000:
                val *= 1000
            return None, val

        # 4. Standalone values: "35k", "35000"
        standalone_k = re.search(r'\b(\d+(?:\.\d+)?)\s*(k|thousand)\b', q)
        if standalone_k:
            return float(standalone_k.group(1)) * 1000, None

        standalone_large = re.search(r'\b(\d{4,6})\b', q)
        if standalone_large:
            return float(standalone_large.group(1)), None

        return None, None

    def _extract_priority(self, query: str) -> Optional[str]:
        """Extract priority indicator keyword."""
        q = query.lower()
        for priority, keywords in PRIORITY_MAP.items():
            if has_word(q, keywords):
                return priority
        return None

    def _extract_brands_and_models(self, query: str) -> Tuple[List[str], List[str]]:
        """Extract matched brand names and phone models from the query."""
        q = query.lower()
        found_brands = []
        found_models = []

        # Brands
        for b in sorted(self.known_brands, key=len, reverse=True):
            if re.search(rf'\b{b}\b', q):
                found_brands.append(capitalize_brand(b))

        # Models (match longest models first to prevent partial matches)
        for m in sorted(self.known_models, key=len, reverse=True):
            if len(m) >= 3 and re.search(rf'\b{re.escape(m)}\b', q):
                if not any(m in existing.lower() for existing in found_models):
                    found_models.append(m.title())

        # Regex fallback for model numbers if catalog lookup returns nothing
        if not found_models:
            patterns = [
                r'\b(?:iphone|galaxy|note|poco|mi|pixel|nord|reno|v|y|zero|hot|spark|camon)\s+\d+[a-z]*\s*(?:pro|max|plus|ultra|fe|flip|fold)?\b',
                r'\b[a-z]\d{2,3}[a-z]?\b',
            ]
            for pat in patterns:
                for match in re.finditer(pat, q):
                    m_text = match.group(0).strip()
                    if m_text and m_text not in [b.lower() for b in found_brands]:
                        found_models.append(m_text.title())

        return found_brands, found_models

    def classify(self, query: str) -> ExtractedInfo:
        q = query.lower().strip()

        brands, models = self._extract_brands_and_models(query)
        budget_max, budget_min = self._extract_budget(query)
        priority = self._extract_priority(query)

        spec_fields = []
        for field_name, keywords in SPEC_KEYWORDS.items():
            if has_word(q, keywords):
                spec_fields.append(field_name)

        intent_scores = {intent: 0 for intent in IntentType}

        # Rules for recommendation
        rec_kws = ["best", "recommend", "suggest", "suggestion", "good", "top", "pick", "purchase", "choose"]
        if "where to buy" not in q and "where can i buy" not in q:
            rec_kws.append("buy")
        if has_word(q, rec_kws) or budget_max is not None or budget_min is not None or (priority is not None and not models):
            intent_scores[IntentType.RECOMMENDATION] += 3 if has_word(q, rec_kws) else 2

        # Rules for comparison
        comp_kws = ["vs", "versus", "compare", "comparison", "difference", "better", "alternative"]
        if has_word(q, comp_kws) or len(models) >= 2 or len(brands) >= 2:
            intent_scores[IntentType.COMPARISON] += 4 if has_word(q, comp_kws) else 3

        # Rules for price lookup (currency words alone when budget is present do not count as price lookup)
        explicit_price_kws = ["price", "cost", "how much", "rate", "worth"]
        if has_word(q, explicit_price_kws) or (has_word(q, ["tk", "taka", "bdt", "cheap"]) and budget_max is None):
            intent_scores[IntentType.PRICE_LOOKUP] += 2

        # Rules for availability ("where to buy" is availability, but plain "buy" is recommendation)
        avail_kws = ["available", "stock", "in stock", "where to buy", "shop", "store", "delivery"]
        if has_word(q, avail_kws) or "where to buy" in q:
            intent_scores[IntentType.AVAILABILITY] += 3 if "where to buy" in q or "in stock" in q else 2

        # Rules for specifications
        spec_kws = ["spec", "specs", "specification", "specifications", "feature", "features", "details"]
        if has_word(q, spec_kws) or (spec_fields and not (has_word(q, rec_kws) or budget_max is not None)):
            intent_scores[IntentType.SPECIFICATION] += 2

        # Rules for reviews
        rev_kws = ["review", "verdict", "rating", "opinion", "worth buying", "good or bad", "pros and cons", "experience"]
        if has_word(q, rev_kws):
            intent_scores[IntentType.REVIEW] += 3

        # Rules for lifecycle advisory
        lifecycle_kws = ["upcoming", "launch in", "launching", "wait or buy", "should i wait", "upgrade from", "next flagship", "future phone", "upcoming phones", "release date", "launch date"]
        if has_word(q, lifecycle_kws) or ("wait" in q and "buy" in q) or ("upgrade" in q and "year" in q) or "upcoming" in q:
            intent_scores[IntentType.LIFECYCLE_ADVISORY] += 5

        # Rules for resale & trade-in
        resale_kws = ["resale", "resale value", "refurbished", "pre-owned", "pre owned", "trade-in", "trade in", "exchange old", "second hand", "used phone", "depreciation", "sell old"]
        if has_word(q, resale_kws) or "resale" in q or "trade-in" in q or "refurbished" in q or "pre-owned" in q:
            intent_scores[IntentType.RESALE_TRADEIN] += 4

        # Rules for deals & financing
        deals_kws = ["emi", "installment", "installments", "warranty", "after-sales", "after sales", "eid sale", "black friday", "daraz sale", "discount", "deal", "deals", "offer", "offers", "bank offer"]
        if has_word(q, deals_kws):
            intent_scores[IntentType.DEALS_FINANCING] += 4

        # Rules for general conversational greetings
        gen_kws = ["hello", "hi", "hey", "greetings", "who are you", "what can you do", "help", "thank", "thanks"]
        if any(q.startswith(kw) for kw in gen_kws) or len(q.split()) <= 2:
            intent_scores[IntentType.GENERAL] += 1

        active_intents = [intent for intent, score in intent_scores.items() if score > 0]

        if not active_intents:
            primary_intent = IntentType.GENERAL
            confidence = 0.5
        else:
            sorted_intents = sorted(intent_scores.items(), key=lambda x: x[1], reverse=True)
            top_intent, top_score = sorted_intents[0]
            
            if len(sorted_intents) > 1:
                second_intent, second_score = sorted_intents[1]
                # Flag as Mixed only if top two intents are equal and both >= 2
                if top_score == second_score and top_score >= 2:
                    primary_intent = IntentType.MIXED
                else:
                    primary_intent = top_intent
            else:
                primary_intent = top_intent

            confidence = min(0.5 + 0.1 * top_score, 0.90)

        # Infer brands from all matched models
        for m in models:
            m_lower = m.lower()
            for prefix, b_name in BRAND_PREFIX_MAP.items():
                if m_lower.startswith(prefix) or prefix in m_lower:
                    if b_name not in brands:
                        brands.append(b_name)

        primary_brand = brands[0] if brands else None
        primary_model = models[0] if models else None

        # Extract comprehensive domain entities
        extracted_entities = EntityExtractor().extract(query)

        metadata = {
            "all_extracted_intents": [intent.value for intent in active_intents],
            "scores": {k.value: v for k, v in intent_scores.items() if v > 0},
            "entities": extracted_entities.to_dict()
        }

        return ExtractedInfo(
            intent=primary_intent,
            budget=budget_max,
            budget_min=budget_min,
            priority=priority,
            brand=primary_brand,
            brands=brands,
            model=primary_model,
            models=models,
            spec_fields=spec_fields,
            entities=extracted_entities,
            raw_query=query,
            confidence=confidence,
            metadata=metadata
        )


class LLMBasedClassifier(BaseIntentClassifier):
    """An API-based classifier that extracts entities using Gemini or OpenAI APIs."""

    SYSTEM_PROMPT = (
        "You are an NLU classifier for a mobile phone finder service in Bangladesh.\n"
        "Analyze the user query, classify its primary intent, and extract structural information.\n"
        "Intents must be one of: 'recommendation', 'comparison', 'price_lookup', 'availability', "
        "'specification', 'review', 'general', 'mixed', 'lifecycle_advisory', 'resale_tradein', 'deals_financing'.\n"
        "Convert budget shortcuts like '35k' or '30 thousand' to absolute numeric values in BDT (e.g. 35000).\n"
        "Return a valid JSON object matching the requested schema."
    )

    def __init__(
        self, 
        provider: str = "gemini", 
        api_key: Optional[str] = None, 
        model_name: Optional[str] = None
    ) -> None:
        self.provider = provider.lower()
        
        if self.provider == "gemini":
            self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            self.model_name = model_name or "gemini-2.5-flash"
        elif self.provider == "openai":
            self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
            self.model_name = model_name or "gpt-4o-mini"
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

        if not self.api_key:
            raise RuntimeError(f"Missing API key for provider '{self.provider}'.")

    def classify(self, query: str) -> ExtractedInfo:
        if self.provider == "gemini":
            return self._call_gemini(query)
        else:
            return self._call_openai(query)

    def _call_gemini(self, query: str) -> ExtractedInfo:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        
        schema = {
            "type": "OBJECT",
            "properties": {
                "intent": {
                    "type": "STRING",
                    "enum": ["recommendation", "comparison", "price_lookup", "availability", "specification", "review", "general", "mixed", "lifecycle_advisory", "resale_tradein", "deals_financing"]
                },
                "budget": {"type": "NUMBER"},
                "budget_min": {"type": "NUMBER"},
                "priority": {"type": "STRING"},
                "brand": {"type": "STRING"},
                "brands": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"}
                },
                "model": {"type": "STRING"},
                "models": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"}
                },
                "spec_fields": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"}
                },
                "confidence": {"type": "NUMBER"}
            },
            "required": ["intent"]
        }

        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"System Prompt: {self.SYSTEM_PROMPT}\nUser Query: {query}"}]}
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": schema
            }
        }

        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        
        result_json = resp.json()
        text_content = result_json["candidates"][0]["content"]["parts"][0]["text"]
        
        parsed = json.loads(text_content)
        parsed["raw_query"] = query
        if "confidence" not in parsed:
            parsed["confidence"] = 0.95
        
        return ExtractedInfo(**parsed)

    def _call_openai(self, query: str) -> ExtractedInfo:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        schema = {
            "name": "extracted_info",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "intent": {
                        "type": "string",
                        "enum": ["recommendation", "comparison", "price_lookup", "availability", "specification", "review", "general", "mixed", "lifecycle_advisory", "resale_tradein", "deals_financing"]
                    },
                    "budget": {"type": ["number", "null"]},
                    "budget_min": {"type": ["number", "null"]},
                    "priority": {"type": ["string", "null"]},
                    "brand": {"type": ["string", "null"]},
                    "brands": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "model": {"type": ["string", "null"]},
                    "models": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "spec_fields": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "confidence": {"type": "number"}
                },
                "required": ["intent", "budget", "budget_min", "priority", "brand", "brands", "model", "models", "spec_fields", "confidence"]
            }
        }

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": query}
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": schema
            }
        }

        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()

        result_json = resp.json()
        text_content = result_json["choices"][0]["message"]["content"]

        parsed = json.loads(text_content)
        parsed["raw_query"] = query
        return ExtractedInfo(**parsed)


class HybridClassifier(BaseIntentClassifier):
    """Orchestrates query classification, utilizing LLMs if keys exist, falling back to heuristics."""

    def __init__(self, data_path: Optional[str] = None) -> None:
        self.offline_classifier = RuleBasedClassifier(data_path=data_path)
        self.llm_classifier: Optional[LLMBasedClassifier] = None

        # Auto-detect API keys
        gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        openai_key = os.environ.get("OPENAI_API_KEY")

        if gemini_key:
            try:
                self.llm_classifier = LLMBasedClassifier(provider="gemini", api_key=gemini_key)
                logger.info("Hybrid classifier initialized with Gemini API.")
            except Exception as e:
                logger.warning("Failed to initialize Gemini classifier: %s", e)
        elif openai_key:
            try:
                self.llm_classifier = LLMBasedClassifier(provider="openai", api_key=openai_key)
                logger.info("Hybrid classifier initialized with OpenAI API.")
            except Exception as e:
                logger.warning("Failed to initialize OpenAI classifier: %s", e)
        else:
            logger.info("No API keys found. Defaulting strictly to rule-based classification.")

    def classify(self, query: str) -> ExtractedInfo:
        if self.llm_classifier:
            try:
                logger.debug("Attempting LLM-based classification...")
                result = self.llm_classifier.classify(query)
                # Attach indicator in metadata
                result.metadata["classifier_source"] = f"llm_{self.llm_classifier.provider}"
                return result
            except Exception as e:
                logger.error("LLM classification failed (falling back to rule-based): %s", e)
        
        result = self.offline_classifier.classify(query)
        result.metadata["classifier_source"] = "heuristics"
        return result


# ──────────────────────────────────────────────────────────────────────
# Factory Helper
# ──────────────────────────────────────────────────────────────────────

def get_default_classifier(data_path: Optional[str] = None) -> BaseIntentClassifier:
    """Helper factory to retrieve the configured hybrid intent classifier."""
    return HybridClassifier(data_path=data_path)


# Backward compatibility alias
IntentClassifier = HybridClassifier


# ──────────────────────────────────────────────────────────────────────
# Command-Line Interface
# ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python3 intent_classifier.py '<user query>'")
        sys.exit(1)

    query_text = sys.argv[1]
    classifier = get_default_classifier()
    extracted = classifier.classify(query_text)
    
    # Print clean formatted JSON to console
    print(extracted.model_dump_json(indent=2))
