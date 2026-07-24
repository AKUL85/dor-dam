#!/usr/bin/env python3
"""
Phone Data Preprocessing and Normalization Pipeline

Merges scraped JSON files from different Bangladeshi mobile phone websites,
filters out errors/invalid data, flattens and normalizes specifications,
groups and deduplicates products across stores, and outputs clean JSON and JSONL datasets.
"""

import os
import re
import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Set
from collections import Counter, defaultdict

# Configure logging to write to stderr
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Specification normalization mapping
SPEC_NORMALIZATION = {
    # RAM/Memory
    'ram': ['ram', 'memory', 'system memory'],
    
    # Processor/Chipset
    'processor': ['processor', 'chipset', 'cpu', 'soc', 'system on chip', 'chip'],
    
    # Battery
    'battery': ['battery', 'battery capacity', 'battery size', 'power', 'battery type', 'battery info'],
    
    # Rear Camera
    'rear_camera': ['rear camera', 'main camera', 'back camera', 'primary camera', 'rear camera setup', 'rear 0.3mp primary camera'],
    
    # Front Camera
    'front_camera': ['front camera', 'selfie camera', 'front facing camera', 'selfie'],
    
    # Storage/ROM
    'storage': ['storage', 'rom', 'internal storage', 'memory storage', 'storage capacity', 'capacity'],
    
    # Display/Screen
    'display': ['display', 'screen', 'display size', 'screen size', 'panel', 'display type'],
}

@dataclass
class MergeStats:
    """Statistics tracker for the merging and preprocessing pipeline."""
    files_scanned: int = 0
    files_loaded: int = 0
    files_skipped: int = 0
    invalid_json_count: int = 0
    empty_file_count: int = 0
    total_phones_merged: int = 0
    duplicates_found: int = 0
    duplicates_merged: int = 0
    sources: Counter = field(default_factory=Counter)

    def print_report(self, output_file: Path) -> None:
        """Print the final completion block to stdout."""
        print("=================================")
        print("Merge Complete")
        print(f"Files scanned: {self.files_scanned}")
        print(f"Files loaded: {self.files_loaded}")
        print(f"Phones merged: {self.total_phones_merged}")
        print(f"Sources: {len(self.sources)}")
        print("Output:")
        print(f"{output_file.relative_to(output_file.parents[1]) if len(output_file.parents) > 1 else output_file}")
        print("=================================")


def extract_source_from_filename(filename: str) -> str:
    """
    Infer the source name from the filename.
    
    Examples:
        star-tech-2026-06-19T11-53-57-549Z.json -> Star Tech
        gadget-&-gear-2026-06-21T10-04-16-399Z.json -> Gadget & Gear
        custom-mac-bd-2026-06-28T19-13-20-124Z.json -> Custom Mac BD
    """
    # Extract prefix before timestamp pattern like YYYY-MM-DD
    match = re.match(r'^(.+?)-\d{4}-\d{2}-\d{2}T', filename)
    if match:
        source_part = match.group(1)
    else:
        source_part = filename.replace('.json', '')
        source_part = re.sub(r'-\d{4}-\d{2}-\d{2}.*$', '', source_part)
        
    source = source_part.replace('-', ' ').title()
    # Ensure BD acronym is properly capitalized
    source = re.sub(r'\bBd\b', 'BD', source)
    return source


def should_skip_file(filename: str) -> bool:
    """Determine if a file should be skipped based on name rules."""
    name_lower = filename.lower()
    return 'errors' in name_lower or not filename.endswith('.json')


def flatten_specs(specs: Any) -> Dict[str, Any]:
    """Recursively flatten nested dictionary specifications (e.g. Star Tech specifications)."""
    flat = {}
    if not isinstance(specs, dict):
        return flat
        
    for key, value in specs.items():
        if isinstance(value, dict):
            flat.update(flatten_specs(value))
        else:
            flat[key] = value
    return flat


def normalize_spec_name(spec_name: str) -> str:
    """Normalize specification name to a standard snake_case key."""
    if not spec_name:
        return ""
    
    name_clean = spec_name.lower().strip()
    name_clean = re.sub(r'[\s\-_]+', ' ', name_clean)
    
    # Match against exact mapping variants
    for norm_name, variants in SPEC_NORMALIZATION.items():
        for variant in variants:
            if name_clean == variant:
                return norm_name
                
    # Substring matching for cameras
    if 'front' in name_clean or 'selfie' in name_clean:
        return 'front_camera'
    if 'rear' in name_clean or 'main' in name_clean or 'primary' in name_clean or 'back' in name_clean:
        return 'rear_camera'
        
    # Substring matching for other specs
    for norm_name, variants in SPEC_NORMALIZATION.items():
        for variant in variants:
            if variant in name_clean:
                # Extra check to distinguish ROM capacity vs RAM memory
                if norm_name == 'ram' and any(kw in name_clean for kw in ['storage', 'rom', 'internal', 'capacity']):
                    return 'storage'
                return norm_name
                
    return name_clean.replace(' ', '_')


def clean_phone_name(brand: Optional[str], name: Optional[str]) -> str:
    """Clean phone name of storage, RAM, color, network and warranty variants for matching."""
    brand_lower = (brand or '').lower().strip()
    name_lower = (name or '').lower().strip()
    
    if not name_lower:
        return ""
    
    # Remove brand prefix if present
    if brand_lower and name_lower.startswith(brand_lower):
        name_lower = name_lower[len(brand_lower):].strip()
        
    # Remove common variations
    # 1. RAM/Storage patterns: e.g. "8gb/256gb", "8gb + 256gb", "8/256", "128gb", "256 gb", "4mb"
    name_lower = re.sub(r'\b\d+\s*(?:gb|mb)\s*[\/\+]\s*\d+\s*(?:gb|mb)\b', '', name_lower)
    name_lower = re.sub(r'\b\d+\s*[\/\+]\s*\d+\s*(?:gb|mb)\b', '', name_lower)
    name_lower = re.sub(r'\b\d+\s*(?:gb|mb)\b', '', name_lower)
    name_lower = re.sub(r'\b\d+\s*[\/\+]\s*\d+\b', '', name_lower)
    
    # 2. Network markers: 5G, 4G, LTE, 2G
    name_lower = re.sub(r'\b[2345]g\b|\blte\b', '', name_lower)
    
    # 3. Text in brackets
    name_lower = re.sub(r'[\(\[\{].*?[\)\]\}]', '', name_lower)
    
    # 4. Suffixes (Warranty, pipe separators, claim support, etc.)
    name_lower = re.sub(r'\bwith\s+.*$', '', name_lower)
    name_lower = re.sub(r'\bclaim\s+support\b', '', name_lower)
    name_lower = re.sub(r'\bwaranty\b|\bwarranty\b', '', name_lower)
    name_lower = re.sub(r'\|.*$', '', name_lower)
    
    # Strip special chars, normalize spacing
    name_lower = re.sub(r'[^a-z0-9\s]', '', name_lower)
    name_lower = re.sub(r'\s+', ' ', name_lower).strip()
    
    return name_lower


def generate_product_key(product: Dict[str, Any]) -> str:
    """Generate a unique de-duplication key based on normalized brand and name."""
    brand = product.get('brand') or ''
    brand_clean = brand.lower().strip()
    name = product.get('name') or ''
    cleaned_name = clean_phone_name(brand_clean, name)
    return f"{brand_clean}|{cleaned_name}"


def load_json_file(file_path: Path, stats: MergeStats) -> Optional[Dict[str, Any]]:
    """Safely load and parse a JSON file."""
    try:
        if file_path.stat().st_size == 0:
            logger.warning(f"Skipping empty file: {file_path.name}")
            stats.empty_file_count += 1
            stats.files_skipped += 1
            return None
            
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
            
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in {file_path.name}: {e}")
        stats.invalid_json_count += 1
        stats.files_skipped += 1
        return None
    except Exception as e:
        logger.error(f"Error reading {file_path.name}: {e}")
        stats.files_skipped += 1
        return None


def extract_products_from_json(data: Any, filename: str) -> List[Dict[str, Any]]:
    """Extract list of products from parsed JSON root (handles both lists and objects)."""
    products = []
    
    if isinstance(data, list):
        products = data
    elif isinstance(data, dict):
        if 'products' in data:
            products = data['products']
        elif 'items' in data:
            products = data['items']
        else:
            # Fallback: look for any array that contains dictionary objects
            for key, val in data.items():
                if isinstance(val, list) and len(val) > 0 and isinstance(val[0], dict):
                    products = val
                    break
                    
    if not isinstance(products, list):
        logger.warning(f"Could not extract product list from {filename}")
        return []
        
    return products


def score_product_completeness(product: Dict[str, Any]) -> int:
    """Score product based on the completeness of its specifications and fields."""
    score = 0
    for key, val in product.items():
        if val is not None and val != '' and val != [] and val != {}:
            score += 1
    return score


def merge_product_group(products: List[Dict[str, Any]], stats: MergeStats) -> Dict[str, Any]:
    """Merge a group of duplicate products into a single canonical record with store information."""
    # Find the most complete product to act as base
    group_sorted = sorted(products, key=score_product_completeness, reverse=True)
    base = group_sorted[0].copy()
    
    # Compile store information
    stores = []
    for p in products:
        store_entry = {
            "name": p.get("store", p.get("source", "Unknown")),
            "price": p.get("price"),
            "url": p.get("productUrl"),
            "in_stock": p.get("inStock", False),
            "stock_status": p.get("stockStatus"),
            "scraped_file": p.get("scraped_file")
        }
        
        # Avoid exact duplicates in store listings
        if store_entry not in stores:
            stores.append(store_entry)
            
    base["stores"] = stores
    
    # Merge specifications
    merged_key_specs = {}
    merged_specs = {}
    
    for p in products:
        # 1. Merge keySpecs
        ks = p.get("keySpecs", {})
        if ks and isinstance(ks, dict):
            for k, v in ks.items():
                if v is not None and v != "":
                    norm_k = normalize_spec_name(k)
                    val_str = str(v).strip()
                    if norm_k not in merged_key_specs or len(val_str) > len(str(merged_key_specs[norm_k])):
                        merged_key_specs[norm_k] = v
                        
        # 2. Merge specs (with flattening)
        sp = p.get("specs", {})
        if sp and isinstance(sp, dict):
            flat_sp = flatten_specs(sp)
            for k, v in flat_sp.items():
                if v is not None and v != "":
                    norm_k = normalize_spec_name(k)
                    val_str = str(v).strip()
                    if norm_k not in merged_specs or len(val_str) > len(str(merged_specs[norm_k])):
                        merged_specs[norm_k] = v
                        
    # Populate normalized fields
    base["keySpecs"] = merged_key_specs
    base["specs"] = merged_specs
    
    # Combined/Merged Specifications field
    combined_specs = merged_specs.copy()
    combined_specs.update(merged_key_specs)
    base["merged_specs"] = combined_specs
    
    # Update top-level price to minimum available price
    valid_prices = [s["price"] for s in stores if s["price"] is not None]
    if valid_prices:
        base["price"] = min(valid_prices)
        
    # Update top-level stock status
    base["inStock"] = any(s.get("in_stock") for s in stores)
    
    # Retain all unique source store names
    base["sources"] = list(set(s["name"] for s in stores))
    
    # Update duplicates count
    if len(products) > 1:
        stats.duplicates_found += len(products) - 1
        stats.duplicates_merged += 1
        
    return base


def generate_document_for_embedding(product: Dict[str, Any]) -> str:
    """Generate a rich, natural-language document of the product details."""
    brand = product.get('brand') or 'Unknown'
    name = product.get('name') or 'Unknown'
    category = product.get('category') or 'Mobile Phone'
    
    parts = [f"The {brand} {name} is a {category.lower()}."]
    
    # Add specs in a standard readable order
    combined_specs = product.get('merged_specs', {})
    spec_order = ['processor', 'ram', 'storage', 'display', 'camera', 'rear_camera', 'front_camera', 'battery', 'os', 'network']
    
    spec_sentences = []
    for s_key in spec_order:
        if s_key in combined_specs and combined_specs[s_key]:
            val = str(combined_specs[s_key]).strip()
            if val:
                friendly_name = s_key.replace('_', ' ')
                spec_sentences.append(f"It features {friendly_name}: {val}.")
                
    for s_key, s_val in combined_specs.items():
        if s_key not in spec_order and s_val:
            val = str(s_val).strip()
            if val and len(val) < 200:
                friendly_name = s_key.replace('_', ' ')
                spec_sentences.append(f"It has {friendly_name}: {val}.")
                
    if spec_sentences:
        parts.append(" ".join(spec_sentences))
        
    # Add stores availability
    stores = product.get('stores', [])
    if stores:
        store_descs = []
        for s in stores:
            s_name = s.get('name') or 'Unknown Store'
            s_price = s.get('price')
            s_status = s.get('stock_status') or 'In Stock'
            if s_price:
                store_descs.append(f"{s_name} ({s_price} BDT, {s_status})")
            else:
                store_descs.append(f"{s_name} ({s_status})")
        parts.append(f"It is available at the following stores: {', '.join(store_descs)}.")
        
    # Add short description
    short_desc = product.get('shortDescription')
    if short_desc:
        clean_desc = re.sub(r'<[^>]+>', '', short_desc)
        clean_desc = re.sub(r'\s+', ' ', clean_desc).strip()
        if clean_desc:
            if len(clean_desc) > 300:
                clean_desc = clean_desc[:297] + "..."
            parts.append(clean_desc)
            
    return " ".join(parts)


def scan_and_load_all_files(stats: MergeStats) -> List[Dict[str, Any]]:
    """Scan all potential output directories, load valid JSON files, and extract product lists."""
    cwd_dir = Path.cwd().resolve()
    script_dir = Path(__file__).parent.resolve()
    
    possible_dirs = [
        cwd_dir / 'output',
        cwd_dir / 'backend' / 'output',
        script_dir / 'output',
        script_dir / 'backend' / 'output',
    ]
    
    # Find existing directories with JSON files
    valid_dirs = []
    for d in possible_dirs:
        if d.exists() and d.is_dir():
            json_files = list(d.glob('*.json'))
            valid_json_files = [f for f in json_files if 'errors' not in f.name.lower()]
            if valid_json_files:
                valid_dirs.append(d)
                
    # Unique files by name to prevent loading same file twice
    scanned_files = {}
    for d in valid_dirs:
        for f in d.glob('*.json'):
            if not should_skip_file(f.name):
                # Prefer backend/output if duplicate names exist
                if f.name not in scanned_files or 'backend' in str(f):
                    scanned_files[f.name] = f
                    
    stats.files_scanned = len(scanned_files)
    all_raw_products = []
    
    for filename, filepath in sorted(scanned_files.items()):
        data = load_json_file(filepath, stats)
        if data is None:
            continue
            
        products = extract_products_from_json(data, filename)
        if not products:
            stats.files_skipped += 1
            continue
            
        source = extract_source_from_filename(filename)
        stats.sources[source] += len(products)
        stats.files_loaded += 1
        stats.total_phones_merged += len(products)
        
        for p in products:
            p_meta = p.copy()
            p_meta['source'] = source
            p_meta['scraped_file'] = filename
            all_raw_products.append(p_meta)
            
        logger.info(f"Loaded {len(products)} products from {filename}")
        
    return all_raw_products


def main() -> None:
    """Main execution entrypoint."""
    script_dir = Path(__file__).parent.resolve()
    output_dir = script_dir / 'processed'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / 'merged_phones.json'
    jsonl_file = output_dir / 'phone_documents.jsonl'
    
    stats = MergeStats()
    
    logger.info("=" * 50)
    logger.info("Phone Data Preprocessing Pipeline Starting")
    logger.info("=" * 50)
    
    # 1. Load files
    logger.info("Scanning directories and loading files...")
    raw_products = scan_and_load_all_files(stats)
    
    if not raw_products:
        logger.warning("No products loaded. Pipeline terminated.")
        return
        
    # 2. Group by product key for duplicate merging
    logger.info("Detecting duplicates and merging products...")
    product_groups = defaultdict(list)
    for p in raw_products:
        key = generate_product_key(p)
        product_groups[key].append(p)
        
    merged_products = []
    for key, group in product_groups.items():
        merged = merge_product_group(group, stats)
        merged_products.append(merged)
        
    # 3. Save processed JSON
    logger.info(f"Saving merged data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(merged_products, f, indent=2, ensure_ascii=False)
        
    # 4. Save processed JSONL for embedding
    logger.info(f"Generating and saving JSONL documents to {jsonl_file}...")
    with open(jsonl_file, 'w', encoding='utf-8') as f:
        for p in merged_products:
            doc_text = generate_document_for_embedding(p)
            entry = {
                "id": generate_product_key(p),
                "text": doc_text,
                "metadata": {
                    "brand": p.get("brand"),
                    "name": p.get("name"),
                    "category": p.get("category"),
                    "sources": p.get("sources", []),
                    "num_stores": len(p.get("stores", []))
                }
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            
    # 5. Print statistics report
    stats.print_report(output_file)


if __name__ == '__main__':
    main()
