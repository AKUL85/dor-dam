"""
scripts/recommend/engine.py
===========================

SQL-first phone recommendation engine logic.
Applies budget, brand, and specification filters via PostgreSQL first,
then ranks candidates using deterministic scoring functions for 7 key priorities.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.config import load_settings
from db.models import Phone
from db.session import engine as build_engine, session_scope
from intent_classifier import ExtractedInfo
from recommend import extractors as ex
from recommend.scorers import PhoneFeatures, score_for
_extract_top_mp = ex.extract_top_mp
_extract_refresh_hz = ex.extract_refresh_hz
_extract_peak_nits = ex.extract_peak_nits
_extract_ram_gb = ex.extract_ram_gb
_extract_mah = ex.extract_mah
_extract_watt = ex.extract_watt
extract_top_mp = _extract_top_mp
extract_refresh_hz = _extract_refresh_hz
extract_peak_nits = _extract_peak_nits
extract_ram_gb = _extract_ram_gb
extract_mah = _extract_mah
extract_watt = _extract_watt

logger = logging.getLogger("recommend.engine")


# ──────────────────────────────────────────────────────────────────────
# Data Models
# ──────────────────────────────────────────────────────────────────────

class RecommendationQuery(BaseModel):
    """Refined input parameters for the recommendation engine."""
    query_text: str = Field(..., description="Original query string.")
    intent: Optional[str] = Field(None, description="Classified intent.")
    budget_min: Optional[float] = Field(None, description="Minimum price limit in BDT.")
    budget_max: Optional[float] = Field(None, description="Maximum price limit in BDT.")
    brand: Optional[str] = Field(None, description="Brand filter.")
    priorities: List[str] = Field(default_factory=list, description="Ordered priority dimensions.")
    limit: int = Field(10, description="Max results to return.")

    @classmethod
    def from_extracted(cls, info: ExtractedInfo, limit: int = 10) -> RecommendationQuery:
        """Map raw ExtractedInfo from IntentClassifier to recommendation parameters."""
        raw_priorities = []
        if info.priority:
            raw_priorities.append(info.priority)
        for sf in info.spec_fields:
            if sf not in raw_priorities:
                raw_priorities.append(sf)

        # Map general specs fields to supported recommendation priorities
        # Supported: camera, gaming, battery, performance, display, charging, value
        priority_mapping = {
            "processor": "performance",
            "ram": "performance",
            "storage": "performance",
            "display": "display",
            "camera": "camera",
            "battery": "battery",
            "charging": "charging",
            "os": "performance",
            "network": "performance"
        }

        mapped_priorities = []
        for p in raw_priorities:
            mapped = priority_mapping.get(p.lower(), p.lower())
            if mapped in {"camera", "gaming", "battery", "performance", "display", "charging", "value"}:
                if mapped not in mapped_priorities:
                    mapped_priorities.append(mapped)

        if not mapped_priorities and info.priority:
            p_lower = info.priority.lower()
            if p_lower in {"camera", "gaming", "battery", "performance", "display", "charging", "value"}:
                mapped_priorities.append(p_lower)

        return cls(
            query_text=info.raw_query,
            intent=info.intent,
            budget_min=info.budget_min,
            budget_max=info.budget,
            brand=info.brand,
            priorities=mapped_priorities,
            limit=limit,
        )


class RecommendationResult(BaseModel):
    """A ranked phone recommendation containing detailed score break downs."""
    rank: int
    phone_id: int
    brand: str
    name: str
    category: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    score: float
    score_breakdown: Dict[str, float]
    reason: str


# ──────────────────────────────────────────────────────────────────────
# Processor scoring maps
# ──────────────────────────────────────────────────────────────────────

def get_cpu_tier_score(proc_text: Optional[str]) -> float:
    """Assess processor quality based on known CPU model substrings."""
    if not proc_text:
        return 0.3
    text = proc_text.lower()

    # Flagship processors
    flagship_kws = ["snapdragon 8", "a17", "a18", "a19", "dimensity 9", "tensor g4", "tensor g3"]
    if any(kw in text for kw in flagship_kws):
        return 1.0

    # High end
    high_kws = ["snapdragon 7+ gen", "a15", "a16", "dimensity 8", "tensor g2", "tensor g1", "snapdragon 888", "snapdragon 870"]
    if any(kw in text for kw in high_kws):
        return 0.8

    # Mid range
    mid_kws = ["snapdragon 6", "snapdragon 7", "dimensity 7", "dimensity 6", "helio g99", "helio g96", "unisoc t618"]
    if any(kw in text for kw in mid_kws):
        return 0.6

    # Entry level
    entry_kws = ["helio g85", "helio g35", "helio p35", "unisoc t606", "helio g88", "helio g80"]
    if any(kw in text for kw in entry_kws):
        return 0.4

    return 0.5


# ──────────────────────────────────────────────────────────────────────
# Specific Priority Scoring Heuristics
# ──────────────────────────────────────────────────────────────────────

def score_camera(phone: Phone) -> float:
    text = (phone.camera_text or "").lower()
    mp = extract_top_mp(phone.camera_text) or 12
    score = min(mp / 108.0, 0.7)  # up to 0.7 for high megapixels
    if "ois" in text or "optical image stabilization" in text or "sensor-shift" in text:
        score += 0.15
    if "telephoto" in text or "zoom" in text or "periscope" in text:
        score += 0.10
    if "ultrawide" in text or "ultra-wide" in text:
        score += 0.05
    return min(score, 1.0)


def score_gaming(phone: Phone) -> float:
    ram = phone.ram_gb or extract_ram_gb(phone.name) or 6
    ram_score = min(ram / 16.0, 1.0)
    cpu_score = get_cpu_tier_score(phone.processor_text)

    text = (phone.display_text or "").lower()
    hz = extract_refresh_hz(phone.display_text) or 60
    hz_score = 0.2 if hz >= 120 else (0.1 if hz >= 90 else 0.0)

    score = cpu_score * 0.5 + ram_score * 0.3 + hz_score
    return min(score, 1.0)


def score_battery(phone: Phone) -> float:
    mah = phone.battery_mah or extract_mah(phone.battery_text) or 5000
    return min(mah / 6000.0, 1.0)


def score_performance(phone: Phone) -> float:
    ram = phone.ram_gb or extract_ram_gb(phone.name) or 6
    ram_score = min(ram / 16.0, 1.0)
    cpu_score = get_cpu_tier_score(phone.processor_text)
    storage = phone.storage_gb or 128
    storage_score = min(storage / 512.0, 1.0)

    score = cpu_score * 0.5 + ram_score * 0.3 + storage_score * 0.2
    return min(score, 1.0)


def score_display(phone: Phone) -> float:
    text = (phone.display_text or "").lower()
    score = 0.0
    if "amoled" in text or "oled" in text:
        score += 0.4
    else:
        score += 0.15

    hz = extract_refresh_hz(phone.display_text) or 60
    if hz >= 120:
        score += 0.3
    elif hz >= 90:
        score += 0.15

    nits = extract_peak_nits(phone.display_text) or 500
    if nits >= 2000:
        score += 0.3
    elif nits >= 1000:
        score += 0.15
    elif nits >= 600:
        score += 0.08

    return min(score, 1.0)


def score_charging(phone: Phone) -> float:
    watt = phone.charging_w or extract_watt(phone.battery_text) or 18
    return min(watt / 120.0, 1.0)


def score_value(phone: Phone) -> float:
    ram = phone.ram_gb or extract_ram_gb(phone.name) or 6
    storage = phone.storage_gb or 128
    battery_mah = phone.battery_mah or 5000
    price = phone.price_min or 20000

    ram_score = min(ram / 16.0, 1.0)
    storage_score = min(storage / 512.0, 1.0)
    cpu_score = get_cpu_tier_score(phone.processor_text)
    battery_score = min(battery_mah / 6000.0, 1.0)

    specs_index = ram_score * 0.25 + storage_score * 0.25 + cpu_score * 0.25 + battery_score * 0.25
    price_factor = max(price, 5000) / 30000.0
    value_score = specs_index / price_factor
    return min(value_score, 1.0)


# ──────────────────────────────────────────────────────────────────────
# Reason Generation
# ──────────────────────────────────────────────────────────────────────

def generate_reason(phone: Phone, score_breakdown: Dict[str, float], priorities: List[str]) -> str:
    parts = []
    
    # 1. Price Context
    if phone.price_min:
        parts.append(f"Priced at {int(phone.price_min):,} BDT")

    # 2. Priorities strengths
    if priorities:
        matched_strengths = []
        for p in priorities:
            p_score = score_breakdown.get(p, 0.0)
            if p_score >= 0.7:
                matched_strengths.append(f"excellent {p} (score: {p_score:.2f})")
            elif p_score >= 0.5:
                matched_strengths.append(f"good {p} (score: {p_score:.2f})")
        if matched_strengths:
            parts.append("delivers " + " and ".join(matched_strengths))

    # 3. Hardware highlights
    highlights = []
    ram = phone.ram_gb or extract_ram_gb(phone.name)
    if ram and phone.storage_gb:
        highlights.append(f"{ram}GB RAM / {phone.storage_gb}GB Storage")
    if phone.processor_text and "unknown" not in phone.processor_text.lower():
        proc = phone.processor_text.split("(")[0].strip()
        highlights.append(proc)
    if phone.battery_mah:
        highlights.append(f"{phone.battery_mah}mAh battery")

    if highlights:
        parts.append("features " + ", ".join(highlights))

    reason = ", ".join(parts) + "."
    return reason[0].upper() + reason[1:]


# ──────────────────────────────────────────────────────────────────────
# Candidate Filter & Scorer
# ──────────────────────────────────────────────────────────────────────

class FilterEngine:
    """Handles PostgreSQL filtering of phone candidate rows."""

    @staticmethod
    def filter_candidates(session: Session, query: RecommendationQuery) -> List[Phone]:
        stmt = select(Phone).where(Phone.price_min > 0)

        # Apply Brand Filter
        if query.brand:
            stmt = stmt.where(Phone.brand.ilike(query.brand.strip()))

        # Apply Budget limits
        if query.budget_max is not None:
            stmt = stmt.where(Phone.price_min <= query.budget_max)
        if query.budget_min is not None:
            stmt = stmt.where(Phone.price_min >= query.budget_min)

        return list(session.scalars(stmt).all())


class RankingEngine:
    """Scores and ranks phone candidates."""

    @staticmethod
    def score_and_rank(phones: List[Phone], query: RecommendationQuery) -> List[RecommendationResult]:
        candidates = []
        for phone in phones:
            score_breakdown = {
                "camera": score_camera(phone),
                "gaming": score_gaming(phone),
                "battery": score_battery(phone),
                "performance": score_performance(phone),
                "display": score_display(phone),
                "charging": score_charging(phone),
                "value": score_value(phone)
            }

            # If specific priorities are requested, base score on those + overall quality
            if query.priorities:
                priority_score = sum(score_breakdown[p] for p in query.priorities) / len(query.priorities)
                general_score = sum(score_breakdown.values()) / len(score_breakdown)
                final_score = 0.8 * priority_score + 0.2 * general_score
            else:
                # All-around performance score
                final_score = sum(score_breakdown.values()) / len(score_breakdown)

            reason = generate_reason(phone, score_breakdown, query.priorities)

            candidates.append({
                "phone_id": phone.id,
                "brand": phone.brand,
                "name": phone.name,
                "category": phone.category,
                "price_min": phone.price_min,
                "price_max": phone.price_max,
                "score": final_score,
                "score_breakdown": score_breakdown,
                "reason": reason
            })

        # Sort descending by score, ascending by price_min as tie breaker
        candidates.sort(key=lambda x: (-x["score"], x["price_min"] or 999999))

        results = []
        for rank, cand in enumerate(candidates[:query.limit], 1):
            results.append(RecommendationResult(
                rank=rank,
                phone_id=cand["phone_id"],
                brand=cand["brand"],
                name=cand["name"],
                category=cand["category"],
                price_min=cand["price_min"],
                price_max=cand["price_max"],
                score=cand["score"],
                score_breakdown=cand["score_breakdown"],
                reason=cand["reason"]
            ))
        return results


# ──────────────────────────────────────────────────────────────────────
# Main Entry Shorthand
# ──────────────────────────────────────────────────────────────────────

def recommend(query: RecommendationQuery, session: Optional[Session] = None) -> List[RecommendationResult]:
    """Execute SQL query filters, score matching records, and return sorted recommendations."""
    if session is not None:
        phones = FilterEngine.filter_candidates(session, query)
        return RankingEngine.score_and_rank(phones, query)
    else:
        from db.session import session_scope
        with session_scope() as session:
            phones = FilterEngine.filter_candidates(session, query)
            return RankingEngine.score_and_rank(phones, query)


def rank_candidates(phones: List[Phone], query: RecommendationQuery) -> List[RecommendationResult]:
    """Expose ranking engine directly for situations where candidates are pre-loaded."""
    return RankingEngine.score_and_rank(phones, query)
