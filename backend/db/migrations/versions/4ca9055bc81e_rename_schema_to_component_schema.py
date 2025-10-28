"""rename_schema_to_component_schema

Revision ID: 4ca9055bc81e
Revises:
Create Date: 2025-09-18 11:04:45.535019

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "4ca9055bc81e"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if 'schema' column exists before renaming
    # If the components table was created with component_schema already, skip this
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name='components' AND column_name='schema'"))
    if result.fetchone():
        # Rename the 'schema' column to 'component_schema' in the components table
        op.alter_column("components", "schema", new_column_name="component_schema")


def downgrade() -> None:
    # Check if 'component_schema' column exists before renaming back
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name='components' AND column_name='component_schema'"))
    if result.fetchone():
        # Rename back 'component_schema' to 'schema' in the components table
        op.alter_column("components", "component_schema", new_column_name="schema")
