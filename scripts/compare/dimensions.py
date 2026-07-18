"""Per-dimension scoring functions for the comparison engine.

Each function returns ``(score, summary)`` for a single phone, where
``score`` is in ``[0, 1]``. Two phones are compared by aligning both
``score`` values into a winner/loser/tie call. The 9 dimensions requested
by the user are: display, processor, camera, battery, charging, software,
gaming, photography, value.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional, Tuple

from db.models import Phone
from recommend.extractors import (
    extract_mah,
    extract_watt,
    extract_ram_gb,
    extract_refresh_hz,
    extract_peak_nits,
    extract_top_mp,
    extract_display_inches,
)


@dataclass(slots=True)
class PhoneSignals:
    """Parsed numeric + text-derived features for a phone."""
    phone: Phone
    ram_gb: Optional[int]
    storage_gb: Optional[int]
    display_inches: Optional[float]
    refresh_hz: Optional[int]
    peak_nits: Optional[int]
    battery_mah: Optional[int]
    charging_w: Optional[int]
    top_mp: Optional[int]

    @classmethod
    def from_phone(cls, p: Phone) -> "PhoneSignals":
        return cls(
            phone=p,
            ram_gb=p.ram_gb if p.ram_gb is not None else extract_ram_gb(p.display_text or ""),
            storage_gb=p.storage_gb,
            display_inches=p.display_inches if p.display_inches is not None else extract_display_inches(p.display_text or ""),
            refresh_hz=extract_refresh_hz(p.display_text or ""),
            peak_nits=extract_peak_nits(p.display_text or ""),
            battery_mah=p.battery_mah if p.battery_mah is not None else extract_mah(p.battery_text or ""),
            charging_w=p.charging_w if p.charging_w is not None else extract_watt(p.battery_text or ""),
            top_mp=extract_top_mp(p.camera_text or ""),
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


def _cpu_tier(text: Optional[str]) -> float:
    if not text:
        return 0.3
    t = text.lower()
    if any(k in t for k in ["snapdragon 8 gen 3", "snapdragon 8 gen 2", "apple a19 pro", "apple a19", "dimensity 9300", "tensor g5", "tensor g4"]):
        return 1.0
    if any(k in t for k in ["snapdragon 8s gen 3", "snapdragon 8 gen 1", "apple a18", "a17", "dimensity 9200", "tensor g3"]):
        return 0.85
    if any(k in t for k in ["snapdragon 8 elite", "snapdragon 8+ gen", "a16", "snapdragon 7+ gen 3", "snapdragon 7+ gen 2", "dimensity 9000"]):
        return 0.78
    if any(k in t for k in ["snapdragon 888", "snapdragon 870", "dimensity 8", "apple a15"]):
        return 0.7
    if any(k in t for k in ["snapdragon 7", "dimensity 7", "snapdragon 778", "snapdragon 782", "snapdragon 695"]):
        return 0.55
    if any(k in t for k in ["snapdragon 6", "dimensity 6", "helio g99", "helio g96"]):
        return 0.45
    if any(k in t for k in ["helio g85", "helio g35", "helio p35", "unisoc t606", "snapdragon 4"]):
        return 0.35
    return 0.5


# ──────────────────────────────────────────────────────────────────────
# The 9 dimensions
# ──────────────────────────────────────────────────────────────────────

def score_display(s: PhoneSignals) -> Tuple[float, str]:
    parts: list[float] = []
    notes: list[str] = []
    if s.display_inches is not None:
        parts.append(_bucket(s.display_inches, 5.5, 7.0))
        notes.append(f'{s.display_inches:.2f}"')
    if s.refresh_hz is not None:
        parts.append(_bucket(s.refresh_hz, 60, 144))
        notes.append(f"{s.refresh_hz}Hz")
    text = s.phone.display_text or ""
    panel = 0.0
    if re.search(r"\bLTPO\b", text):
        panel = max(panel, 1.0)
    if re.search(r"\bAMOLED\b", text) or re.search(r"\bOLED\b", text):
        panel = max(panel, 0.85)
    if re.search(r"\bHDR", text):
        panel = max(panel, 0.5)
    if panel:
        parts.append(panel)
        notes.append("AMOLED" if "oled" in text.lower() else "HDR")
    if s.peak_nits:
        parts.append(_bucket(s.peak_nits, 400, 3000))
        notes.append(f"{s.peak_nits}nits")
    if not parts:
        return 0.0, ""
    return sum(parts) / len(parts), " · ".join(notes)


def score_processor(s: PhoneSignals) -> Tuple[float, str]:
    tier = _cpu_tier(s.phone.processor_text)
    proc = (s.phone.processor_text or "").split("(")[0].strip()[:40]
    return tier, proc or "unknown"


def score_camera(s: PhoneSignals) -> Tuple[float, str]:
    """Rear-array megapixels + lens features (mirrors ``recommend.scorers``)."""
    text = s.phone.camera_text or ""
    parts: list[float] = []
    notes: list[str] = []
    if s.top_mp:
        parts.append(_bucket(s.top_mp, 12, 200))
        notes.append(f"{s.top_mp}MP")
    flag_count = _flags(
        text,
        r"\bOIS\b",
        r"periscope",
        r"telephoto",
        r"8K",
        r"4K",
        r"HDR",
        r"sensor[\- ]shift",
    )
    if flag_count:
        parts.append(_bucket(flag_count, 0, 5))
        notes.append(f"{flag_count} flags")
    return (sum(parts) / len(parts) if parts else 0.0), " · ".join(notes)


def score_battery(s: PhoneSignals) -> Tuple[float, str]:
    if s.battery_mah is None:
        return 0.0, ""
    return _bucket(s.battery_mah, 3000, 7000), f"{s.battery_mah}mAh"


def score_charging(s: PhoneSignals) -> Tuple[float, str]:
    if s.charging_w is None:
        return 0.0, ""
    return _bucket(s.charging_w, 10, 150), f"{s.charging_w}W"


def score_software(s: PhoneSignals) -> Tuple[float, str]:
    """Lightly weight: Apple iOS / Samsung One UI / Pixel stock score higher;
    unknown brand → 0.5.
    """
    text = ((s.phone.os or "") + " " + (s.phone.brand or "")).lower()
    score = 0.5
    if "ios" in text or "iphone" in text:
        score = 0.9
    if "android" in text:
        score = max(score, 0.6)
    if "stock" in text or "pixel" in text:
        score = max(score, 0.85)
    if "one ui" in text or "oxygen" in text or "coloros" in text or "origin" in text:
        score = max(score, 0.75)
    note = ""
    if s.phone.os:
        note = s.phone.os.strip().split("\n")[0][:40]
    return min(score, 1.0), note


def score_gaming(s: PhoneSignals) -> Tuple[float, str]:
    parts = []
    notes = []
    cpu, proc_note = score_processor(s)
    parts.append(cpu)
    if proc_note:
        notes.append(proc_note)
    if s.ram_gb is not None:
        parts.append(_bucket(s.ram_gb, 4, 16))
        notes.append(f"{s.ram_gb}GB RAM")
    if s.refresh_hz is not None:
        parts.append(_bucket(s.refresh_hz, 60, 144))
        notes.append(f"{s.refresh_hz}Hz")
    return (sum(parts) / len(parts) if parts else 0.0), " · ".join(notes)


def score_photography(s: PhoneSignals) -> Tuple[float, str]:
    """Photography separates marketing megapixels from real imaging
    depth: telephoto reach, large sensors, 8K, OIS, Pro controls."""
    text = s.phone.camera_text or ""
    parts: list[float] = []
    notes: list[str] = []
    if s.top_mp:
        parts.append(_bucket(s.top_mp, 12, 200))
        notes.append(f"{s.top_mp}MP main")
    flags = _flags(
        text,
        r"periscope",
        r"telephoto",
        r"\bOIS\b",
        r"sensor[\- ]shift",
        r"ProRes",
        r"Dolby Vision",
        r"8K",
        r"large sensor",
        r"RAW",
        r"HDR\+?",
        r"Pro controls",
        r"evf",
    )
    if flags:
        parts.append(_bucket(flags, 0, 6))
        notes.append(f"{flags} pro flags")
    return (sum(parts) / len(parts) if parts else 0.0), " · ".join(notes)


def score_value(s: PhoneSignals) -> Tuple[float, str]:
    """Cheap + generally capable = high value. Compare score only; winner
    is decided by directly subtracting prices / specs."""
    parts = []
    notes = []
    cpu, proc_note = score_processor(s)
    parts.append(cpu)
    if proc_note:
        notes.append(proc_note)
    if s.ram_gb is not None:
        parts.append(_bucket(s.ram_gb, 4, 16))
        notes.append(f"{s.ram_gb}GB RAM")
    if s.storage_gb is not None:
        parts.append(_bucket(s.storage_gb, 64, 1024))
        notes.append(f"{s.storage_gb}GB")
    if s.battery_mah is not None:
        parts.append(_bucket(s.battery_mah, 3000, 7000))
        notes.append(f"{s.battery_mah}mAh")
    perf = sum(parts) / len(parts) if parts else 0.0
    price = s.phone.price_min or 0
    if price <= 0:
        return 0.0, ""
    import math
    price_score = 1.0 - _bucket(math.log10(max(price, 1000)), 3.5, 5.5)
    overall = 0.55 * perf + 0.45 * price_score
    note_parts = [f"৳{int(price):,}"]
    notes.extend(note_parts)
    return overall, " · ".join(notes)


# ──────────────────────────────────────────────────────────────────────
# Registry — the 9 dimensions, in display order
# ──────────────────────────────────────────────────────────────────────

DIMENSIONS: list[tuple[str, callable]] = [
    ("Display", score_display),
    ("Processor", score_processor),
    ("Camera", score_camera),
    ("Battery", score_battery),
    ("Charging", score_charging),
    ("Software", score_software),
    ("Gaming", score_gaming),
    ("Photography", score_photography),
    ("Value", score_value),
]  # type: ignore[name-defined]  # noqa: F821

ALL_DIMENSION_NAMES = [name for name, _ in DIMENSIONS]


def score_dimension(name: str, s: PhoneSignals) -> Tuple[float, str]:
    for n, fn in DIMENSIONS:
        if n == name:
            return fn(s)
    return 0.0, f"unknown dimension: {name}"