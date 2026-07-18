"""Regex-based fallbacks for sparse scalar columns.

Many rows in the merged catalogue have ``ram_gb``, ``battery_mah`` and
``charging_w`` populated as text strings only. These helpers dig numbers
back out so ranking functions can score uniformly.
"""
from __future__ import annotations

import re
from typing import Optional

_MAH_RE = re.compile(r"(\d{2,5})\s*mAh", re.IGNORECASE)
_WATT_RE = re.compile(r"(\d{1,3}(?:\.\d+)?)\s*W(?!\w)", re.IGNORECASE)
_RAM_GB_RE = re.compile(r"(\d{1,3})\s*GB(?:\s+RAM|\s*RAM|\s+LPDDR)", re.IGNORECASE)
_RAM_INLINE_RE = re.compile(r"\b(\d{1,2})\s*GB\b", re.IGNORECASE)
_DISPLAY_IN_RE = re.compile(r"(\d\.\d{1,2})\s*-?\s*inch", re.IGNORECASE)
_DISPLAY_REFRESH_RE = re.compile(r"(\d{2,3})\s*Hz", re.IGNORECASE)
_MP_RE = re.compile(r"(\d{1,3})\s*MP", re.IGNORECASE)
_NITS_RE = re.compile(r"(\d{3,5})\s*nits", re.IGNORECASE)


def extract_mah(text: Optional[str]) -> Optional[int]:
    """Find the first mAh figure in ``text`` (battery capacity)."""
    if not text:
        return None
    m = _MAH_RE.search(text)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def extract_watt(text: Optional[str]) -> Optional[int]:
    """Find the first watt figure in ``text`` (charging wattage)."""
    if not text:
        return None
    m = _WATT_RE.search(text)
    if not m:
        return None
    try:
        return int(float(m.group(1)))
    except ValueError:
        return None


def extract_ram_gb(text: Optional[str]) -> Optional[int]:
    """Find RAM size. Prefers explicit ``GB RAM`` match, falls back to bare GB."""
    if not text:
        return None
    m = _RAM_GB_RE.search(text)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    m = _RAM_INLINE_RE.search(text)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None


def extract_display_inches(text: Optional[str]) -> Optional[float]:
    if not text:
        return None
    m = _DISPLAY_IN_RE.search(text)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return None


def extract_refresh_hz(text: Optional[str]) -> Optional[int]:
    if not text:
        return None
    m = _DISPLAY_REFRESH_RE.search(text)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None


def extract_top_mp(text: Optional[str]) -> Optional[int]:
    """Return the highest MP count mentioned in camera text."""
    if not text:
        return None
    matches = [int(x) for x in _MP_RE.findall(text)]
    return max(matches) if matches else None


def extract_peak_nits(text: Optional[str]) -> Optional[int]:
    """Return the highest nits figure mentioned in display text."""
    if not text:
        return None
    matches = [int(x) for x in _NITS_RE.findall(text)]
    return max(matches) if matches else None


def extract_numeric_from_text(text: Optional[str]) -> dict[str, Optional[float]]:
    """Convenience: pull every relevant scalar out of a free-text field."""
    return {
        "mah": extract_mah(text),
        "watt": extract_watt(text),
        "ram_gb": extract_ram_gb(text),
        "display_inches": extract_display_inches(text),
        "refresh_hz": extract_refresh_hz(text),
        "top_mp": extract_top_mp(text),
        "peak_nits": extract_peak_nits(text),
    }