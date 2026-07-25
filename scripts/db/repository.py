"""
scripts/db/repository.py
========================

Centralized SQL Retrieval Repository for the DorDam catalog database.
Provides reusable, indexed SQLAlchemy queries over scalar and text specification fields.

Supported SQL Retrieval Filters:
- Price / Budget (price_min, price_max, budget ranges)
- Brand (canonical brand matching)
- RAM (ram_gb_min, ram_gb)
- Storage (storage_gb_min, storage_gb)
- Battery (battery_mah_min, battery_mah)
- Charging (charging_w_min, charging_w)
- Display (display_inches_min, display_inches_max, high refresh rate)
- Processor (Snapdragon, Dimensity, Apple Bionic/Pro, Tensor)
- Foldable / Form Factor (category, flip, fold)
- Network (5G, eSIM, satellite)
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Sequence
from sqlalchemy import or_, select, and_
from sqlalchemy.orm import Session

from db.models import Phone, PhoneStore

logger = logging.getLogger("db.repository")


class PhoneRepository:
    """Unified repository for executing structured SQL queries against the Phone catalog."""

    @staticmethod
    def query_phones(
        session: Session,
        *,
        brand: Optional[str] = None,
        budget_min: Optional[float] = None,
        budget_max: Optional[float] = None,
        ram_gb_min: Optional[int] = None,
        storage_gb_min: Optional[int] = None,
        battery_mah_min: Optional[int] = None,
        charging_w_min: Optional[int] = None,
        display_inches_min: Optional[float] = None,
        display_inches_max: Optional[float] = None,
        processor_keyword: Optional[str] = None,
        is_foldable: Optional[bool] = None,
        is_5g: Optional[bool] = None,
        category: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Phone]:
        """Execute a multi-criteria SQL retrieval query over indexed columns."""
        stmt = select(Phone).where(Phone.price_min > 0)

        # 1. Brand Filter (Indexed B-tree)
        if brand:
            stmt = stmt.where(Phone.brand.ilike(brand.strip()))

        # 2. Price / Budget Range (Indexed B-tree)
        if budget_min is not None:
            stmt = stmt.where(Phone.price_min >= budget_min)
        if budget_max is not None:
            stmt = stmt.where(Phone.price_min <= budget_max)

        # 3. RAM Filter (Indexed B-tree)
        if ram_gb_min is not None:
            stmt = stmt.where(or_(Phone.ram_gb >= ram_gb_min, Phone.ram_gb.is_(None)))

        # 4. Storage Filter (Indexed B-tree)
        if storage_gb_min is not None:
            stmt = stmt.where(or_(Phone.storage_gb >= storage_gb_min, Phone.storage_gb.is_(None)))

        # 5. Battery mAh Filter (Indexed B-tree)
        if battery_mah_min is not None:
            stmt = stmt.where(or_(Phone.battery_mah >= battery_mah_min, Phone.battery_mah.is_(None)))

        # 6. Charging Wattage Filter
        if charging_w_min is not None:
            stmt = stmt.where(or_(Phone.charging_w >= charging_w_min, Phone.charging_w.is_(None)))

        # 7. Display Inches Filter
        if display_inches_min is not None:
            stmt = stmt.where(Phone.display_inches >= display_inches_min)
        if display_inches_max is not None:
            stmt = stmt.where(Phone.display_inches <= display_inches_max)

        # 8. Processor Keyword Search (Indexed Text)
        if processor_keyword:
            stmt = stmt.where(Phone.processor_text.ilike(f"%{processor_keyword}%"))

        # 9. Foldable Form Factor Filter
        if is_foldable is True:
            stmt = stmt.where(
                or_(
                    Phone.category.ilike("%fold%"),
                    Phone.category.ilike("%flip%"),
                    Phone.name.ilike("%fold%"),
                    Phone.name.ilike("%flip%"),
                )
            )

        # 10. 5G Network Filter
        if is_5g is True:
            stmt = stmt.where(or_(Phone.network.ilike("%5G%"), Phone.name.ilike("%5G%")))

        # 11. Category Filter
        if category:
            stmt = stmt.where(Phone.category.ilike(f"%{category}%"))

        # Order by price_min ascending for budget queries, or id
        stmt = stmt.order_by(Phone.price_min.asc().nullslast()).offset(offset).limit(limit)

        return list(session.scalars(stmt).all())

    @staticmethod
    def get_by_slug_or_name(session: Session, name_or_slug: str) -> Optional[Phone]:
        """SQL lookup for a single phone by exact slug or ilike name match."""
        name = name_or_slug.strip()
        if not name:
            return None
        
        # Exact slug match
        exact = session.execute(select(Phone).where(Phone.slug == name.lower())).scalar_one_or_none()
        if exact:
            return exact

        # Fuzzy name match
        return session.execute(
            select(Phone).where(or_(Phone.name.ilike(f"%{name}%"), Phone.slug.ilike(f"%{name}%"))).limit(1)
        ).scalar_one_or_none()

    @staticmethod
    def get_store_offers(session: Session, phone_id: int) -> List[PhoneStore]:
        """SQL retrieval for store listings and live pricing for a phone."""
        stmt = select(PhoneStore).where(PhoneStore.phone_id == phone_id, PhoneStore.in_stock.is_(True))
        return list(session.scalars(stmt).all())
