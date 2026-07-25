"""Per-priority scoring functions.

Every scorer receives a single :class:`Phone` ORM row plus its extracted
fallback scalars, and returns a ``(score, reason)`` tuple where ``score``
is in ``[0.0, 1.0]``. Higher = better for the requested priority.

A scorer returns ``(0.0, "")`` when the phone offers no relevant signal.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional, Tuple

from db.models import Phone
from recommend import extractors as ex


@dataclass(slots=True)
class PhoneFeatures:
    """Bundle of structured + text-extracted features for scoring."""
    phone: Phone

    # Pulled out of text columns (the parsed scalars are sparse in our DB).
    ram_gb: Optional[int]
    storage_gb: Optional[int]
    battery_mah: Optional[int]
    charging_w: Optional[int]
    display_inches: Optional[float]
    refresh_hz: Optional[int]
    top_mp: Optional[int]
    peak_nits: Optional[int]

    @classmethod
    def from_phone(cls, phone: Phone) -> "PhoneFeatures":
        # Try parsed scalar first, fall back to text extraction.
        merged_specs = ""
        try:
            import json as _json
            if phone.id is not None:
                # merged_specs isn't on the model; nothing to do here for now.
                pass
        except Exception:
            pass

        battery_text = phone.battery_text or ""
        charging_text = phone.battery_text or ""  # charging wattage appears in battery text
        camera_text = phone.camera_text or ""
        display_text = phone.display_text or ""

        return cls(
            phone=phone,
            ram_gb=phone.ram_gb if phone.ram_gb is not None else ex.extract_ram_gb(battery_text) or ex.extract_ram_gb(display_text),
            storage_gb=phone.storage_gb,
            battery_mah=phone.battery_mah if phone.battery_mah is not None else ex.extract_mah(battery_text),
            charging_w=phone.charging_w if phone.charging_w is not None else ex.extract_watt(charging_text),
            display_inches=phone.display_inches if phone.display_inches is not None else ex.extract_display_inches(display_text),
            refresh_hz=ex.extract_refresh_hz(display_text),
            top_mp=ex.extract_top_mp(camera_text),
            peak_nits=ex.extract_peak_nits(display_text),
        )


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _bucket(value: float, lo: float, hi: float) -> float:
    """Linearly normalise ``value`` from ``[lo, hi]`` to ``[0, 1]`` (clamped)."""
    if hi <= lo:
        return 0.0
    return max(0.0, min(1.0, (value - lo) / (hi - lo)))


def _flags(text: str, *patterns: str) -> int:
    if not text:
        return 0
    return sum(1 for p in patterns if re.search(p, text, re.IGNORECASE))


# ──────────────────────────────────────────────────────────────────────
# Per-priority scorers
# ──────────────────────────────────────────────────────────────────────

def score_camera(f: PhoneFeatures) -> Tuple[float, str]:
    """Higher MP, OIS, telephoto/periscope, 8K video all increase score."""
    p = f.phone
    text = (p.camera_text or "")
    parts: list[float] = []
    notes: list[str] = []

    # Megapixels — log scale, saturating at 200 MP.
    if f.top_mp:
        parts.append(_bucket(f.top_mp, 12, 200))
        notes.append(f"{f.top_mp}MP")
    elif text:
        # no extractable number; partial credit only
        parts.append(0.1)

    # Feature flags.
    flag_score = _flags(
        text,
        r"\bOIS\b",
        r"periscope",
        r"telephoto",
        r"8K",
        r"4K",
        r"HDR",
        r"f/1\.[0-9]",          # wide aperture
        r"sensor[\- ]shift",
        r"large sensor",
    )
    parts.append(_bucket(flag_score, 0, 6))
    if flag_score:
        notes.append(f"{flag_score} flags")

    if not parts:
        return 0.0, ""
    score = sum(parts) / len(parts)
    return score, " · ".join(notes)


def score_gaming(f: PhoneFeatures) -> Tuple[float, str]:
    """Strong SoC + ample RAM + smooth display."""
    p = f.phone
    parts: list[float] = []
    notes: list[str] = []

    # SoC tier — best-effort keyword scan.
    soc_text = (p.processor_text or "").lower()
    soc_score = 0.0
    if any(k in soc_text for k in ["snapdragon 8 gen 3", "snapdragon 8 gen 2", "apple a19 pro", "apple a19", "dimensity 9300", "tensor g5", "tensor g4"]):
        soc_score = 1.0
    elif any(k in soc_text for k in ["snapdragon 8 gen 1", "snapdragon 8s gen 3", "apple a18", "dimensity 9200", "tensor g3"]):
        soc_score = 0.85
    elif any(k in soc_text for k in ["snapdragon 7", "dimensity 8", "apple a17", "snapdragon 888", "snapdragon 8 gen 0"]):
        soc_score = 0.7
    elif any(k in soc_text for k in ["snapdragon 6", "dimensity 7", "snapdragon 778"]):
        soc_score = 0.5
    elif "snapdragon 4" in soc_text or "dimensity 6" in soc_text or soc_text:
        soc_score = 0.3
    parts.append(soc_score)
    if p.processor_text:
        notes.append(p.processor_text[:32])

    # RAM — saturating at 16 GB.
    if f.ram_gb is not None:
        parts.append(_bucket(f.ram_gb, 4, 16))
        notes.append(f"{f.ram_gb}GB RAM")

    # Display — refresh rate + size sweet-spot for games.
    if f.refresh_hz:
        parts.append(_bucket(f.refresh_hz, 60, 144))
        notes.append(f"{f.refresh_hz}Hz")
    if f.display_inches:
        parts.append(_bucket(f.display_inches, 5.5, 6.9))

    if not parts:
        return 0.0, ""
    return sum(parts) / len(parts), " · ".join(notes)


def score_battery(f: PhoneFeatures) -> Tuple[float, str]:
    p = f.phone
    parts: list[float] = []
    notes: list[str] = []

    if f.battery_mah is not None:
        parts.append(_bucket(f.battery_mah, 3000, 7000))
        notes.append(f"{f.battery_mah}mAh")

    # Even without a parsed mAh, charging wattage is a hint about battery class.
    if f.charging_w is not None:
        parts.append(_bucket(f.charging_w, 15, 120))
        notes.append(f"{f.charging_w}W")

    if not parts:
        return 0.0, ""
    return sum(parts) / len(parts), " · ".join(notes)


def score_performance(f: PhoneFeatures) -> Tuple[float, str]:
    """General CPU/GPU muscle — same as gaming but with no display bonus."""
    return score_gaming(f)  # alias for now; pure CPU/GPU story


def score_display(f: PhoneFeatures) -> Tuple[float, str]:
    p = f.phone
    parts: list[float] = []
    notes: list[str] = []

    if f.display_inches is not None:
        parts.append(_bucket(f.display_inches, 5.5, 7.0))
        notes.append(f"{f.display_inches:.2f}\"")

    if f.refresh_hz is not None:
        parts.append(_bucket(f.refresh_hz, 60, 144))
        notes.append(f"{f.refresh_hz}Hz")

    # Panel tech.
    text = (p.display_text or "")
    panel_score = 0.0
    if re.search(r"\bLTPO\b", text, re.IGNORECASE):
        panel_score = max(panel_score, 1.0)
    if re.search(r"\bAMOLED\b", text, re.IGNORECASE) or re.search(r"\bOLED\b", text, re.IGNORECASE):
        panel_score = max(panel_score, 0.85)
    if re.search(r"\bHDR", text, re.IGNORECASE):
        panel_score = max(panel_score, 0.6)
    if panel_score:
        parts.append(panel_score)
        notes.append("AMOLED" if "oled" in text.lower() else "HDR")

    # Brightness — saturating at 3000 nits.
    if f.peak_nits:
        parts.append(_bucket(f.peak_nits, 400, 3000))
        notes.append(f"{f.peak_nits}nits")

    if not parts:
        return 0.0, ""
    return sum(parts) / len(parts), " · ".join(notes)


def score_charging(f: PhoneFeatures) -> Tuple[float, str]:
    if f.charging_w is None:
        return 0.0, ""
    return _bucket(f.charging_w, 10, 150), f"{f.charging_w}W"


def score_value(f: PhoneFeatures) -> Tuple[float, str]:
    """Cheapest phone with the most general performance score wins."""
    perf, perf_note = score_performance(f)
    price = f.phone.price_min or 0
    if price <= 0:
        return 0.0, ""
    import math
    price_score = _bucket(math.log10(max(price, 1000)), 3.5, 5.5)
    price_score = 1.0 - price_score
    overall = 0.5 * perf + 0.5 * price_score
    note_parts = [perf_note, f"৳{int(price):,}"]
    return overall, " · ".join(p for p in note_parts if p)


def score_software(f: PhoneFeatures) -> Tuple[float, str]:
    """Evaluates OS clean software experience, update support, and UI optimization."""
    p = f.phone
    text = (p.os_text or "").lower() + " " + (p.name or "").lower()
    score = 0.5
    notes = []

    if any(k in text for k in ["ios", "iphone", "pixel"]):
        score = 0.95
        notes.append("Top OS Support")
    elif any(k in text for k in ["oneui", "samsung", "oxygenos", "nothing"]):
        score = 0.85
        notes.append("Clean / Long Support UI")
    elif "android" in text:
        score = 0.70
        notes.append("Standard Android")

    if any(k in text for k in ["7 years", "5 years", "long support", "clean"]):
        score = min(score + 0.10, 1.0)
        notes.append("Extended Updates")

    return score, " · ".join(notes) if notes else "Standard OS"


def score_foldable(f: PhoneFeatures) -> Tuple[float, str]:
    """Scores foldable and flip form factors."""
    p = f.phone
    text = (p.name or "").lower() + " " + (p.display_text or "").lower() + " " + (p.category or "").lower()
    if any(k in text for k in ["fold", "flip", "foldable", "flexible"]):
        if "flip" in text:
            return 1.0, "Foldable Flip"
        return 1.0, "Foldable Book"
    return 0.0, ""


def score_compact(f: PhoneFeatures) -> Tuple[float, str]:
    """Scores compact, easy-to-hold phones (display <= 6.3 inches)."""
    inches = f.display_inches
    if inches is None:
        return 0.0, ""
    if inches <= 6.1:
        return 1.0, f"Ultra Compact ({inches:.1f}\")"
    elif inches <= 6.3:
        return 0.85, f"Compact ({inches:.1f}\")"
    elif inches <= 6.5:
        return 0.5, f"Mid Size ({inches:.1f}\")"
    return 0.2, f"Large Display ({inches:.1f}\")"


def score_business(f: PhoneFeatures) -> Tuple[float, str]:
    """Evaluates business productivity: RAM, storage, battery, security, software."""
    p = f.phone
    parts = []
    notes = []

    if f.ram_gb:
        parts.append(_bucket(f.ram_gb, 6, 16))
        notes.append(f"{f.ram_gb}GB RAM")

    if f.storage_gb:
        parts.append(_bucket(f.storage_gb, 128, 512))
        notes.append(f"{f.storage_gb}GB Storage")

    sw_score, _ = score_software(f)
    parts.append(sw_score)

    if not parts:
        return 0.0, ""
    return sum(parts) / len(parts), " · ".join(notes)


def score_student(f: PhoneFeatures) -> Tuple[float, str]:
    """Balanced value for money, battery life, and solid everyday performance."""
    val_score, _ = score_value(f)
    bat_score, _ = score_battery(f)
    perf_score, _ = score_performance(f)
    score = 0.4 * val_score + 0.3 * bat_score + 0.3 * perf_score
    return score, f"Student Value Score {score:.2f}"


def score_travel(f: PhoneFeatures) -> Tuple[float, str]:
    """Evaluates travel readiness: battery endurance, fast charging, build durability."""
    bat_score, b_note = score_battery(f)
    chg_score, c_note = score_charging(f)
    p = f.phone
    text = (p.body_text or "").lower() + " " + (p.display_text or "").lower()
    dur_bonus = 0.2 if any(k in text for k in ["ip68", "ip67", "gorilla", "waterproof", "rugged"]) else 0.0
    score = min(0.5 * bat_score + 0.3 * chg_score + dur_bonus + 0.2, 1.0)
    return score, f"Travel Score: {score:.2f}"


def score_photography(f: PhoneFeatures) -> Tuple[float, str]:
    """Enhanced photography score focusing on optics, telephoto zoom, OIS, and high MP."""
    cam_score, cam_note = score_camera(f)
    p = f.phone
    text = (p.camera_text or "").lower()
    optics_flag = _flags(text, r"leica", r"zeiss", r"hasselblad", r"raw", r"prores", r"periscope")
    optics_bonus = _bucket(optics_flag, 0, 3) * 0.2
    total = min(cam_score + optics_bonus, 1.0)
    note = f"{cam_note} · Pro Optics" if optics_flag else cam_note
    return total, note


def score_durability(f: PhoneFeatures) -> Tuple[float, str]:
    """Evaluates build quality, IP waterproof rating, and glass protection."""
    p = f.phone
    text = (p.body_text or "").lower() + " " + (p.display_text or "").lower()
    notes = []
    score = 0.3

    if "ip69" in text or "ip69k" in text:
        score = 1.0
        notes.append("IP69K Waterproof")
    elif "ip68" in text:
        score = 0.9
        notes.append("IP68 Waterproof")
    elif "ip67" in text:
        score = 0.75
        notes.append("IP67 Water Resistant")

    if any(k in text for k in ["victus", "ceramic shield", "gorilla glass", "titanium", "armor"]):
        score = min(score + 0.15, 1.0)
        notes.append("Armored Glass/Frame")

    return score, " · ".join(notes) if notes else "Standard Build"


def score_resale(f: PhoneFeatures) -> Tuple[float, str]:
    """Evaluates brand resale value retention in Bangladesh market."""
    b = (f.phone.brand or "").lower()
    name = (f.phone.name or "").lower()
    if b == "apple" or "iphone" in name:
        return 0.95, "High Apple Resale Retention"
    elif b == "samsung" and any(k in name for k in ["s25", "s24", "s23", "ultra", "z fold", "z flip"]):
        return 0.85, "High Samsung Flagship Resale"
    elif b in ["samsung", "google", "oneplus"]:
        return 0.70, "Moderate Brand Resale"
    elif b in ["xiaomi", "realme", "vivo", "oppo"]:
        return 0.55, "Standard Resale"
    return 0.40, "Budget Resale Tier"


def score_ecosystem(f: PhoneFeatures) -> Tuple[float, str]:
    """Evaluates brand ecosystem integration (MagSafe, watch, smart home)."""
    b = (f.phone.brand or "").lower()
    name = (f.phone.name or "").lower()
    if b == "apple" or "iphone" in name:
        return 1.0, "Apple Ecosystem (MagSafe/Watch/Mac)"
    elif b == "samsung":
        return 0.85, "Samsung Ecosystem (Galaxy Watch/Buds/SmartThings)"
    elif b == "xiaomi":
        return 0.75, "Xiaomi Ecosystem (Smart Home/IR Blaster)"
    elif b in ["google", "oneplus"]:
        return 0.70, "Android Connected Ecosystem"
    return 0.50, "Standard Connectivity"


def score_accessibility(f: PhoneFeatures) -> Tuple[float, str]:
    """Evaluates display readability, screen size, loudness, and battery reliability."""
    p = f.phone
    parts = []
    notes = []

    if f.display_inches:
        parts.append(_bucket(f.display_inches, 6.0, 7.0))
        notes.append(f"{f.display_inches:.1f}\" Screen")

    if f.peak_nits:
        parts.append(_bucket(f.peak_nits, 600, 2500))
        notes.append(f"{f.peak_nits} nits")

    bat_score, _ = score_battery(f)
    parts.append(bat_score)

    if not parts:
        return 0.5, "Standard Accessibility"
    return sum(parts) / len(parts), " · ".join(notes)


def score_content_creator(f: PhoneFeatures) -> Tuple[float, str]:
    """Evaluates vlogging/video recording, 4K/8K, OIS, front camera, and storage."""
    cam_score, _ = score_camera(f)
    p = f.phone
    text = (p.camera_text or "").lower()
    video_flags = _flags(text, r"4k60", r"8k", r"prores", r"log", r"ois", r"hdr video")
    video_bonus = _bucket(video_flags, 0, 4) * 0.3

    storage_bonus = 0.1 if (f.storage_gb and f.storage_gb >= 256) else 0.0
    total = min(cam_score * 0.6 + video_bonus + storage_bonus + 0.1, 1.0)
    return total, f"Creator Score: {total:.2f}"


def score_ai_features(f: PhoneFeatures) -> Tuple[float, str]:
    """Evaluates AI features (Galaxy AI, Gemini, Apple Intelligence, NPU)."""
    p = f.phone
    text = (p.processor_text or "").lower() + " " + (p.os_text or "").lower() + " " + (p.name or "").lower()
    notes = []
    score = 0.3

    if any(k in text for k in ["galaxy ai", "gemini", "apple intelligence"]):
        score = 1.0
        notes.append("On-Device Flagship AI")
    elif any(k in text for k in ["snapdragon 8 gen 3", "snapdragon 8 gen 2", "apple a18", "apple a19", "tensor g4", "dimensity 9300"]):
        score = 0.85
        notes.append("High Performance NPU")
    elif any(k in text for k in ["snapdragon 7", "tensor", "dimensity 8"]):
        score = 0.65
        notes.append("Mid-tier AI Support")

    return score, " · ".join(notes) if notes else "Basic AI"


# ──────────────────────────────────────────────────────────────────────
# Registry
# ──────────────────────────────────────────────────────────────────────

PRIORITY_SCORERS = {
    "camera": score_camera,
    "gaming": score_gaming,
    "battery": score_battery,
    "performance": score_performance,
    "display": score_display,
    "charging": score_charging,
    "value": score_value,
    "budget": score_value,
    "software": score_software,
    "foldable": score_foldable,
    "compact": score_compact,
    "business": score_business,
    "student": score_student,
    "travel": score_travel,
    "photography": score_photography,
    "durability": score_durability,
    "resale": score_resale,
    "ecosystem": score_ecosystem,
    "accessibility": score_accessibility,
    "content_creator": score_content_creator,
    "ai_features": score_ai_features,
    "ai": score_ai_features,
}


def score_for(priority: str, features: PhoneFeatures) -> Tuple[float, str]:
    scorer = PRIORITY_SCORERS.get(priority)
    if not scorer:
        return 0.0, f"unknown priority: {priority}"
    return scorer(features)