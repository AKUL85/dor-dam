"""
tests/test_compare_engine.py
==============================
Unit tests for the extended Comparison Engine.
Tests model vs model, brand vs brand, series vs series, aspect filtering, and markdown table rendering.
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
from db.models import Phone
from compare.engine import compare_phones, render_markdown, ComparisonResult, ASPECT_DIMENSIONS
from compare.dimensions import ALL_DIMENSION_NAMES


@pytest.fixture
def sample_phones():
    """Create two mock Phone objects for head-to-head comparison."""
    p1 = Phone()
    p1.id = 101
    p1.name = "Samsung Galaxy S25 Ultra"
    p1.brand = "Samsung"
    p1.slug = "samsung-galaxy-s25-ultra"
    p1.price_min = 135000.0
    p1.ram_gb = 12
    p1.storage_gb = 256
    p1.battery_mah = 5000
    p1.charging_w = 45
    p1.display_inches = 6.8
    p1.display_text = "6.8 inch Dynamic AMOLED 2X 120Hz 2600 nits LTPO"
    p1.camera_text = "200 MP OIS + 50 MP 5x Telephoto + 12 MP Ultrawide 8K video"
    p1.processor_text = "Snapdragon 8 Gen 3 for Galaxy"
    p1.os_text = "Android 15, One UI 7, 7 years updates, Galaxy AI"

    p2 = Phone()
    p2.id = 102
    p2.name = "Apple iPhone 17 Pro Max"
    p2.brand = "Apple"
    p2.slug = "apple-iphone-17-pro-max"
    p2.price_min = 160000.0
    p2.ram_gb = 8
    p2.storage_gb = 256
    p2.battery_mah = 4422
    p2.charging_w = 27
    p2.display_inches = 6.7
    p2.display_text = "6.7 inch Super Retina XDR OLED 120Hz ProMotion"
    p2.camera_text = "48 MP OIS + 48 MP 5x Telephoto + 48 MP Ultrawide ProRes"
    p2.processor_text = "Apple A18 Pro"
    p2.os_text = "iOS 19, Apple Intelligence"

    return [p1, p2]


class TestComparisonEngine:
    """Test suite for extended comparison functionality."""

    def test_all_dimension_names_include_ai_features(self):
        assert "AI Features" in ALL_DIMENSION_NAMES

    def test_aspect_dimensions_registry(self):
        assert "camera" in ASPECT_DIMENSIONS
        assert "software" in ASPECT_DIMENSIONS
        assert "ai" in ASPECT_DIMENSIONS
        assert "battery" in ASPECT_DIMENSIONS
        assert "value" in ASPECT_DIMENSIONS

    def test_phone_vs_phone_comparison(self, sample_phones):
        res = compare_phones(sample_phones)
        assert isinstance(res, ComparisonResult)
        assert len(res.phones) == 2
        assert len(res.rows) == len(ALL_DIMENSION_NAMES)
        assert res.recommendation != ""

    def test_aspect_camera_comparison(self, sample_phones):
        camera_dims = ASPECT_DIMENSIONS["camera"]
        res = compare_phones(sample_phones, dimensions=camera_dims)
        assert len(res.rows) == len(camera_dims)
        row_names = [r.dimension for r in res.rows]
        assert "Camera" in row_names
        assert "Photography" in row_names

    def test_aspect_ai_comparison(self, sample_phones):
        ai_dims = ASPECT_DIMENSIONS["ai"]
        res = compare_phones(sample_phones, dimensions=ai_dims)
        row_names = [r.dimension for r in res.rows]
        assert "AI Features" in row_names
        assert "Processor" in row_names

    def test_render_markdown_table_formatting(self, sample_phones):
        res = compare_phones(sample_phones)
        md = render_markdown(res)
        assert md.startswith("# Head-to-head:")
        assert "| Dimension | Samsung Galaxy S25 Ultra | Apple iPhone 17 Pro Max |" in md
        assert "|---" in md
        assert "## Final recommendation" in md
