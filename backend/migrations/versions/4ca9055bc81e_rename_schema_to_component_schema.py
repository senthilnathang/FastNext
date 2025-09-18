"""rename_schema_to_component_schema

Revision ID: 4ca9055bc81e
Revises: 
Create Date: 2025-09-18 11:04:45.535019

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4ca9055bc81e'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename the 'schema' column to 'component_schema' in the components table
    op.alter_column('components', 'schema', new_column_name='component_schema')


def downgrade() -> None:
    # Rename back 'component_schema' to 'schema' in the components table
    op.alter_column('components', 'component_schema', new_column_name='schema')
