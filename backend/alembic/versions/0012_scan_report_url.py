"""Add report URL columns to scans

Revision ID: 0012_scan_report_url
Revises: 0011_dependency_health
Create Date: 2025-01-02
"""

from alembic import op
import sqlalchemy as sa

revision = "0012_scan_report_url"
down_revision = "0011_dependency_health"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scans", sa.Column("report_url", sa.String(), nullable=True))
    op.add_column("scans", sa.Column("report_generated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("scans", "report_generated_at")
    op.drop_column("scans", "report_url")
