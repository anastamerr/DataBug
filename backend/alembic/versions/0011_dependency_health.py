"""Add dependency health flag to scans

Revision ID: 0011_dependency_health
Revises: 0010_reachability_analysis
Create Date: 2025-01-02
"""

from alembic import op
import sqlalchemy as sa

revision = "0011_dependency_health"
down_revision = "0010_reachability_analysis"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "scans",
        sa.Column(
            "dependency_health_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("scans", "dependency_health_enabled")
