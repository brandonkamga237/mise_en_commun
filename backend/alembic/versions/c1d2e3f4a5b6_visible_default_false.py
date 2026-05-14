"""visible default false

Revision ID: c1d2e3f4a5b6
Revises: b2c3d4e5f6a7
Create Date: 2026-05-15

"""
from alembic import op
import sqlalchemy as sa

revision = 'c1d2e3f4a5b6'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        'brouillons', 'visible',
        existing_type=sa.Boolean(),
        server_default='false',
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'brouillons', 'visible',
        existing_type=sa.Boolean(),
        server_default='true',
        existing_nullable=False,
    )
