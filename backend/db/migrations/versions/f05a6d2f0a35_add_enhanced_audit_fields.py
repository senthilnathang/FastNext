"""Add enhanced audit fields

Revision ID: f05a6d2f0a35
Revises: 7c04947e422d
Create Date: 2025-10-28 10:38:38.657519

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f05a6d2f0a35'
down_revision: Union[str, None] = '7c04947e422d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add enhanced audit fields to existing tables
    op.add_column('users', sa.Column('created_by_datetime', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('updated_by_datetime', sa.DateTime(timezone=True), nullable=True))

    op.add_column('projects', sa.Column('created_by_datetime', sa.DateTime(timezone=True), nullable=True))
    op.add_column('projects', sa.Column('updated_by_datetime', sa.DateTime(timezone=True), nullable=True))

    # Add to other existing tables as needed
    # op.add_column('components', sa.Column('created_by_datetime', sa.DateTime(timezone=True), nullable=True))
    # op.add_column('components', sa.Column('updated_by_datetime', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove enhanced audit fields
    op.drop_column('users', 'created_by_datetime')
    op.drop_column('users', 'updated_by_datetime')

    op.drop_column('projects', 'created_by_datetime')
    op.drop_column('projects', 'updated_by_datetime')

    # Remove from other tables as needed
    # op.drop_column('components', 'created_by_datetime')
    # op.drop_column('components', 'updated_by_datetime')
