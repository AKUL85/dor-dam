"""
scripts/entity_extractor.py
============================
Structured Entity Extractor for Mobile Phone RAG Queries.
Extracts domain-specific entities (budget, brand, AI features, hardware specs, personas, connectivity, etc.)
from natural language user queries and returns a structured JSON object.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ExtractedEntities(BaseModel):
    """Structured JSON model representing extracted entities from a user query."""
    model_config = ConfigDict(extra="allow", use_enum_values=True)

    budget: Optional[float] = Field(None, description="Extracted maximum budget in BDT")
    budget_min: Optional[float] = Field(None, description="Extracted minimum budget in BDT")
    brand: Optional[str] = Field(None, description="Primary brand name mentioned")
    brands: List[str] = Field(default_factory=list, description="All brand names mentioned")
    model: Optional[str] = Field(None, description="Primary model name mentioned")
    models: List[str] = Field(default_factory=list, description="All model names mentioned")
    
    # Domain-specific entities
    ai_feature: Optional[str] = Field(None, description="Extracted AI capability (e.g. galaxy_ai, gemini, apple_intelligence, magic_eraser, translation, on_device_ai)")
    camera_feature: Optional[str] = Field(None, description="Extracted camera capability (e.g. 100mp, 200mp, telephoto, zoom, low_light, selfie, vlogging, ois, prores_raw)")
    processor: Optional[str] = Field(None, description="Extracted processor/chipset (e.g. snapdragon, dimensity, exynos, bionic, tensor, mediatek)")
    battery_technology: Optional[str] = Field(None, description="Battery tech or capacity (e.g. 5000mah, 6000mah, silicon_carbon, long_standby)")
    software_support: Optional[str] = Field(None, description="Software/OS requirement (e.g. clean_android, bloatware_free, long_updates)")
    ecosystem: Optional[str] = Field(None, description="Ecosystem/accessory requirement (e.g. apple_ecosystem, smartwatch_pairing, magsafe, smart_home, earbuds_bundle)")
    travel: Optional[str] = Field(None, description="Travel/roaming requirement (e.g. international_roaming, unlocked)")
    resale: Optional[str] = Field(None, description="Resale value requirement (e.g. high_resale_value, 2_year_resale)")
    refurbished: Optional[str] = Field(None, description="Pre-owned / refurbished requirement (e.g. refurbished, certified_pre_owned, trade_in, second_hand)")
    sustainability: Optional[str] = Field(None, description="Sustainability requirement (e.g. eco_friendly, recycled_materials, user_replaceable_battery)")
    charging: Optional[str] = Field(None, description="Charging requirement (e.g. fast_charging, wireless_charging, 120w, 100w, 65w)")
    display_type: Optional[str] = Field(None, description="Display spec (e.g. amoled, curved, 120hz, 144hz, pwm_dimming, eye_comfort)")
    gaming: Optional[str] = Field(None, description="Gaming capability (e.g. cooling_system, triggers, esports_gaming, antutu_high)")
    persona: Optional[str] = Field(None, description="User persona (e.g. student, business, senior, kids, content_creator, driver, freelancer, musician, photographer, trader, e_commerce_seller)")
    waterproof_rating: Optional[str] = Field(None, description="Waterproof or durability rating (e.g. ip68, ip67, ip69k, rugged, drop_test_rated)")
    foldable: Optional[str] = Field(None, description="Foldable form factor (e.g. fold, flip, foldable)")
    stylus: Optional[bool] = Field(None, description="Stylus/S-Pen support flag")
    satellite: Optional[bool] = Field(None, description="Satellite connectivity flag")
    network: Optional[str] = Field(None, description="Network type (e.g. 5g, 4g, dual_5g)")
    esim: Optional[bool] = Field(None, description="eSIM support flag")
    isim: Optional[bool] = Field(None, description="iSIM support flag")
    wifi_version: Optional[str] = Field(None, description="Wi-Fi version (e.g. wifi_7, wifi_6e)")
    uwb: Optional[bool] = Field(None, description="Ultra-Wideband support flag")

    def to_dict(self) -> Dict[str, Any]:
        """Return clean dictionary excluding None and empty list values."""
        data = self.model_dump()
        return {k: v for k, v in data.items() if v is not None and (not isinstance(v, list) or len(v) > 0)}

    def to_json(self, indent: Optional[int] = None) -> str:
        """Return formatted structured JSON string."""
        return json.dumps(self.to_dict(), indent=indent)


class EntityExtractor:
    """Rule-based entity extraction engine for mobile phone queries."""

    KNOWN_BRANDS = {
        "apple": "Apple",
        "iphone": "Apple",
        "samsung": "Samsung",
        "galaxy": "Samsung",
        "xiaomi": "Xiaomi",
        "redmi": "Xiaomi",
        "poco": "Xiaomi",
        "realme": "Realme",
        "oneplus": "OnePlus",
        "nord": "OnePlus",
        "oppo": "Oppo",
        "vivo": "Vivo",
        "infinix": "Infinix",
        "tecno": "Tecno",
        "motorola": "Motorola",
        "moto": "Motorola",
        "google": "Google",
        "pixel": "Google",
        "nothing": "Nothing",
        "symphony": "Symphony"
    }

    MODEL_PATTERNS = [
        (r"\biphone\s*(17|16|15|14|13|12|11|se|pro|pro max)\b", "Apple"),
        (r"\b(galaxy\s*)?(s25|s24|s23|z fold\s*\d*|z flip\s*\d*|a\d{2}|m\d{2})\b", "Samsung"),
        (r"\bredmi\s*note\s*\d+\b", "Xiaomi"),
        (r"\bpoco\s*[f|x|m]\d+\b", "Xiaomi"),
        (r"\boneplus\s*(13|12|11|nord\s*\d*)\b", "OnePlus"),
        (r"\bnothing\s*phone\s*\d*\b", "Nothing")
    ]

    def __init__(self) -> None:
        pass

    def extract(self, query: str) -> ExtractedEntities:
        """Extract structured entities from user query text."""
        q_lower = query.lower()
        
        # 1. Budget extraction
        budget_max, budget_min = self._extract_budget(query, q_lower)

        # 2. Brand & Model extraction
        brands, models = self._extract_brands_and_models(query, q_lower)
        brand = brands[0] if brands else None
        model = models[0] if models else None

        # 3. AI Feature extraction
        ai_feature = self._extract_ai_feature(q_lower)

        # 4. Camera Feature extraction
        camera_feature = self._extract_camera_feature(q_lower)

        # 5. Processor extraction
        processor = self._extract_processor(q_lower)

        # 6. Battery Technology extraction
        battery_technology = self._extract_battery_tech(q_lower)

        # 7. Software Support extraction
        software_support = self._extract_software_support(q_lower)

        # 8. Ecosystem extraction
        ecosystem = self._extract_ecosystem(q_lower)

        # 9. Travel extraction
        travel = self._extract_travel(q_lower)

        # 10. Resale extraction
        resale = self._extract_resale(q_lower)

        # 11. Refurbished / Pre-owned extraction
        refurbished = self._extract_refurbished(q_lower)

        # 12. Sustainability extraction
        sustainability = self._extract_sustainability(q_lower)

        # 13. Charging extraction
        charging = self._extract_charging(q_lower)

        # 14. Display Type extraction
        display_type = self._extract_display_type(q_lower)

        # 15. Gaming extraction
        gaming = self._extract_gaming(q_lower)

        # 16. Persona extraction
        persona = self._extract_persona(q_lower)

        # 17. Waterproof Rating & Durability extraction
        waterproof_rating = self._extract_waterproof_rating(q_lower)

        # 18. Foldable form factor extraction
        foldable = self._extract_foldable(q_lower)

        # 19. Stylus / S-Pen extraction
        stylus = True if any(k in q_lower for k in ["stylus", "s pen", "s-pen"]) else None

        # 20. Satellite extraction
        satellite = True if "satellite" in q_lower else None

        # 21. Network extraction
        network = self._extract_network(q_lower)

        # 22. eSIM extraction
        esim = True if "esim" in q_lower else None

        # 23. iSIM extraction
        isim = True if "isim" in q_lower else None

        # 24. WiFi version extraction
        wifi_version = self._extract_wifi_version(q_lower)

        # 25. UWB extraction
        uwb = True if any(k in q_lower for k in ["uwb", "ultra-wideband", "ultra wideband"]) else None

        return ExtractedEntities(
            budget=budget_max,
            budget_min=budget_min,
            brand=brand,
            brands=brands,
            model=model,
            models=models,
            ai_feature=ai_feature,
            camera_feature=camera_feature,
            processor=processor,
            battery_technology=battery_technology,
            software_support=software_support,
            ecosystem=ecosystem,
            travel=travel,
            resale=resale,
            refurbished=refurbished,
            sustainability=sustainability,
            charging=charging,
            display_type=display_type,
            gaming=gaming,
            persona=persona,
            waterproof_rating=waterproof_rating,
            foldable=foldable,
            stylus=stylus,
            satellite=satellite,
            network=network,
            esim=esim,
            isim=isim,
            wifi_version=wifi_version,
            uwb=uwb
        )

    def _extract_budget(self, raw_query: str, q_lower: str) -> tuple[Optional[float], Optional[float]]:
        budget_max = None
        budget_min = None

        # USD pattern (e.g. $500 -> BDT conversion at 120 BDT/USD)
        usd_match = re.search(r"\$\s*(\d+)", raw_query)
        if usd_match:
            try:
                budget_max = float(usd_match.group(1)) * 120.0
                return budget_max, budget_min
            except ValueError:
                pass

        # "under 20000 taka", "under 30k", "below 50000"
        under_match = re.search(r"\b(?:under|below|around|less than|up to)\s*(\d+(?:\.\d+)?)\s*(k|thousand|taka|tk|bdt)?\b", q_lower)
        if under_match:
            val_str = under_match.group(1)
            multiplier = under_match.group(2)
            try:
                val = float(val_str)
                if multiplier and multiplier.lower() in ("k", "thousand") or val < 1000:
                    val *= 1000.0
                budget_max = val
            except ValueError:
                pass

        # Direct number pattern before taka/tk/bdt (e.g. 20000 taka)
        if budget_max is None:
            taka_match = re.search(r"\b(\d+)\s*(k)?\s*(taka|tk|bdt)\b", q_lower)
            if taka_match:
                try:
                    val = float(taka_match.group(1))
                    if taka_match.group(2) or val < 1000:
                        val *= 1000.0
                    budget_max = val
                except ValueError:
                    pass

        return budget_max, budget_min

    def _extract_brands_and_models(self, raw_query: str, q_lower: str) -> tuple[List[str], List[str]]:
        brands: List[str] = []
        models: List[str] = []
        brand_positions: Dict[str, int] = {}

        # Find brand names
        for k_brand, canonical in self.KNOWN_BRANDS.items():
            pos = q_lower.find(k_brand)
            if pos != -1:
                if canonical not in brand_positions or pos < brand_positions[canonical]:
                    brand_positions[canonical] = pos

        # Sort brands by appearance position in query
        sorted_brands = sorted(brand_positions.keys(), key=lambda b: brand_positions[b])

        # Find model patterns
        for pattern, canonical_brand in self.MODEL_PATTERNS:
            m = re.search(pattern, q_lower)
            if m:
                model_str = raw_query[m.start():m.end()].strip()
                if model_str and model_str not in models:
                    models.append(model_str)
                if canonical_brand not in sorted_brands:
                    sorted_brands.append(canonical_brand)

        return sorted_brands, models

    def _extract_ai_feature(self, q: str) -> Optional[str]:
        if "galaxy ai" in q:
            return "galaxy_ai"
        if "gemini" in q:
            return "gemini"
        if "apple intelligence" in q:
            return "apple_intelligence"
        if any(k in q for k in ["magic eraser", "object removal", "photo editing"]):
            return "magic_eraser"
        if "translation" in q or "translate" in q:
            return "translation"
        if any(k in q for k in ["on-device ai", "offline ai", "private ai"]):
            return "on_device_ai"
        if "ai" in q:
            return "ai_general"
        return None

    def _extract_camera_feature(self, q: str) -> Optional[str]:
        if "200mp" in q:
            return "200mp"
        if "100mp" in q:
            return "100mp"
        if "telephoto" in q:
            return "telephoto"
        if "zoom" in q or "10x" in q or "100x" in q:
            return "zoom"
        if any(k in q for k in ["low-light", "night photography", "night mode"]):
            return "low_light"
        if "selfie" in q:
            return "selfie"
        if any(k in q for k in ["vlogging", "vlog", "video recording"]):
            return "vlogging"
        if "ois" in q or "optical image stabilization" in q:
            return "ois"
        if any(k in q for k in ["prores", "log video", "raw video", "raw photo"]):
            return "prores_raw"
        if "camera" in q:
            return "camera_general"
        return None

    def _extract_processor(self, q: str) -> Optional[str]:
        if "snapdragon" in q:
            return "snapdragon"
        if "dimensity" in q:
            return "dimensity"
        if "exynos" in q:
            return "exynos"
        if "bionic" in q:
            return "bionic"
        if "tensor" in q:
            return "tensor"
        if "mediatek" in q or "helio" in q:
            return "mediatek"
        if "antutu" in q:
            return "antutu_high"
        return None

    def _extract_battery_tech(self, q: str) -> Optional[str]:
        if "silicon-carbon" in q or "silicon carbon" in q:
            return "silicon_carbon"
        if "6000mah" in q:
            return "6000mah"
        if "5000mah" in q:
            return "5000mah"
        if "standby" in q:
            return "long_standby"
        if "2-day battery" in q or "all-day battery" in q or "battery backup" in q:
            return "multi_day_endurance"
        return None

    def _extract_software_support(self, q: str) -> Optional[str]:
        if "clean android" in q or "no bloatware" in q:
            return "clean_android"
        if any(k in q for k in ["update support", "os guarantee", "software update"]):
            return "long_updates"
        return None

    def _extract_ecosystem(self, q: str) -> Optional[str]:
        if "apple ecosystem" in q or "mac" in q or "ipad" in q:
            return "apple_ecosystem"
        if "smartwatch" in q or "watch" in q:
            return "smartwatch_pairing"
        if "magsafe" in q or "magnetic" in q:
            return "magsafe"
        if "smart home" in q or "ir blaster" in q:
            return "smart_home"
        if "earbuds" in q or "bundled offer" in q:
            return "earbuds_bundle"
        return None

    def _extract_travel(self, q: str) -> Optional[str]:
        if any(k in q for k in ["international travel", "roaming", "travel"]):
            return "international_roaming"
        if "unlocked" in q:
            return "unlocked"
        return None

    def _extract_resale(self, q: str) -> Optional[str]:
        if "resale" in q or "depreciation" in q:
            return "high_resale_value"
        return None

    def _extract_refurbished(self, q: str) -> Optional[str]:
        if "refurbished" in q:
            return "refurbished"
        if "certified pre-owned" in q or "pre-owned" in q or "pre owned" in q:
            return "certified_pre_owned"
        if "second hand" in q or "used phone" in q:
            return "second_hand"
        if "trade-in" in q or "trade in" in q or "exchange" in q:
            return "trade_in"
        return None

    def _extract_sustainability(self, q: str) -> Optional[str]:
        if "eco-friendly" in q or "sustainable" in q:
            return "eco_friendly"
        if "recycled" in q:
            return "recycled_materials"
        if "user-replaceable" in q or "removable battery" in q:
            return "user_replaceable_battery"
        return None

    def _extract_charging(self, q: str) -> Optional[str]:
        if "wireless" in q:
            return "wireless_charging"
        if "120w" in q:
            return "120w"
        if "100w" in q:
            return "100w"
        if "65w" in q:
            return "65w"
        if "fast charging" in q or "fastest charging" in q or "fast charge" in q:
            return "fast_charging"
        return None

    def _extract_display_type(self, q: str) -> Optional[str]:
        if "amoled" in q:
            return "amoled"
        if "curved" in q:
            return "curved"
        if "144hz" in q:
            return "144hz"
        if "120hz" in q:
            return "120hz"
        if "pwm" in q:
            return "pwm_dimming"
        if "eye-comfort" in q or "low blue-light" in q or "reading" in q:
            return "eye_comfort"
        return None

    def _extract_gaming(self, q: str) -> Optional[str]:
        if "cooling" in q:
            return "cooling_system"
        if "triggers" in q or "shoulder buttons" in q:
            return "triggers"
        if "pubg" in q or "free fire" in q or "heavy gaming" in q:
            return "esports_gaming"
        if "gaming" in q:
            return "gaming_general"
        return None

    def _extract_persona(self, q: str) -> Optional[str]:
        if "student" in q or "students" in q:
            return "student"
        if "business" in q:
            return "business"
        if "elderly" in q or "senior" in q:
            return "senior"
        if "kids" in q or "children" in q:
            return "kids"
        if any(k in q for k in ["content creator", "vlogger", "youtuber", "reels"]):
            return "content_creator"
        if "driver" in q or "ride-share" in q or "delivery" in q:
            return "driver"
        if "freelancer" in q:
            return "freelancer"
        if "musician" in q:
            return "musician"
        if "photographer" in q:
            return "photographer"
        if "trading" in q or "trader" in q:
            return "trader"
        if "e-commerce" in q or "seller" in q:
            return "e_commerce_seller"
        return None

    def _extract_waterproof_rating(self, q: str) -> Optional[str]:
        if "ip69" in q or "ip69k" in q:
            return "ip69k"
        if "ip68" in q:
            return "ip68"
        if "ip67" in q:
            return "ip67"
        if "rugged" in q or "outdoor" in q:
            return "rugged"
        if "drop-test" in q or "durable" in q or "durability" in q:
            return "drop_test_rated"
        return None

    def _extract_foldable(self, q: str) -> Optional[str]:
        if "flip" in q:
            return "flip"
        if "fold" in q or "foldable" in q:
            return "foldable"
        return None

    def _extract_network(self, q: str) -> Optional[str]:
        if "dual-sim 5g" in q or "dual 5g" in q:
            return "dual_5g"
        if "5g" in q:
            return "5g"
        if "4g" in q:
            return "4g"
        return None

    def _extract_wifi_version(self, q: str) -> Optional[str]:
        if "wifi 7" in q or "wi-fi 7" in q:
            return "wifi_7"
        if "wifi 6e" in q or "wi-fi 6e" in q:
            return "wifi_6e"
        return None


def get_default_entity_extractor() -> EntityExtractor:
    """Factory helper returning default EntityExtractor instance."""
    return EntityExtractor()
