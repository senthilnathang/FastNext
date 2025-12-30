"""add_conversations_tables

Revision ID: a1b2c3d4e5f6
Revises: 70ed9e9a5e7d
Create Date: 2025-12-26 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '70ed9e9a5e7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create conversations table
    op.create_table('conversations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=True),
        sa.Column('is_group', sa.Boolean(), nullable=False, default=False),
        sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_message_preview', sa.String(length=500), nullable=True),
        sa.Column('last_message_user_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['last_message_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversations_id'), 'conversations', ['id'], unique=False)
    op.create_index(op.f('ix_conversations_last_message_at'), 'conversations', ['last_message_at'], unique=False)

    # Create conversation_messages table first (before participants, for FK reference)
    op.create_table('conversation_messages',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('attachments', sa.Text(), nullable=True),
        sa.Column('is_edited', sa.Boolean(), nullable=False, default=False),
        sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_id'], ['conversation_messages.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversation_messages_id'), 'conversation_messages', ['id'], unique=False)
    op.create_index(op.f('ix_conversation_messages_conversation_id'), 'conversation_messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_conversation_messages_user_id'), 'conversation_messages', ['user_id'], unique=False)
    op.create_index(op.f('ix_conversation_messages_parent_id'), 'conversation_messages', ['parent_id'], unique=False)
    op.create_index('ix_conversation_message_thread', 'conversation_messages', ['conversation_id', 'created_at'], unique=False)

    # Create conversation_participants table
    op.create_table('conversation_participants',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_muted', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, default=False),
        sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_read_message_id', sa.Integer(), nullable=True),
        sa.Column('unread_count', sa.Integer(), nullable=False, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['last_read_message_id'], ['conversation_messages.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_participant')
    )
    op.create_index(op.f('ix_conversation_participants_id'), 'conversation_participants', ['id'], unique=False)
    op.create_index(op.f('ix_conversation_participants_conversation_id'), 'conversation_participants', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_conversation_participants_user_id'), 'conversation_participants', ['user_id'], unique=False)
    op.create_index('ix_conversation_participant_user', 'conversation_participants', ['user_id', 'is_active'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index('ix_conversation_participant_user', table_name='conversation_participants')
    op.drop_index(op.f('ix_conversation_participants_user_id'), table_name='conversation_participants')
    op.drop_index(op.f('ix_conversation_participants_conversation_id'), table_name='conversation_participants')
    op.drop_index(op.f('ix_conversation_participants_id'), table_name='conversation_participants')
    op.drop_table('conversation_participants')

    op.drop_index('ix_conversation_message_thread', table_name='conversation_messages')
    op.drop_index(op.f('ix_conversation_messages_parent_id'), table_name='conversation_messages')
    op.drop_index(op.f('ix_conversation_messages_user_id'), table_name='conversation_messages')
    op.drop_index(op.f('ix_conversation_messages_conversation_id'), table_name='conversation_messages')
    op.drop_index(op.f('ix_conversation_messages_id'), table_name='conversation_messages')
    op.drop_table('conversation_messages')

    op.drop_index(op.f('ix_conversations_last_message_at'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_id'), table_name='conversations')
    op.drop_table('conversations')
