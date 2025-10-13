"""Add social accounts table for OAuth authentication

Revision ID: add_social_accounts
Revises: 2e84d23d2884
Create Date: 2025-10-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_social_accounts'
down_revision: Union[str, None] = '2e84d23d2884'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create social_accounts table
    op.create_table('social_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('provider_id', sa.String(length=255), nullable=False),
        sa.Column('provider_email', sa.String(length=255), nullable=True),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('account_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_social_accounts_provider'), 'social_accounts', ['provider'], unique=False)
    op.create_index(op.f('ix_social_accounts_provider_id'), 'social_accounts', ['provider_id'], unique=False)
    op.create_index(op.f('ix_social_accounts_user_id'), 'social_accounts', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop social_accounts table
    op.drop_index(op.f('ix_social_accounts_user_id'), table_name='social_accounts')
    op.drop_index(op.f('ix_social_accounts_provider_id'), table_name='social_accounts')
    op.drop_index(op.f('ix_social_accounts_provider'), table_name='social_accounts')
    op.drop_table('social_accounts')