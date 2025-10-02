"""merge_migrations

Revision ID: 0e2491553ab8
Revises: fcb007615c62, c9f69e5bec34, 1758725000
Create Date: 2025-09-29 09:30:18.870062

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e2491553ab8'
down_revision: Union[str, None] = ('fcb007615c62', 'c9f69e5bec34', '1758725000')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
