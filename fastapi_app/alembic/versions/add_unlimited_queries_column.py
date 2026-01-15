"""Add unlimited_queries column to agent whitelist

Revision ID: add_unlimited_queries
Revises: aeff0cd58530
Create Date: 2026-01-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_unlimited_queries'
down_revision: Union[str, None] = 'aeff0cd58530'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add unlimited_queries column to fastapi_agent_whitelist table
    op.add_column(
        'fastapi_agent_whitelist',
        sa.Column('unlimited_queries', sa.Boolean(), nullable=True, default=False)
    )

    # Set default value for existing rows
    op.execute("UPDATE fastapi_agent_whitelist SET unlimited_queries = FALSE WHERE unlimited_queries IS NULL")


def downgrade() -> None:
    # Remove the column
    op.drop_column('fastapi_agent_whitelist', 'unlimited_queries')