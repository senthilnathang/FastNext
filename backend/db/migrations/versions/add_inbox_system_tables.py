"""Add inbox system tables

Revision ID: add_inbox_system
Revises: add_messaging_system_tables
Create Date: 2024-01-15

Creates:
- inbox_items: Unified inbox aggregating messages, notifications, activities, mentions
- labels: User-defined labels for organizing inbox items
- inbox_item_labels: Many-to-many junction table
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_inbox_system'
down_revision = 'add_messaging_system_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums
    inbox_item_type = postgresql.ENUM(
        'message', 'notification', 'activity', 'mention',
        name='inboxitemtype',
        create_type=False
    )
    inbox_priority = postgresql.ENUM(
        'low', 'normal', 'high', 'urgent',
        name='inboxpriority',
        create_type=False
    )

    # Create enums first
    op.execute("CREATE TYPE inboxitemtype AS ENUM ('message', 'notification', 'activity', 'mention')")
    op.execute("CREATE TYPE inboxpriority AS ENUM ('low', 'normal', 'high', 'urgent')")

    # Create labels table
    op.create_table(
        'labels',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('color', sa.String(20), nullable=False, server_default='#6366f1'),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'name', name='uq_label_user_name'),
    )
    op.create_index('idx_label_user', 'labels', ['user_id'])

    # Create inbox_items table
    op.create_table(
        'inbox_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('item_type', inbox_item_type, nullable=False, server_default='notification'),
        sa.Column('reference_type', sa.String(64), nullable=False),
        sa.Column('reference_id', sa.Integer(), nullable=False),
        sa.Column('source_model', sa.String(64), nullable=True),
        sa.Column('source_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('preview', sa.Text(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_starred', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('priority', inbox_priority, nullable=False, server_default='normal'),
        sa.Column('actor_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Create indexes for inbox_items
    op.create_index('idx_inbox_user_read', 'inbox_items', ['user_id', 'is_read'])
    op.create_index('idx_inbox_user_archived', 'inbox_items', ['user_id', 'is_archived'])
    op.create_index('idx_inbox_user_type', 'inbox_items', ['user_id', 'item_type'])
    op.create_index('idx_inbox_reference', 'inbox_items', ['reference_type', 'reference_id'])
    op.create_index('idx_inbox_created', 'inbox_items', ['created_at'])
    op.create_index('idx_inbox_items_id', 'inbox_items', ['id'])

    # Create inbox_item_labels junction table
    op.create_table(
        'inbox_item_labels',
        sa.Column('inbox_item_id', sa.Integer(), nullable=False),
        sa.Column('label_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['inbox_item_id'], ['inbox_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['label_id'], ['labels.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('inbox_item_id', 'label_id'),
    )
    op.create_index('idx_inbox_item_label_item', 'inbox_item_labels', ['inbox_item_id'])
    op.create_index('idx_inbox_item_label_label', 'inbox_item_labels', ['label_id'])


def downgrade() -> None:
    # Drop tables
    op.drop_table('inbox_item_labels')
    op.drop_table('inbox_items')
    op.drop_table('labels')

    # Drop enums
    op.execute("DROP TYPE IF EXISTS inboxpriority")
    op.execute("DROP TYPE IF EXISTS inboxitemtype")
