#!/usr/bin/env python3
"""
Advanced Phone Data Preprocessing Pipeline

Merges JSON files from multiple Bangladeshi mobile phone websites into a unified dataset.
Features:
- Duplicate detection and merging
- Specification normalization
- JSONL document generation for embedding
- Comprehensive statistics
"""

import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Set
from collections import Counter, defaultdict
import re
from datetime import datetime


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class MergeStats:
    """Statistics for the merge operation."""
    files_scanned: int = 0
    files_loaded: int = 0
    files_skipped: int = 0
    invalid_json_count: int = 0
    empty_file_count: int = 0
    total_phones_merged: int = 0
    duplicates_found: int = 0
    duplicates_merged: int = 0
    sources: Counter = field(default_factory=Counter)
    
    def __str__(self) -> str:
        """Return formatted statistics."""
        return (
            f"Files scanned: {self.files_scanned}\n"
            f"Files loaded: {self.files_loaded}\n"
            f"Files skipped: {self.files_skipped}\n"
            f"Invalid JSON count: {self.invalid_json_count}\n"
            f"Empty file count: {self.empty_file_count}\n"
            f"Total phones merged: {self.total_phones_merged}\n"
            f"Duplicates found: {self.duplicates_found}\n"
            f"Duplicates merged: {self.duplicates_merged}\n"
            f"Unique phones after deduplication: {self.total_phones_merged - self.duplicates_merged}\n"
            f"Number of sources: {len(self.sources)}\n"
            f"Phone count per source:\n"
        ) + "\n".join(f"  {source}: {count}" for source, count in self.sources.most_common())


# Specification normalization mapping
SPEC_NORMALIZATION = {
    # RAM/Memory
    'ram': ['ram', 'memory', 'memory size', 'ram size', 'system memory'],
    
    # Processor/Chipset
    'processor': ['processor', 'chipset', 'cpu', 'soc', 'system on chip', 'chip'],
    
    # Battery
    'battery': ['battery', 'battery capacity', 'battery size', 'power', 'battery type'],
    
    # Rear Camera
    'rear_camera': ['rear camera', 'main camera', 'back camera', 'primary camera', 'rear camera setup'],
    
    # Front Camera
    'front_camera': ['front camera', 'selfie camera', 'front facing camera', 'selfie'],
    
    # Storage/ROM
    'storage': ['storage', 'rom', 'internal storage', 'memory storage', 'storage capacity'],
    
    # Display/Screen
    'display': ['display', 'screen', 'display size', 'screen size', 'panel', 'display type'],
    
    # Operating System
    'os': ['os', 'operating system', 'android version', 'ios version', 'software'],
    
    # Network
    'network': ['network', 'network type', 'connectivity', 'network support', 'generation'],
    
    # Other common specs
    'weight': ['weight', 'device weight'],
    'dimensions': ['dimensions', 'size', 'body dimensions'],
    'sim': ['sim', 'sim type', 'sim slot'],
    'gpu': ['gpu', 'graphics', 'graphics processor'],
    'nfc': ['nfc', 'near field communication'],
    'fingerprint': ['fingerprint', 'fingerprint sensor', 'fingerprint scanner'],
    'face_unlock': ['face unlock', 'face recognition', 'face id'],
}


def normalize_spec_name(spec_name: Optional[str]) -> str:
    """
    Normalize specification name to standard format.
    
    Args:
        spec_name: Original specification name
        
    Returns:
        Normalized specification name
    """
    if not spec_name:
        return spec_name
    
    spec_lower = spec_name.lower().strip()
    
    # Check against normalization mapping
    for normalized_name, variants in SPEC_NORMALIZATION.items():
        for variant in variants:
            if variant in spec_lower or spec_lower in variant:
                return normalized_name
    
    # Return original if no match found
    return spec_name


def normalize_specs(specs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize all specification keys in a specs dictionary.
    
    Args:
        specs: Dictionary of specifications
        
    Returns:
        Dictionary with normalized keys
    """
    normalized = {}
    
    for key, value in specs.items():
        normalized_key = normalize_spec_name(key)
        normalized[normalized_key] = value
    
    return normalized


def extract_source_from_filename(filename: str) -> str:
    """
    Extract source name from filename.
    
    Args:
        filename: The filename to extract source from
        
    Returns:
        Formatted source name
    """
    # Remove timestamp and .json extension
    match = re.match(r'^(.+?)-\d{4}-\d{2}-\d{2}T', filename)
    if match:
        source_part = match.group(1)
    else:
        source_part = filename.replace('.json', '')
        source_part = re.sub(r'-\d{4}-\d{2}-\d{2}.*$', '', source_part)
    
    # Convert to title case and replace hyphens with spaces
    source = source_part.replace('-', ' ').title()
    
    return source


def should_skip_file(filename: str) -> bool:
    """Determine if a file should be skipped based on its name."""
    if 'errors' in filename.lower():
        return True
    if not filename.endswith('.json'):
        return True
    return False


def load_json_file(file_path: Path) -> Optional[Dict[str, Any]]:
    """Load and parse a JSON file safely."""
    try:
        if file_path.stat().st_size == 0:
            logger.warning(f"Empty file: {file_path.name}")
            return None
            
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        return data
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in {file_path.name}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error loading {file_path.name}: {e}")
        return None


def extract_products_from_json(data: Any, filename: str) -> List[Dict[str, Any]]:
    """Extract product list from JSON data, handling both list and object roots."""
    products = []
    
    if isinstance(data, list):
        products = data
    elif isinstance(data, dict):
        if 'products' in data:
            products = data['products']
        elif 'items' in data:
            products = data['items']
        else:
            for key, value in data.items():
                if isinstance(value, list) and len(value) > 0:
                    if isinstance(value[0], dict):
                        products = value
                        break
    
    if not isinstance(products, list):
        logger.warning(f"Could not extract product list from {filename}")
        return []
    
    return products


def add_source_metadata(product: Dict[str, Any], source: str, filename: str) -> Dict[str, Any]:
    """Add source and scraped_file metadata to a product."""
    product_with_metadata = product.copy()
    product_with_metadata['source'] = source
    product_with_metadata['scraped_file'] = filename
    return product_with_metadata


def generate_product_key(product: Dict[str, Any]) -> str:
    """
    Generate a unique key for a product based on brand and name.
    This is used for duplicate detection.
    
    Args:
        product: Product dictionary
        
    Returns:
        Unique key string
    """
    brand = product.get('brand', '').lower().strip()
    name = product.get('name', '').lower().strip()
    
    # Remove common variations and extra spaces
    name = re.sub(r'\s+', ' ', name)
    name = re.sub(r'\(\d+gb\)', '', name)  # Remove storage variants
    name = re.sub(r'\(\d+gb\/\d+gb\)', '', name)  # Remove RAM/Storage variants
    
    return f"{brand}|{name}"


def merge_duplicate_products(products: List[Dict[str, Any]], stats: MergeStats) -> List[Dict[str, Any]]:
    """
    Merge duplicate products from different sources.
    
    Args:
        products: List of product dictionaries
        stats: MergeStats object to track statistics
        
    Returns:
        List of merged products with store information
    """
    # Group products by their unique key
    product_groups = defaultdict(list)
    
    for product in products:
        key = generate_product_key(product)
        product_groups[key].append(product)
    
    merged_products = []
    
    for key, group in product_groups.items():
        if len(group) == 1:
            # No duplicates, keep as is
            merged_products.append(group[0])
        else:
            # Duplicates found - merge them
            stats.duplicates_found += len(group) - 1
            stats.duplicates_merged += 1
            
            # Create merged product
            merged = merge_product_group(group)
            merged_products.append(merged)
    
    return merged_products


def merge_product_group(products: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge a group of duplicate products into a single record.
    
    Args:
        products: List of duplicate product dictionaries
        
    Returns:
        Merged product dictionary with store information
    """
    # Use the first product as base
    base = products[0].copy()
    
    # Create stores list
    stores = []
    
    for product in products:
        store_info = {
            'name': product.get('store', product.get('source', 'Unknown')),
            'price': product.get('price'),
            'url': product.get('productUrl'),
            'in_stock': product.get('inStock'),
            'stock_status': product.get('stockStatus'),
            'source_file': product.get('scraped_file')
        }
        stores.append(store_info)
    
    # Add stores list to base product
    base['stores'] = stores
    
    # Merge specifications from all sources (preserve all unique values)
    all_specs = {}
    
    for product in products:
        # Merge keySpecs
        if 'keySpecs' in product and product['keySpecs']:
            for spec_key, spec_value in product['keySpecs'].items():
                if spec_value is not None and spec_value != '':
                    normalized_key = normalize_spec_name(spec_key)
                    all_specs[normalized_key] = spec_value
        
        # Merge specs if present
        if 'specs' in product and product['specs']:
            for spec_key, spec_value in product['specs'].items():
                if spec_value is not None and spec_value != '':
                    normalized_key = normalize_spec_name(spec_key)
                    all_specs[normalized_key] = spec_value
    
    # Update base with merged specs
    if all_specs:
        base['merged_specs'] = all_specs
    
    # Keep original source for reference
    base['sources'] = list(set(p.get('source', p.get('store', 'Unknown')) for p in products))
    
    return base


def generate_document_for_embedding(product: Dict[str, Any]) -> str:
    """
    Generate a natural-language document for a product, ready for embedding.
    
    Args:
        product: Product dictionary
        
    Returns:
        Natural language document string
    """
    brand = product.get('brand', 'Unknown')
    name = product.get('name', 'Unknown')
    category = product.get('category', 'Mobile Phone')
    
    # Start with basic info
    document_parts = [
        f"The {brand} {name} is a {category.lower()}."
    ]
    
    # Add specifications if available
    if 'merged_specs' in product:
        specs = product['merged_specs']
        spec_sentences = []
        
        for spec_key, spec_value in specs.items():
            if spec_value and spec_value != '':
                spec_sentences.append(f"It features {spec_key}: {spec_value}.")
        
        if spec_sentences:
            document_parts.append(" ".join(spec_sentences))
    
    # Add store information
    if 'stores' in product:
        stores = product['stores']
        if len(stores) == 1:
            store = stores[0]
            price = store.get('price')
            if price:
                document_parts.append(f"It is available at {store['name']} for {price} BDT.")
            else:
                document_parts.append(f"It is available at {store['name']}.")
        else:
            store_names = ", ".join(s['name'] for s in stores)
            prices = [s['price'] for s in stores if s.get('price')]
            if prices:
                min_price = min(prices)
                max_price = max(prices)
                if min_price == max_price:
                    document_parts.append(f"It is available at {store_names} for {min_price} BDT.")
                else:
                    document_parts.append(f"It is available at {store_names} with prices ranging from {min_price} to {max_price} BDT.")
            else:
                document_parts.append(f"It is available at {store_names}.")
    
    # Add description if available
    if 'shortDescription' in product and product['shortDescription']:
        # Clean up description (remove HTML-like content)
        desc = product['shortDescription']
        desc = re.sub(r'<[^>]+>', '', desc)
        desc = re.sub(r'\s+', ' ', desc).strip()
        if len(desc) > 200:
            desc = desc[:200] + "..."
        document_parts.append(desc)
    
    return " ".join(document_parts)


def save_jsonl_documents(products: List[Dict[str, Any]], output_path: Path) -> None:
    """
    Save products as JSONL documents for embedding.
    
    Args:
        products: List of product dictionaries
        output_path: Path to save the JSONL file
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for product in products:
            document = generate_document_for_embedding(product)
            jsonl_entry = {
                'id': generate_product_key(product),
                'text': document,
                'metadata': {
                    'brand': product.get('brand'),
                    'name': product.get('name'),
                    'category': product.get('category'),
                    'sources': product.get('sources', [product.get('source')]),
                    'num_stores': len(product.get('stores', []))
                }
            }
            f.write(json.dumps(jsonl_entry, ensure_ascii=False) + '\n')
    
    logger.info(f"Saved JSONL documents to {output_path}")


def scan_and_merge_files(
    input_dir: Path, 
    stats: MergeStats
) -> List[Dict[str, Any]]:
    """Scan directory and merge all valid JSON files."""
    all_products = []
    
    json_files = sorted(input_dir.glob('*.json'))
    
    for file_path in json_files:
        stats.files_scanned += 1
        filename = file_path.name
        
        if should_skip_file(filename):
            stats.files_skipped += 1
            logger.debug(f"Skipping: {filename}")
            continue
        
        data = load_json_file(file_path)
        
        if data is None:
            stats.invalid_json_count += 1
            continue
        
        if file_path.stat().st_size == 0:
            stats.empty_file_count += 1
            stats.files_skipped += 1
            continue
        
        source = extract_source_from_filename(filename)
        products = extract_products_from_json(data, filename)
        
        if not products:
            logger.warning(f"No products found in {filename}")
            stats.files_skipped += 1
            continue
        
        for product in products:
            product_with_metadata = add_source_metadata(product, source, filename)
            all_products.append(product_with_metadata)
        
        stats.files_loaded += 1
        stats.total_phones_merged += len(products)
        stats.sources[source] += len(products)
        
        logger.info(f"Loaded {len(products)} products from {filename}")
    
    return all_products


def save_merged_data(
    products: List[Dict[str, Any]], 
    output_path: Path
) -> None:
    """Save merged products to JSON file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved merged data to {output_path}")


def main():
    """Main execution function."""
    script_dir = Path(__file__).parent
    input_dir = script_dir / 'output'
    output_dir = script_dir / 'processed'
    output_file = output_dir / 'merged_phones.json'
    jsonl_file = output_dir / 'phone_documents.jsonl'
    
    stats = MergeStats()
    
    logger.info("=" * 50)
    logger.info("Advanced Phone Data Merge Pipeline")
    logger.info("=" * 50)
    logger.info(f"Input directory: {input_dir}")
    logger.info(f"Output file: {output_file}")
    logger.info(f"JSONL file: {jsonl_file}")
    
    if not input_dir.exists():
        logger.error(f"Input directory does not exist: {input_dir}")
        return
    
    # Scan and merge files
    logger.info("Scanning and merging files...")
    merged_products = scan_and_merge_files(input_dir, stats)
    
    if not merged_products:
        logger.warning("No products to merge")
        return
    
    # Merge duplicates
    logger.info("Detecting and merging duplicates...")
    deduplicated_products = merge_duplicate_products(merged_products, stats)
    
    # Save merged data
    save_merged_data(deduplicated_products, output_file)
    
    # Generate JSONL documents
    logger.info("Generating JSONL documents for embedding...")
    save_jsonl_documents(deduplicated_products, jsonl_file)
    
    # Print summary
    logger.info("=" * 50)
    logger.info("Merge Complete")
    logger.info("=" * 50)
    logger.info(str(stats))
    logger.info(f"Output: {output_file}")
    logger.info(f"JSONL: {jsonl_file}")
    logger.info("=" * 50)


if __name__ == '__main__':
    main()
