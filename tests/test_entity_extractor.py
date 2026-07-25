"""
tests/test_entity_extractor.py
===============================
Unit tests for the extended EntityExtractor module.
Verifies extraction of all 25+ domain entities into structured JSON objects.
"""

import sys
import json
from pathlib import Path

# Add workspace root and scripts to python path
ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pytest
from entity_extractor import EntityExtractor, ExtractedEntities


@pytest.fixture
def extractor():
    return EntityExtractor()


class TestEntityExtraction:
    """Test individual entity field extractions."""

    def test_budget_extraction(self, extractor):
        entities = extractor.extract("Best phone under 25000 taka")
        assert entities.budget == 25000.0

    def test_brand_and_model_extraction(self, extractor):
        entities = extractor.extract("Samsung Galaxy S25 Ultra vs iPhone 17")
        assert "Samsung" in entities.brands
        assert "Apple" in entities.brands
        assert entities.brand == "Samsung"
        assert len(entities.models) >= 2

    def test_ai_feature_galaxy_ai(self, extractor):
        entities = extractor.extract("Best phone with Galaxy AI features")
        assert entities.ai_feature == "galaxy_ai"

    def test_ai_feature_gemini(self, extractor):
        entities = extractor.extract("Best phone with Google Gemini built-in")
        assert entities.ai_feature == "gemini"

    def test_camera_feature_telephoto(self, extractor):
        entities = extractor.extract("Best telephoto lens zoom phone")
        assert entities.camera_feature in ("telephoto", "zoom")

    def test_camera_feature_100mp(self, extractor):
        entities = extractor.extract("Phones with 100MP camera")
        assert entities.camera_feature == "100mp"

    def test_processor_snapdragon(self, extractor):
        entities = extractor.extract("Best Snapdragon processor phone under 30k")
        assert entities.processor == "snapdragon"
        assert entities.budget == 30000.0

    def test_battery_technology_silicon_carbon(self, extractor):
        entities = extractor.extract("Best phone with silicon-carbon battery")
        assert entities.battery_technology == "silicon_carbon"

    def test_software_support_clean_android(self, extractor):
        entities = extractor.extract("Best phone with clean Android no bloatware")
        assert entities.software_support == "clean_android"

    def test_ecosystem_apple(self, extractor):
        entities = extractor.extract("Best phone for Apple ecosystem users")
        assert entities.ecosystem == "apple_ecosystem"

    def test_travel_roaming(self, extractor):
        entities = extractor.extract("Best unlocked phone for international travel roaming")
        assert entities.travel == "international_roaming"

    def test_resale_value(self, extractor):
        entities = extractor.extract("Which phone brand has best resale value in BD")
        assert entities.resale == "high_resale_value"

    def test_refurbished_preowned(self, extractor):
        entities = extractor.extract("Certified pre-owned iPhone worth buying")
        assert entities.refurbished == "certified_pre_owned"

    def test_sustainability_recycled(self, extractor):
        entities = extractor.extract("Best phone made with recycled materials")
        assert entities.sustainability == "recycled_materials"

    def test_charging_fast_wireless(self, extractor):
        entities = extractor.extract("Fastest wireless charging phone 120W")
        assert entities.charging in ("wireless_charging", "120w")

    def test_display_type_amoled(self, extractor):
        entities = extractor.extract("Best AMOLED display phone with 120Hz refresh rate")
        assert entities.display_type in ("amoled", "120hz")

    def test_gaming_cooling(self, extractor):
        entities = extractor.extract("Best phone with cooling system for heavy gaming")
        assert entities.gaming in ("cooling_system", "esports_gaming")

    def test_persona_student(self, extractor):
        entities = extractor.extract("Best phone for students under 20k")
        assert entities.persona == "student"

    def test_waterproof_rating_ip68(self, extractor):
        entities = extractor.extract("IP68 waterproof phone under 30k")
        assert entities.waterproof_rating == "ip68"

    def test_foldable_form_factor(self, extractor):
        entities = extractor.extract("Best foldable flip phone in Bangladesh")
        assert entities.foldable in ("foldable", "flip")

    def test_stylus_flag(self, extractor):
        entities = extractor.extract("Best phone with S Pen stylus support")
        assert entities.stylus is True

    def test_satellite_flag(self, extractor):
        entities = extractor.extract("Best phone with satellite SOS feature")
        assert entities.satellite is True

    def test_network_5g(self, extractor):
        entities = extractor.extract("Best dual-SIM 5G phone")
        assert entities.network in ("5g", "dual_5g")

    def test_esim_flag(self, extractor):
        entities = extractor.extract("Best phone with eSIM support")
        assert entities.esim is True

    def test_isim_flag(self, extractor):
        entities = extractor.extract("Best phone with iSIM support")
        assert entities.isim is True

    def test_wifi_version(self, extractor):
        entities = extractor.extract("Best phone with Wi-Fi 7")
        assert entities.wifi_version == "wifi_7"

    def test_uwb_flag(self, extractor):
        entities = extractor.extract("Best phone with UWB for tracking")
        assert entities.uwb is True


class TestStructuredJsonSerialization:
    """Test structured JSON and dictionary export functionality."""

    def test_to_dict_format(self, extractor):
        entities = extractor.extract("Best phone with Galaxy AI and eSIM under 50k taka")
        data_dict = entities.to_dict()
        assert isinstance(data_dict, dict)
        assert data_dict["budget"] == 50000.0
        assert data_dict["ai_feature"] == "galaxy_ai"
        assert data_dict["esim"] is True

    def test_to_json_format(self, extractor):
        entities = extractor.extract("Best AMOLED display phone with 100MP camera")
        json_str = entities.to_json(indent=2)
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict)
        assert parsed["camera_feature"] == "100mp"
        assert parsed["display_type"] == "amoled"
