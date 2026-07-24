"""SQLAlchemy ORM models for the DorDam phone catalogue.

Schema overview
---------------

``phones`` (one row per *unique* ``productUrl``):

* Identity columns — ``id`` (PK), ``slug``, ``name``, ``brand``, ``category``,
  ``product_url`` (UNIQUE), ``image_url``.
* Spec columns (all NULLABLE because source coverage is uneven).  We
  expose both:

  - Normalised scalars that the index layer can sort / filter on
    (``ram_gb``, ``storage_gb``, ``price_min``, ``price_max``, …).
  - Free-text columns that retain the source phrasing
    (``display_text``, ``processor_text``, ``camera_text``,
    ``battery_text``, ``os``, ``network``).

* Provenance columns — ``first_seen_at``, ``updated_at``, ``source_hash``
  used by the incremental importer. ``source_hash`` is a SHA-256 over the
  canonical JSON of the merged record — when it changes we update,
  otherwise we skip.

``phone_stores`` (one row per *listing* of a phone at a given store):

* Foreign key ``phone_id`` → ``phones.id``.
* Listing-level details — ``store_name``, ``store_url``, ``price``,
  ``original_price``, ``discount_amount``, ``discount_pct``,
  ``in_stock``, ``stock_status``, ``short_description``, ``scraped_file``,
  ``scraped_at``.

Indexes
-------

The user explicitly asked for indexes on **brand, price, processor,
display, battery, camera, storage, RAM**. We map those to:

* ``phones.brand``           → single-column B-tree.
* ``phones.price_min``       → single-column B-tree (lowest store price).
* ``phones.processor_text``  → single-column B-tree (trigram would be
  better on Postgres, B-tree is the cross-dialect default).
* ``phones.display_text``    → same idea.
* ``phones.battery_text``    → same idea.
* ``phones.camera_text``     → same idea.
* ``phones.storage_gb``      → single-column B-tree.
* ``phones.ram_gb``          → single-column B-tree.

Additional indexes added for performance and integrity:

* UNIQUE ``phones.product_url``  → idempotent upserts.
* ``phones.category``           → filter by product type.
* UNIQUE ``phone_stores(phone_id, store_url)`` → dedupe listings.
* ``phone_stores.store_name``   → "where can I buy?" filters.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Shared declarative base."""

    pass


# ──────────────────────────────────────────────────────────────────────
# Phone
# ──────────────────────────────────────────────────────────────────────

class Phone(Base):
    """One physical phone model on the DorDam catalogue."""

    __tablename__ = "phones"

    # --- Identity -----------------------------------------------------
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    product_url: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    # --- Normalised spec scalars -------------------------------------
    ram_gb: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    storage_gb: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    display_inches: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    battery_mah: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    charging_w: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    price_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # --- Free-text spec columns ---------------------------------------
    display_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processor_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    battery_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    camera_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    os: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    network: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # --- Provenance --------------------------------------------------
    source_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    stores: Mapped[list["PhoneStore"]] = relationship(
        back_populates="phone",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        # The 8 required indexes (single-column B-tree).
        Index("ix_phones_brand", "brand"),
        Index("ix_phones_price", "price_min"),
        Index("ix_phones_processor", "processor_text"),
        Index("ix_phones_display", "display_text"),
        Index("ix_phones_battery", "battery_text"),
        Index("ix_phones_camera", "camera_text"),
        Index("ix_phones_storage", "storage_gb"),
        Index("ix_phones_ram", "ram_gb"),
        # Extra indexes (low cost, high value).
        Index("ix_phones_category", "category"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Phone id={self.id} {self.brand} {self.name!r}>"


# ──────────────────────────────────────────────────────────────────────
# PhoneStore
# ──────────────────────────────────────────────────────────────────────

class PhoneStore(Base):
    """One store listing for a phone.

    Rows are deleted-and-recreated by the importer on each successful
    pass per phone (see :mod:`importer`) — that keeps listings in sync
    without a complex diff engine.
    """

    __tablename__ = "phone_stores"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    phone_id: Mapped[int] = mapped_column(
        ForeignKey("phones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    store_name: Mapped[str] = mapped_column(String(120), nullable=False)
    store_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    original_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    discount_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    discount_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    in_stock: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    stock_status: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    short_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scraped_file: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    scraped_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    phone: Mapped[Phone] = relationship(back_populates="stores")

    __table_args__ = (
        UniqueConstraint("phone_id", "store_url", name="uq_phone_store"),
        Index("ix_phone_stores_store_name", "store_name"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<PhoneStore {self.store_name} {self.price}>"