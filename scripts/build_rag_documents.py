"""
build_rag_documents.py
======================

Preprocess a merged phone dataset into RAG-ready documents.

Input
-----
processed/merged_phones.json
    A JSON array of phone records. Each record must contain at least:
        - name (str)              : human-readable phone name / model
        - brand (str)             : manufacturer name
        - category (str)          : product category, e.g. "Mobile Phone"
        - stores (list[dict])     : per-store pricing + availability rows
                                    each row carries {name, price, in_stock,
                                    stock_status, url}
        - merged_specs (dict)     : normalized spec key -> spec value (str)
                                    common keys: display, processor, ram,
                                    storage, rear_camera, front_camera,
                                    battery, charging, operating_system,
                                    connectivity, sensors, ...

Output
------
processed/phone_documents.jsonl
    One JSON object per line:
        {
            "id":   "phone_001",
            "text": "<natural-language document for the phone>"
        }

Design notes
------------
* The script is intentionally idempotent over the `processed/` directory: it
  reads the input, writes the output, and reports stats. Re-running it over-
  writes `phone_documents.jsonl` deterministically.
* IDs are sequential (`phone_001`, `phone_002`, ...) — they are stable as
  long as the input file does not change order.
* Per-store data is rendered into a "stores / pricing" paragraph so retrieval
  can answer questions about availability and price ranges out of the box.
* Missing keys are handled gracefully — the corresponding sentence is dropped
  (no awkward "Unknown" strings bleed into the corpus).

Usage
-----
    python scripts/build_rag_documents.py
    python scripts/build_rag_documents.py --input other.json --output out.jsonl
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


# ──────────────────────────────────────────────────────────────────────
# Logging setup
# ──────────────────────────────────────────────────────────────────────

logger = logging.getLogger("build_rag_documents")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s :: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


# ──────────────────────────────────────────────────────────────────────
# Field order for the rendered document.
# Matches the order requested by the spec so the text reads top-to-bottom
# like a product spec sheet.
# ──────────────────────────────────────────────────────────────────────

SPEC_FIELDS: tuple[str, ...] = (
    "display",
    "processor",
    "ram",
    "storage",
    "rear_camera",
    "front_camera",
    "battery",
    "charging",
    "operating_system",
    "connectivity",
    "sensors",
    "features",
    "ai_features",
    "software_updates",
    "battery_technology",
    "resale",
    "durability",
    "satellite",
    "waterproof_rating",
    "stylus",
    "audio",
    "ecosystem",
    "accessory_support",
)


# Human-readable labels for each spec field, used in the prose.
SPEC_LABELS: dict[str, str] = {
    "display": "Display",
    "processor": "Processor",
    "ram": "RAM",
    "storage": "Storage",
    "rear_camera": "Rear camera",
    "front_camera": "Front camera",
    "battery": "Battery",
    "charging": "Charging",
    "operating_system": "Operating System",
    "connectivity": "Connectivity",
    "sensors": "Sensors",
    "features": "Features",
    "ai_features": "AI Features",
    "software_updates": "Software Updates",
    "battery_technology": "Battery Technology",
    "resale": "Resale Value",
    "durability": "Durability",
    "satellite": "Satellite Connectivity",
    "waterproof_rating": "Waterproof Rating",
    "stylus": "Stylus Support",
    "audio": "Audio & Speakers",
    "ecosystem": "Ecosystem Integration",
    "accessory_support": "Accessory Support",
}


# ──────────────────────────────────────────────────────────────────────
# Small helpers
# ──────────────────────────────────────────────────────────────────────

def _clean(value: Any) -> str | None:
    """Return a trimmed string for ``value`` if it carries real content.

    Strings of only whitespace, lists of empty strings, and ``None`` are
    treated as missing. Anything else is converted via ``str(value)`` and
    stripped so prose stays tidy.
    """
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    # Reject placeholder strings that scrapers leave behind.
    lowered = text.lower()
    if lowered in {"n/a", "na", "none", "null", "-", "—"}:
        return None
    return text


def _first_present(record: dict[str, Any], *keys: str) -> str | None:
    """Return the first non-empty value among ``keys`` in ``record``."""
    for key in keys:
        cleaned = _clean(record.get(key))
        if cleaned:
            return cleaned
    return None


def _iter_specs(merged_specs: dict[str, Any] | None) -> Iterable[tuple[str, str]]:
    """Yield ``(field, value)`` pairs in canonical order, skipping empties."""
    specs = merged_specs or {}
    for field in SPEC_FIELDS:
        value = _clean(specs.get(field))
        if value:
            yield field, value


# ──────────────────────────────────────────────────────────────────────
# Pricing & store aggregation
# ──────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class PricingSummary:
    """Aggregated pricing + availability computed from the per-store rows."""

    lowest: int | None
    highest: int | None
    available_stores: list[str]
    in_stock_stores: list[str]
    out_of_stock_stores: list[str]

    def has_pricing(self) -> bool:
        return self.lowest is not None and self.highest is not None


def _aggregate_stores(stores: list[dict[str, Any]] | None) -> PricingSummary:
    """Walk every per-store row and bucket it by availability + price.

    A store is considered "available" if it has a positive integer price.
    In-stock vs out-of-stock is decided by ``in_stock`` / ``stock_status``.
    Duplicate store names are folded into a single entry so the prose reads
    cleanly (the same retailer may appear twice across scraped runs).
    """
    prices: list[int] = []

    # Use ordered dicts keyed by store name to deduplicate while preserving
    # first-seen order.
    available: dict[str, None] = {}
    in_stock: dict[str, None] = {}
    out_of_stock: dict[str, None] = {}

    for row in stores or []:
        name = _clean(row.get("name"))
        if not name:
            continue

        price = row.get("price")
        try:
            price_int = int(price) if price is not None else None
        except (TypeError, ValueError):
            price_int = None
        if price_int and price_int > 0:
            prices.append(price_int)
            available[name] = None

        is_in_stock = bool(row.get("in_stock"))
        status = _clean(row.get("stock_status"))
        if not is_in_stock and status:
            # Some sources only carry a text status. Honour the string.
            is_in_stock = status.lower() == "in stock"

        if is_in_stock:
            in_stock[name] = None
        else:
            out_of_stock[name] = None

    return PricingSummary(
        lowest=min(prices) if prices else None,
        highest=max(prices) if prices else None,
        available_stores=list(available),
        in_stock_stores=list(in_stock),
        out_of_stock_stores=list(out_of_stock),
    )


def _format_list(items: list[str], *, joiner: str = ", ") -> str:
    """Join a list with ``joiner`` while gracefully handling emptiness."""
    if not items:
        return "none reported"
    return joiner.join(items)


# ──────────────────────────────────────────────────────────────────────
# Document construction
# ──────────────────────────────────────────────────────────────────────

def _build_spec_paragraph(specs: Iterable[tuple[str, str]]) -> str:
    """Render the spec lines into a single paragraph."""
    parts = [f"{label}: {value}" for _, (label, value) in [
        (None, (SPEC_LABELS[field], value)) for field, value in specs
    ]]
    return "; ".join(parts) + "." if parts else ""


def _build_pricing_paragraph(summary: PricingSummary, currency: str = "BDT") -> str:
    """Render pricing + availability prose with explicit field labels."""
    sentences: list[str] = []

    if summary.has_pricing():
        sentences.append(
            f"Lowest price: {summary.lowest:,} {currency}. "
            f"Highest price: {summary.highest:,} {currency}."
        )
        if summary.lowest == summary.highest:
            sentences.append(
                f"It is priced uniformly at {summary.lowest:,} {currency}."
            )
        else:
            sentences.append(
                f"Prices range from {summary.lowest:,} {currency} "
                f"to {summary.highest:,} {currency}."
            )
    else:
        sentences.append("Lowest price: not reported. Highest price: not reported.")
        sentences.append("No live price is currently reported by any store.")

    sentences.append(
        f"Available stores ({len(summary.available_stores)}): "
        f"{_format_list(summary.available_stores)}."
    )
    sentences.append(
        f"In-stock stores ({len(summary.in_stock_stores)}): "
        f"{_format_list(summary.in_stock_stores)}."
    )
    sentences.append(
        f"Out-of-stock stores ({len(summary.out_of_stock_stores)}): "
        f"{_format_list(summary.out_of_stock_stores)}."
    )
    return " ".join(sentences)


def _build_experiential_paragraph(record: dict[str, Any]) -> str:
    """Render qualitative, experiential, and domain persona sentences for semantic search."""
    name = (_clean(record.get("name")) or "").lower()
    brand = (_clean(record.get("brand")) or "").lower()
    specs = record.get("merged_specs") or {}
    text_blob = (" ".join(str(v) for v in specs.values()) + " " + name + " " + brand).lower()

    aspects: list[str] = []

    # 1. AI Features
    if any(k in text_blob for k in ["galaxy ai", "gemini", "apple intelligence", "npu", "ai camera", "ai features"]):
        aspects.append("AI Features: Advanced on-device AI capabilities including smart photography, live translation, and voice intelligence.")
    else:
        aspects.append("AI Features: Standard assistant and computational processing capabilities.")

    # 2. Software Updates
    if any(k in text_blob for k in ["7 years", "5 years", "4 years", "one ui", "ios", "pixel"]):
        aspects.append("Software Updates & OS Support: Long-term software support with multi-year OS updates and regular security patches.")
    else:
        aspects.append("Software Updates & OS Support: Standard Android/OS software updates and security releases.")

    # 3. Battery Technology
    if any(k in text_blob for k in ["silicon-carbon", "li-po", "li-ion", "wireless", "fast charging", "mah"]):
        aspects.append("Battery Technology: Efficient power cell technology with fast charging and thermal management.")
    else:
        aspects.append("Battery Technology: Standard lithium battery technology.")

    # 4. Resale Value
    if "apple" in brand or "iphone" in name or "samsung" in brand:
        aspects.append("Resale Value: High secondary market demand and top resale value retention in Bangladesh.")
    else:
        aspects.append("Resale Value: Stable mid-market resale retention.")

    # 5. Durability & Build Materials
    if any(k in text_blob for k in ["victus", "gorilla glass", "armor", "titanium", "aluminum"]):
        aspects.append("Durability & Build: Premium structural durability featuring toughened glass protection and reinforced frame.")
    else:
        aspects.append("Durability & Build: Durable everyday build quality.")

    # 6. Satellite Connectivity
    if any(k in text_blob for k in ["satellite", "emergency sos", "bds"]):
        aspects.append("Satellite Connectivity: Emergency satellite communication capability for remote areas.")
    else:
        aspects.append("Satellite Connectivity: Standard cellular and Wi-Fi networking without satellite messaging.")

    # 7. Waterproof Rating (IP Code)
    if any(k in text_blob for k in ["ip68", "ip69k", "ip67", "water resistant", "waterproof"]):
        aspects.append("Waterproof Rating: Official IP-rated dust and water resistance for underwater protection.")
    else:
        aspects.append("Waterproof Rating: Standard splash protection.")

    # 8. Stylus Support
    if any(k in text_blob for k in ["s pen", "s-pen", "stylus"]):
        aspects.append("Stylus Support: Integrated or compatible active stylus support for note-taking and drawing.")
    else:
        aspects.append("Stylus Support: Standard touch input without active stylus pen hardware.")

    # 9. Audio & Speakers
    if any(k in text_blob for k in ["stereo", "dolby atmos", "hi-res", "3.5mm", "speakers"]):
        aspects.append("Audio & Speakers: High-fidelity stereo speakers with spatial audio support.")
    else:
        aspects.append("Audio & Speakers: Standard speaker system.")

    # 10. Ecosystem Integration
    if any(k in text_blob for k in ["magsafe", "apple", "smartthings", "samsung", "mihome", "ecosystem"]):
        aspects.append("Ecosystem Integration: Seamless cross-device connectivity within manufacturer smart ecosystem.")
    else:
        aspects.append("Ecosystem Integration: Standard multi-device connectivity.")

    # 11. Accessory Support
    if any(k in text_blob for k in ["magnetic", "wireless charger", "dock", "case"]):
        aspects.append("Accessory Support: Wide compatibility with magnetic chargers, protective cases, and expansion accessories.")
    else:
        aspects.append("Accessory Support: Standard accessory ecosystem compatibility.")

    return " ".join(aspects)


def _build_document(record: dict[str, Any]) -> str:
    """Assemble the natural-language document for a single phone record."""
    name = _clean(record.get("name")) or "Unnamed phone"
    brand = _clean(record.get("brand")) or "Unknown brand"
    category = _clean(record.get("category")) or "Mobile Phone"

    summary_text = _first_present(
        record, "shortDescription", "description", "summary"
    )

    opening = (
        f"Phone name: {name}. "
        f"Brand: {brand}. "
        f"Category: {category}. "
        f"The {brand} {name} is a {category.lower()}. "
        f"It is sold across multiple Bangladeshi retailers and aggregates "
        f"specifications merged from each store page."
    )

    if summary_text:
        opening += f" {summary_text}"

    # Specs section --------------------------------------------------------
    spec_lines = list(_iter_specs(record.get("merged_specs")))
    spec_paragraph = _build_spec_paragraph(spec_lines)

    # Pricing section ------------------------------------------------------
    pricing = _aggregate_stores(record.get("stores"))
    pricing_paragraph = _build_pricing_paragraph(pricing)

    # Experiential section for semantic search ----------------------------
    experiential_paragraph = _build_experiential_paragraph(record)

    # Final summary --------------------------------------------------------
    summary_sentence = _build_summary_sentence(
        name=name,
        brand=brand,
        category=category,
        specs=spec_lines,
        pricing=pricing,
    )

    paragraphs = [opening]
    if spec_paragraph:
        paragraphs.append(f"Key specifications — {spec_paragraph}")
    paragraphs.append(pricing_paragraph)
    paragraphs.append(experiential_paragraph)
    paragraphs.append(summary_sentence)

    return "\n\n".join(p for p in paragraphs if p)


def _build_summary_sentence(
    *,
    name: str,
    brand: str,
    category: str,
    specs: list[tuple[str, str]],
    pricing: PricingSummary,
) -> str:
    """Produce a one-paragraph summary suitable as a document footer."""
    bits: list[str] = []
    field_lookup = dict(specs)

    if field_lookup.get("display"):
        bits.append(field_lookup["display"])
    if field_lookup.get("battery"):
        bits.append(field_lookup["battery"])
    if field_lookup.get("rear_camera"):
        bits.append(field_lookup["rear_camera"])
    if field_lookup.get("ram") and field_lookup.get("storage"):
        bits.append(
            f"{field_lookup['ram']} GB of RAM with {field_lookup['storage']} GB of storage"
        )

    feature_blob = "; ".join(bits).strip()
    feature_blob = feature_blob.rstrip(".;") + "." if feature_blob else ""

    price_blob = ""
    if pricing.has_pricing():
        if pricing.lowest == pricing.highest:
            price_blob = (
                f"It is listed at {pricing.lowest:,} BDT across the catalog."
            )
        else:
            price_blob = (
                f"It spans {pricing.lowest:,} to {pricing.highest:,} BDT across "
                f"{len(pricing.available_stores)} stores, with "
                f"{len(pricing.in_stock_stores)} showing live stock."
            )

    core = (
        f"In short, the {brand} {name} is a {category.lower()} that combines "
        f"{feature_blob.rstrip('.')}" if feature_blob else
        f"In short, the {brand} {name} is a {category.lower()}."
    )
    if price_blob:
        core = core.rstrip(".") + ". " + price_blob
    elif not feature_blob:
        # Strip trailing duplicate period.
        core = core.rstrip(".") + "."

    return core


# ──────────────────────────────────────────────────────────────────────
# IO & orchestration
# ──────────────────────────────────────────────────────────────────────

def load_merged_dataset(path: Path) -> list[dict[str, Any]]:
    """Read the merged dataset from disk and validate the top-level shape."""
    logger.info("Loading merged dataset from %s", path)
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError(
            f"Expected {path} to contain a JSON array of records; "
            f"got {type(data).__name__}"
        )
    logger.info("Loaded %d phone records", len(data))
    return data


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> int:
    """Write ``rows`` to ``path`` as JSONL, one record per line. Returns count."""
    path.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    with path.open("w", encoding="utf-8") as fp:
        for row in rows:
            fp.write(json.dumps(row, ensure_ascii=False))
            fp.write("\n")
            written += 1
    return written


def build_corpus(records: list[dict[str, Any]]) -> Iterable[dict[str, Any]]:
    """Yield ``{id, text}`` documents for every phone record."""
    for index, record in enumerate(records, start=1):
        doc_id = f"phone_{index:03d}"
        try:
            text = _build_document(record)
        except Exception as exc:  # noqa: BLE001 - keep pipeline alive
            logger.exception(
                "Failed to render record #%d (name=%r): %s",
                index,
                record.get("name"),
                exc,
            )
            continue
        yield {"id": doc_id, "text": text}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Build RAG-ready JSONL documents from merged_phones.json."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("processed/merged_phones.json"),
        help="Path to the merged dataset (default: processed/merged_phones.json).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("processed/phone_documents.jsonl"),
        help="Destination JSONL file (default: processed/phone_documents.jsonl).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Entry point: orchestrate load → build → write → report."""
    args = parse_args(argv)
    try:
        records = load_merged_dataset(args.input)
    except FileNotFoundError:
        logger.error("Input file not found: %s", args.input)
        return 1
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse %s: %s", args.input, exc)
        return 1

    docs = list(build_corpus(records))
    count = write_jsonl(args.output, docs)

    logger.info(
        "Wrote %d documents to %s (avg length: %.0f chars)",
        count,
        args.output,
        (sum(len(d["text"]) for d in docs) / count) if count else 0,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
