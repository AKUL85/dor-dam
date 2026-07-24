"""Specification lookup engine.

Approach:
1. Resolve phone by name/slug.
2. For a list of fields (``ram``, ``storage``, ``processor``, ``battery``,
   ``charging``, ``display``, ``camera``, ``os``, ``network``, ``wireless``,
   plus boolean checks for feature flags like wireless-charging support)
   pull the parsed scalar from the ``phones`` row and the long-form
   value out of the matching free-text column.
3. Render the result as plain text or markdown.
"""
from __future__ import annotations

import logging
import re
from contextlib import ExitStack
from dataclasses import dataclass, field
from typing import Any, Callable, List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from db.config import load_settings
from db.models import Phone
from db.session import session_scope
from recommend.extractors import (
    extract_mah,
    extract_watt,
    extract_ram_gb,
    extract_refresh_hz,
    extract_top_mp,
    extract_display_inches,
    extract_peak_nits,
)

logger = logging.getLogger("specs.engine")


# ──────────────────────────────────────────────────────────────────────
# Field catalogue
# ──────────────────────────────────────────────────────────────────────

@dataclass(slots=True)
class SpecField:
    """One specification field the engine knows how to surface."""
    key: str
    label: str
    response_template: str                              # filled with parsed value


def _scalar_int(p: Phone) -> Optional[int]:
    return p.ram_gb

def _scalar_storage(p: Phone) -> Optional[int]:
    return p.storage_gb

def _scalar_battery(p: Phone) -> Optional[int]:
    return p.battery_mah if p.battery_mah is not None else extract_mah(p.battery_text or "")

def _scalar_charging(p: Phone) -> Optional[int]:
    if p.charging_w is not None:
        return p.charging_w
    w = extract_watt(p.battery_text or "")
    if w is not None:
        return w
    m = re.search(r"(\d{1,3})\s*W\b", (p.battery_text or ""))
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            return None
    return None


def _scalar_display_in(p: Phone) -> Optional[float]:
    if p.display_inches is not None:
        return p.display_inches
    return extract_display_inches(p.display_text or "")


def _scalar_top_mp(p: Phone) -> Optional[int]:
    return extract_top_mp(p.camera_text or "")


def _scalar_refresh(p: Phone) -> Optional[int]:
    return extract_refresh_hz(p.display_text or "")


def _scalar_peak_nits(p: Phone) -> Optional[int]:
    return extract_peak_nits(p.display_text or "")


# ──────────────────────────────────────────────────────────────────────
# Boolean feature checks (just yes/no)
# ──────────────────────────────────────────────────────────────────────

def _check_wireless_charging(p: Phone) -> Optional[bool]:
    blob = " ".join([
        p.battery_text or "",
        p.display_text or "",
        p.camera_text or "",
        p.network or "",
        p.os or "",
    ]).lower()
    if any(k in blob for k in ["wireless charging", "qi ", "qi-charging", "qi charging", "inductive charging"]):
        return True
    if "no wireless" in blob or "not support wireless" in blob:
        return False
    return None  # unknown from available data


def _check_5g(p: Phone) -> Optional[bool]:
    net = (p.network or "").lower()
    if not net:
        return None
    return "5g" in net or "lte-a" in net


def _check_nfc(p: Phone) -> Optional[bool]:
    blob = " ".join([p.network or "", p.camera_text or "", p.battery_text or "", p.display_text or ""]).lower()
    if "nfc" in blob:
        return True
    return None


def _check_water_resistance(p: Phone) -> Optional[bool]:
    blob = " ".join([p.display_text or "", p.camera_text or "", p.battery_text or "", p.network or ""]).lower()
    if re.search(r"\bip6[8]\b", blob) or "water resistant" in blob or "ipx" in blob:
        return True
    if "no ip" in blob or "no water resistance" in blob:
        return False
    return None


def _check_sd_card(p: Phone) -> Optional[bool]:
    blob = " ".join([p.display_text or "", p.battery_text or "", p.camera_text or "", p.os or ""]).lower()
    if "microsd" in blob or "memory card" in blob or "sd card" in blob:
        return True
    if "no microsd" in blob or "no sd card" in blob:
        return False
    return None


# Field registry — each entry returns either a parsed value (for facts)
# or a boolean (for feature checks).
SPEC_FIELDS: dict[str, dict[str, Any]] = {
    "ram": {
        "label": "RAM",
        "kind": "scalar_int",
        "getter": _scalar_int,
        "format": lambda v: f"{v} GB",
        "fallback_text": None,
    },
    "storage": {
        "label": "Storage",
        "kind": "scalar_int",
        "getter": _scalar_storage,
        "format": lambda v: f"{v} GB",
        "fallback_text": None,
    },
    "processor": {
        "label": "Processor",
        "kind": "text",
        "scalar": None,
        "text": lambda p: p.processor_text,
    },
    "battery": {
        "label": "Battery",
        "kind": "scalar_int",
        "getter": _scalar_battery,
        "format": lambda v: f"{v} mAh",
        "fallback_text": lambda p: p.battery_text,
    },
    "charging": {
        "label": "Charging",
        "kind": "scalar_int",
        "getter": _scalar_charging,
        "format": lambda v: f"{v} W",
        "fallback_text": lambda p: p.battery_text,
    },
    "wireless_charging": {
        "label": "Wireless charging",
        "kind": "feature",
        "check": _check_wireless_charging,
    },
    "display": {
        "label": "Display",
        "kind": "display",
        "inches": _scalar_display_in,
        "refresh": _scalar_refresh,
        "nits": _scalar_peak_nits,
        "text": lambda p: p.display_text,
    },
    "camera": {
        "label": "Camera",
        "kind": "camera",
        "top_mp": _scalar_top_mp,
        "text": lambda p: p.camera_text,
    },
    "os": {
        "label": "Operating System",
        "kind": "text",
        "scalar": None,
        "text": lambda p: p.os,
    },
    "network": {
        "label": "Network",
        "kind": "text+feature",
        "text": lambda p: p.network,
        "feature": _check_5g,
        "feature_label": "5G support",
    },
    "nfc": {
        "label": "NFC",
        "kind": "feature",
        "check": _check_nfc,
    },
    "water_resistance": {
        "label": "Water resistance",
        "kind": "feature",
        "check": _check_water_resistance,
    },
    "sd_card": {
        "label": "microSD card",
        "kind": "feature",
        "check": _check_sd_card,
    },
}


def field_label(key: str) -> str:
    return SPEC_FIELDS.get(key, {}).get("label", key.replace("_", " ").title())


# ──────────────────────────────────────────────────────────────────────
# Data models
# ──────────────────────────────────────────────────────────────────────

@dataclass(slots=True)
class SpecQuery:
    raw_name: str
    fields: List[str] = field(default_factory=list)     # empty ⇒ "all"
    show_missing: bool = True


@dataclass(slots=True)
class SpecResult:
    phone_id: int
    brand: str
    name: str
    fields: List["ResolvedField"]
    raw_query: str = ""

    @property
    def is_empty(self) -> bool:
        return not self.fields


@dataclass(slots=True)
class ResolvedField:
    key: str
    label: str
    value: Any                                           # int / float / bool / str / None
    display: str                                         # pre-formatted human string
    source: str                                          # 'parsed' / 'text' / 'unknown'
    summary: str = ""                                    # extra prose context


# ──────────────────────────────────────────────────────────────────────
# Resolution
# ──────────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _resolve_phone(session: Session, name: str) -> Optional[Phone]:
    name = (name or "").strip()
    if not name:
        return None
    slug = _slugify(name)

    ph = session.execute(select(Phone).where(Phone.slug == slug)).scalar_one_or_none()
    if ph:
        return ph

    ph = session.execute(
        select(Phone).where(Phone.slug.ilike(f"%{slug}%")).limit(1)
    ).scalar_one_or_none()
    if ph:
        return ph

    if " " in name:
        head, tail = name.split(" ", 1)
        tokens = [t for t in _slugify(tail).split("-") if len(t) >= 2]
        candidates = session.execute(
            select(Phone).where(Phone.brand.ilike(head)).limit(80)
        ).scalars().all()
        scored: list[tuple[int, Phone]] = []
        for p in candidates:
            sl = (p.slug or "").lower()
            score = sum(1 for tok in tokens if tok in sl)
            if score:
                scored.append((score, p))
        if scored:
            scored.sort(key=lambda x: -x[0])
            return scored[0][1]

    return session.execute(
        select(Phone).where(Phone.name.ilike(f"%{name}%")).limit(1)
    ).scalar_one_or_none()


# ──────────────────────────────────────────────────────────────────────
# Field resolution
# ──────────────────────────────────────────────────────────────────────

def _resolve_field(key: str, p: Phone) -> ResolvedField:
    spec = SPEC_FIELDS.get(key)
    if spec is None:
        return ResolvedField(
            key=key, label=field_label(key),
            value=None, display=f"unknown field: {key}",
            source="unknown",
        )

    kind = spec["kind"]

    if kind == "scalar_int":
        getter: Callable[[Phone], Optional[int]] = spec["getter"]
        value = getter(p)
        if value is not None:
            return ResolvedField(
                key=key, label=spec["label"],
                value=value, display=spec["format"](value),
                source="parsed",
            )
        # Fallback to text mining.
        fallback_text = spec.get("fallback_text")
        text_value = fallback_text(p) if callable(fallback_text) else (fallback_text or "")
        if text_value:
            return ResolvedField(
                key=key, label=spec["label"],
                value=None, display=_first_sentence(text_value),
                source="text",
            )
        return ResolvedField(
            key=key, label=spec["label"],
            value=None, display="not specified",
            source="unknown",
        )

    if kind == "text":
        text_value = spec["text"](p)
        if text_value:
            return ResolvedField(
                key=key, label=spec["label"],
                value=None, display=_first_sentence(text_value),
                source="text",
            )
        return ResolvedField(
            key=key, label=spec["label"],
            value=None, display="not specified",
            source="unknown",
        )

    if kind == "feature":
        check: Callable[[Phone], Optional[bool]] = spec["check"]
        flag = check(p)
        if flag is True:
            display = "Yes — supported"
        elif flag is False:
            display = "No — not supported"
        else:
            display = "Not specified"
        return ResolvedField(
            key=key, label=spec["label"],
            value=flag, display=display,
            source="checked" if flag is not None else "unknown",
        )

    if kind == "display":
        inches = spec["inches"](p)
        refresh = spec["refresh"](p)
        nits = spec["nits"](p)
        text_value = spec["text"](p) or ""
        bits: list[str] = []
        if inches is not None:
            bits.append(f'{inches:.2f}"')
        if refresh is not None:
            bits.append(f"{refresh} Hz")
        if nits is not None:
            bits.append(f"{nits} nits peak")
        panel = ""
        if "amoled" in text_value.lower():
            panel = "AMOLED"
        elif "oled" in text_value.lower():
            panel = "OLED"
        elif "ips" in text_value.lower():
            panel = "IPS"
        if panel:
            bits.append(panel)
        if bits:
            return ResolvedField(
                key=key, label=spec["label"],
                value=None, display=", ".join(bits),
                source="parsed", summary=_first_sentence(text_value) if text_value else "",
            )
        if text_value:
            return ResolvedField(
                key=key, label=spec["label"],
                value=None, display=_first_sentence(text_value),
                source="text",
            )
        return ResolvedField(
            key=key, label=spec["label"],
            value=None, display="not specified", source="unknown",
        )

    if kind == "camera":
        top_mp = spec["top_mp"](p)
        text_value = spec["text"](p) or ""
        bits: list[str] = []
        if top_mp is not None:
            bits.append(f"{top_mp} MP main")
        flag_count = _camera_flags(text_value)
        if flag_count:
            bits.append(f"{flag_count} pro features")
        if bits:
            return ResolvedField(
                key=key, label=spec["label"],
                value=None, display=", ".join(bits),
                source="parsed", summary=_first_sentence(text_value),
            )
        if text_value:
            return ResolvedField(
                key=key, label=spec["label"],
                value=None, display=_first_sentence(text_value),
                source="text",
            )
        return ResolvedField(
            key=key, label=spec["label"], value=None,
            display="not specified", source="unknown",
        )

    if kind == "text+feature":
        text_value = spec["text"](p)
        flag = spec.get("feature")(p) if spec.get("feature") else None
        if text_value:
            display = _first_sentence(text_value)
            if flag is True:
                display = f"{display} — {spec.get('feature_label', 'flag')} ✓"
            elif flag is False:
                display = f"{display} — {spec.get('feature_label', 'flag')} ✗"
            return ResolvedField(
                key=key, label=spec["label"],
                value=flag, display=display,
                source="text+feature",
            )
        if flag is True:
            return ResolvedField(
                key=key, label=spec["label"],
                value=True, display=f"{spec.get('feature_label', 'flag')} supported",
                source="checked",
            )
        return ResolvedField(
            key=key, label=spec["label"], value=None,
            display="not specified", source="unknown",
        )

    return ResolvedField(
        key=key, label=spec["label"], value=None,
        display="not specified", source="unknown",
    )


def _first_sentence(text: str, max_len: int = 140) -> str:
    text = (text or "").strip()
    if not text:
        return "—"
    text = re.sub(r"\s+", " ", text)
    match = re.split(r"(?<=[\.!\?])\s", text, maxsplit=1)
    sentence = match[0]
    if len(sentence) > max_len:
        sentence = sentence[: max_len - 1].rstrip() + "…"
    return sentence


def _camera_flags(text: str) -> int:
    if not text:
        return 0
    flags = ("OIS", "periscope", "telephoto", "sensor-shift", "RAW", "Dolby Vision", "ProRes", "8K", "4K Dolby Vision")
    return sum(1 for f in flags if f.lower() in text.lower())


# ──────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────

def spec_for(phone: Phone, fields: Optional[Sequence[str]] = None) -> SpecResult:
    keys = list(fields) if fields else list(SPEC_FIELDS.keys())
    resolved = [_resolve_field(k, phone) for k in keys]
    return SpecResult(
        phone_id=phone.id,
        brand=phone.brand,
        name=phone.name,
        fields=resolved,
        raw_query=phone.name,
    )


def lookup(name: str, fields: Optional[Sequence[str]] = None, *, session: Optional[Session] = None) -> SpecResult:
    if session is not None:
        phone = _resolve_phone(session, name)
        if phone is None:
            raise LookupError(f"No phone matched: {name!r}")
        return spec_for(phone, fields)

    settings = load_settings()
    with ExitStack() as stack:
        from db.session import engine
        eng = engine(settings)
        sess_ctx = session_scope(eng)
        session = stack.enter_context(sess_ctx)
        phone = _resolve_phone(session, name)
        if phone is None:
            raise LookupError(f"No phone matched: {name!r}")
        return spec_for(phone, fields)


# ──────────────────────────────────────────────────────────────────────
# Question routing
# ──────────────────────────────────────────────────────────────────────

# Each entry: regex → (field key, output predicate)
# The first match wins; we surface just that one field.

_QUESTION_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(wireless|qi)\b.*\bcharg(?:e|ing)\b", re.IGNORECASE), "wireless_charging"),
    (re.compile(r"\bram\b", re.IGNORECASE), "ram"),
    (re.compile(r"\bprocessor\b|\bchipset\b|\bso[cс]\b|\bcpu\b", re.IGNORECASE), "processor"),
    (re.compile(r"\bcharging\b|\bcharger\b|\b(?:fast|quick)\s+charge\b", re.IGNORECASE), "charging"),
    (re.compile(r"\bbattery\b|\bmah\b", re.IGNORECASE), "battery"),
    (re.compile(r"\bdisplay\b|\bscreen\b|\bpanel\b|\bhz\b|\brefresh\b", re.IGNORECASE), "display"),
    (re.compile(r"\bcamera\b|\bphoto(?:graphy)?\b|\bmp\b|\b(?:rear|main)\s+cam", re.IGNORECASE), "camera"),
    (re.compile(r"\bos\b|\bandroid\s+\d+\b|\bios\s+\d+\b", re.IGNORECASE), "os"),
    (re.compile(r"\b5g\b", re.IGNORECASE), "network"),
    (re.compile(r"\bnfc\b", re.IGNORECASE), "nfc"),
    (re.compile(r"\bip6[8]\b|\bwater\s+resist", re.IGNORECASE), "water_resistance"),
    (re.compile(r"\bsd\s*card\b|\bmicro\s*sd\b", re.IGNORECASE), "sd_card"),
    (re.compile(r"\bstor(?:age|e)\b|\brom\b|\b\d+\s*gb\b", re.IGNORECASE), "storage"),
]


def answer_question(question: str, *, session: Optional[Session] = None) -> SpecResult:
    """Translate a natural-language spec question into a focused result
    containing the single most-likely answer field."""
    q = (question or "").strip()
    # Pull the phone model out by stripping category words.
    # Heuristic: drop the first token if it matches a known keyword.
    # Tokenize once; strip everything before the model identifier.
    # Strategy: scan left-to-right, dropping tokens while they're
    # generic English ("does", "how", "much", "have"). Stop at the
    # first token that looks like a brand or capitalised model.
    tokens = re.split(r"\s+", q)
    generic = {
        "does", "do", "is", "are", "has", "have", "had", "having",
        "what", "which", "who", "whose",
        "show", "tell", "give", "list",
        "can", "could", "would", "should",
        "how", "much", "many", "long",
        "the", "a", "an",
        "phone", "phones", "smartphone", "mobile",
        "support", "supports", "supported",
        "come", "comes", "use", "uses",
        "feature", "features", "include", "includes",
        "run", "runs", "ship", "ships",
        "with", "of", "for",
        "ram", "storage", "processor", "chipset", "soc", "cpu",
        "battery", "charging", "wireless", "qi", "mah",
        "display", "screen", "panel", "refresh", "hz",
        "camera", "photography", "mp",
        "os", "android", "ios", "5g", "nfc",
        "ip68", "ip67", "water", "sd", "micro",
        "give", "me", "you", "i", "want", "need", "know",
    }
    raw_tokens: list[str] = []
    seen_specific = False
    for tok in tokens:
        bare = tok.strip("?,.:;!\"'()[]")
        bare_lower = bare.lower()
        if not seen_specific:
            # Heuristic: tokens that start with an uppercase letter, or
            # contain a digit, are model identifiers → start keeping.
            if bare and (bare[0].isupper() or any(c.isdigit() for c in bare)):
                seen_specific = True
            elif bare_lower in generic:
                continue
            else:
                # First non-generic token. Keep it (probably the brand).
                seen_specific = True
        if bare_lower in generic:
            # Trailing generic words after the model name; keep stripping.
            continue
        if bare:
            raw_tokens.append(bare)
    raw_name = " ".join(raw_tokens).strip() or q

    field_key: Optional[str] = None
    for pat, key in _QUESTION_PATTERNS:
        if pat.search(q):
            field_key = key
            break

    if field_key is None:
        # Fallback: return all fields.
        return lookup(raw_name, session=session)

    result = lookup(raw_name, fields=[field_key], session=session)
    # Stamp raw_query with the original question so the renderer is honest.
    result.raw_query = raw_name
    return result


# ──────────────────────────────────────────────────────────────────────
# Rendering
# ──────────────────────────────────────────────────────────────────────

def render_markdown(result: SpecResult) -> str:
    if result.is_empty:
        return f"# {result.brand} {result.name}\n\n_No specifications available._\n"

    name = result.name if result.name.lower().startswith(result.brand.lower()) else f"{result.brand} {result.name}"
    lines = [f"# {name} — specifications", ""]
    lines.append("| Field | Value |")
    lines.append("|---|---|")
    for f in result.fields:
        value = f.display or "—"
        if f.summary:
            value = f"{value} _(see source)_"
        lines.append(f"| **{f.label}** | {value} |")
    return "\n".join(lines) + "\n"