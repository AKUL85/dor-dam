"""initial phones + phone_stores schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-17 00:00:00
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "phones",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("brand", sa.String(120), nullable=False),
        sa.Column("category", sa.String(120), nullable=True),
        sa.Column("product_url", sa.String(1024), nullable=False, unique=True),
        sa.Column("image_url", sa.String(1024), nullable=True),
        sa.Column("ram_gb", sa.Integer, nullable=True),
        sa.Column("storage_gb", sa.Integer, nullable=True),
        sa.Column("display_inches", sa.Float, nullable=True),
        sa.Column("battery_mah", sa.Integer, nullable=True),
        sa.Column("charging_w", sa.Integer, nullable=True),
        sa.Column("price_min", sa.Float, nullable=True),
        sa.Column("price_max", sa.Float, nullable=True),
        sa.Column("display_text", sa.Text, nullable=True),
        sa.Column("processor_text", sa.Text, nullable=True),
        sa.Column("battery_text", sa.Text, nullable=True),
        sa.Column("camera_text", sa.Text, nullable=True),
        sa.Column("os", sa.String(120), nullable=True),
        sa.Column("network", sa.String(255), nullable=True),
        sa.Column("source_hash", sa.String(64), nullable=True),
        sa.Column(
            "first_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # 8 required indexes
    op.create_index("ix_phones_brand", "phones", ["brand"])
    op.create_index("ix_phones_price", "phones", ["price_min"])
    op.create_index("ix_phones_processor", "phones", ["processor_text"])
    op.create_index("ix_phones_display", "phones", ["display_text"])
    op.create_index("ix_phones_battery", "phones", ["battery_text"])
    op.create_index("ix_phones_camera", "phones", ["camera_text"])
    op.create_index("ix_phones_storage", "phones", ["storage_gb"])
    op.create_index("ix_phones_ram", "phones", ["ram_gb"])
    # auxiliary indexes
    op.create_index("ix_phones_category", "phones", ["category"])
    op.create_index("ix_phones_slug", "phones", ["slug"])

    op.create_table(
        "phone_stores",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "phone_id",
            sa.Integer,
            sa.ForeignKey("phones.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("store_name", sa.String(120), nullable=False),
        sa.Column("store_url", sa.String(1024), nullable=False),
        sa.Column("price", sa.Float, nullable=True),
        sa.Column("original_price", sa.Float, nullable=True),
        sa.Column("discount_amount", sa.Float, nullable=True),
        sa.Column("discount_pct", sa.Integer, nullable=True),
        sa.Column(
            "in_stock",
            sa.Boolean,
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column("stock_status", sa.String(80), nullable=True),
        sa.Column("short_description", sa.Text, nullable=True),
        sa.Column("scraped_file", sa.String(255), nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("phone_id", "store_url", name="uq_phone_store"),
    )
    op.create_index("ix_phone_stores_phone_id", "phone_stores", ["phone_id"])
    op.create_index("ix_phone_stores_store_name", "phone_stores", ["store_name"])


def downgrade() -> None:
    op.drop_index("ix_phone_stores_store_name", table_name="phone_stores")
    op.drop_index("ix_phone_stores_phone_id", table_name="phone_stores")
    op.drop_table("phone_stores")
    op.drop_index("ix_phones_category", table_name="phones")
    for name in (
        "ix_phones_ram",
        "ix_phones_storage",
        "ix_phones_camera",
        "ix_phones_battery",
        "ix_phones_display",
        "ix_phones_processor",
        "ix_phones_price",
        "ix_phones_brand",
    ):
        op.drop_index(name, table_name="phones")
    op.drop_table("phones")