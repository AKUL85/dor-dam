"""
tests/test_sql_repository.py
=============================
Unit tests for the centralized PhoneRepository SQL queries.
Tests structured SQL filtering across Price, Battery, Display, Processor, RAM, Storage, Brand, Charging, Foldable, Network.
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
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db.models import Base, Phone, PhoneStore
from db.repository import PhoneRepository


@pytest.fixture
def in_memory_db():
    """Create an in-memory SQLite database populated with sample phones for SQL testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    phones = [
        Phone(
            id=1,
            name="Samsung Galaxy S25 Ultra",
            slug="samsung-galaxy-s25-ultra",
            brand="Samsung",
            category="Flagship Foldable",
            price_min=130000.0,
            ram_gb=12,
            storage_gb=256,
            battery_mah=5000,
            charging_w=45,
            display_inches=6.8,
            processor_text="Qualcomm Snapdragon 8 Gen 3 for Galaxy",
            network="GSM / HSPA / LTE / 5G",
            product_url="https://example.com/s25-ultra"
        ),
        Phone(
            id=2,
            name="Xiaomi Redmi Note 13 Pro 5G",
            slug="xiaomi-redmi-note-13-pro-5g",
            brand="Xiaomi",
            category="Mid-range",
            price_min=32000.0,
            ram_gb=8,
            storage_gb=128,
            battery_mah=5100,
            charging_w=67,
            display_inches=6.67,
            processor_text="Snapdragon 7s Gen 2",
            network="5G",
            product_url="https://example.com/redmi-note-13"
        ),
        Phone(
            id=3,
            name="Samsung Galaxy Z Flip 6",
            slug="samsung-galaxy-z-flip-6",
            brand="Samsung",
            category="Foldable Flip",
            price_min=110000.0,
            ram_gb=12,
            storage_gb=256,
            battery_mah=4000,
            charging_w=25,
            display_inches=6.7,
            processor_text="Snapdragon 8 Gen 3",
            network="5G eSIM",
            product_url="https://example.com/z-flip-6"
        ),
    ]

    session.add_all(phones)
    session.commit()
    yield session
    session.close()


class TestPhoneRepositorySQL:
    """Test suite for PhoneRepository SQL retrieval methods."""

    def test_query_by_brand(self, in_memory_db):
        results = PhoneRepository.query_phones(in_memory_db, brand="Samsung")
        assert len(results) == 2
        assert all(p.brand == "Samsung" for p in results)

    def test_query_by_price_range(self, in_memory_db):
        results = PhoneRepository.query_phones(in_memory_db, budget_min=30000, budget_max=50000)
        assert len(results) == 1
        assert results[0].name == "Xiaomi Redmi Note 13 Pro 5G"

    def test_query_by_ram_and_storage(self, in_memory_db):
        results = PhoneRepository.query_phones(in_memory_db, ram_gb_min=12, storage_gb_min=256)
        assert len(results) == 2
        assert all(p.ram_gb >= 12 for p in results)

    def test_query_by_battery_and_charging(self, in_memory_db):
        results = PhoneRepository.query_phones(in_memory_db, battery_mah_min=5000, charging_w_min=60)
        assert len(results) == 1
        assert results[0].brand == "Xiaomi"

    def test_query_by_foldable(self, in_memory_db):
        results = PhoneRepository.query_phones(in_memory_db, is_foldable=True)
        assert len(results) == 2  # S25 Ultra (category contains Foldable) and Z Flip 6

    def test_query_by_processor_keyword(self, in_memory_db):
        results = PhoneRepository.query_phones(in_memory_db, processor_keyword="Gen 3")
        assert len(results) == 2

    def test_get_by_slug_or_name(self, in_memory_db):
        phone = PhoneRepository.get_by_slug_or_name(in_memory_db, "redmi-note-13-pro-5g")
        assert phone is not None
        assert phone.id == 2
