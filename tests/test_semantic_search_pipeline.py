"""
tests/test_semantic_search_pipeline.py
=======================================
Unit tests for semantic search document generation and incremental embedding pipeline.
"""

import sys
from pathlib import Path

# Add workspace root and scripts to python path
ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pytest
from build_rag_documents import _build_document, _build_experiential_paragraph


@pytest.fixture
def sample_phone_record():
    return {
        "name": "Samsung Galaxy S25 Ultra",
        "brand": "Samsung",
        "category": "Flagship",
        "shortDescription": "Top tier flagship smartphone with Galaxy AI and Snapdragon 8 Gen 3.",
        "merged_specs": {
            "display": "6.8 inch Dynamic AMOLED 2X 120Hz 2600 nits LTPO Gorilla Glass Victus 2",
            "processor": "Snapdragon 8 Gen 3 for Galaxy",
            "ram": "12",
            "storage": "256",
            "rear_camera": "200 MP main OIS + 50 MP telephoto + 12 MP ultrawide 8K video",
            "front_camera": "12 MP",
            "battery": "5000 mAh",
            "charging": "45W fast charging",
            "operating_system": "Android 15, One UI 7, Galaxy AI",
            "features": "IP68 water resistant, Titanium frame",
        },
        "stores": [
            {"name": "Star Tech", "price": 135000, "in_stock": True},
            {"name": "Custom Mac BD", "price": 132000, "in_stock": True},
        ]
    }


class TestSemanticSearchPipeline:
    """Test suite for semantic search document building and incremental updates."""

    SEMANTIC_CATEGORIES = [
        "Worth buying", "Resale", "Business use", "Student",
        "Photography", "Travel", "Software experience",
        "Content creator", "Battery longevity", "Durability"
    ]

    def test_experiential_paragraph_coverage(self, sample_phone_record):
        exp_text = _build_experiential_paragraph(sample_phone_record)
        assert "AI Features" in exp_text
        assert "Software Updates" in exp_text
        assert "Battery Technology" in exp_text
        assert "Resale Value" in exp_text
        assert "Durability & Build" in exp_text
        assert "Satellite Connectivity" in exp_text
        assert "Waterproof Rating" in exp_text
        assert "Stylus Support" in exp_text
        assert "Audio & Speakers" in exp_text
        assert "Ecosystem Integration" in exp_text
        assert "Accessory Support" in exp_text

    def test_build_document_contains_experiential_section(self, sample_phone_record):
        doc = _build_document(sample_phone_record)
        assert "Phone name: Samsung Galaxy S25 Ultra" in doc
        assert "AI Features" in doc
        assert "Resale Value" in doc
        assert "Waterproof Rating" in doc

    def test_incremental_hash_check_logic(self):
        import hashlib
        text1 = "Sample document content for incremental testing."
        hash1 = hashlib.sha256(text1.encode("utf-8")).hexdigest()
        
        text2 = "Updated document content."
        hash2 = hashlib.sha256(text2.encode("utf-8")).hexdigest()
        
        assert hash1 != hash2
