"""Add messaging system tables

Revision ID: messaging_001
Revises: module_001
Create Date: 2025-12-29

This migration adds messaging system tables:
- messages: Core message model for mail thread functionality
- conversations: User-to-user conversation threads
- conversation_participants: Tracks user participation in conversations
- conversation_messages: Messages within conversations
- mentions: @mention tracking
- message_reactions: Emoji reactions
- message_read_receipts: Read tracking
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "messaging_001"
down_revision = "module_001"
branch_labels = None
depends_on = None


def upgrade():
    """Create messaging system tables"""

    # Create message type enum
    message_type_enum = postgresql.ENUM(
        "comment", "note", "system", "notification", "email",
        "log", "approval", "rejection", "assignment",
        name="messagetype",
    )
    message_type_enum.create(op.get_bind(), checkfirst=True)

    # Create message level enum
    message_level_enum = postgresql.ENUM(
        "info", "success", "warning", "error", "debug",
        name="messagelevel",
    )
    message_level_enum.create(op.get_bind(), checkfirst=True)

    # Create messages table
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("record_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("subject", sa.String(length=500), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("message_type", message_type_enum, nullable=False, server_default="comment"),
        sa.Column("level", message_level_enum, nullable=False, server_default="info"),
        sa.Column("attachments", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_edited", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("extra_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parent_id"], ["messages.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create message indexes
    op.create_index("idx_messages_model_record", "messages", ["model_name", "record_id"])
    op.create_index("idx_messages_model_record_parent", "messages", ["model_name", "record_id", "parent_id"])
    op.create_index("idx_messages_user_id", "messages", ["user_id"])
    op.create_index("idx_messages_parent_id", "messages", ["parent_id"])
    op.create_index("idx_messages_created_at", "messages", ["created_at"])

    # Create conversations table
    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("subject", sa.String(length=500), nullable=True),
        sa.Column("is_group", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_message_preview", sa.String(length=500), nullable=True),
        sa.Column("last_message_user_id", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["last_message_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create conversation_participants table
    op.create_table(
        "conversation_participants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_muted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_read_message_id", sa.Integer(), nullable=True),
        sa.Column("unread_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("left_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("conversation_id", "user_id", name="uq_conversation_participant"),
    )

    op.create_index("idx_participant_conversation", "conversation_participants", ["conversation_id"])
    op.create_index("idx_participant_user", "conversation_participants", ["user_id"])

    # Create conversation_messages table
    op.create_table(
        "conversation_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("attachments", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("is_edited", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parent_id"], ["conversation_messages.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("idx_conv_message_conversation", "conversation_messages", ["conversation_id"])
    op.create_index("idx_conv_message_user", "conversation_messages", ["user_id"])
    op.create_index("idx_conv_message_parent", "conversation_messages", ["parent_id"])
    op.create_index("idx_conv_message_created", "conversation_messages", ["created_at"])

    # Create mentions table
    op.create_table(
        "mentions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("message_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("start_position", sa.Integer(), nullable=True),
        sa.Column("end_position", sa.Integer(), nullable=True),
        sa.Column("mention_text", sa.String(length=128), nullable=True),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id", name="uq_mention_message_user"),
    )

    op.create_index("idx_mention_message", "mentions", ["message_id"])
    op.create_index("idx_mention_user", "mentions", ["user_id"])

    # Create message_reactions table
    op.create_table(
        "message_reactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("message_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("emoji", sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id", "emoji", name="uq_reaction_message_user_emoji"),
    )

    op.create_index("idx_reaction_message", "message_reactions", ["message_id"])
    op.create_index("idx_reaction_message_emoji", "message_reactions", ["message_id", "emoji"])
    op.create_index("idx_reaction_user", "message_reactions", ["user_id"])

    # Create message_read_receipts table
    op.create_table(
        "message_read_receipts",
        sa.Column("message_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("message_id", "user_id"),
    )

    op.create_index("idx_read_receipt_message", "message_read_receipts", ["message_id"])
    op.create_index("idx_read_receipt_user", "message_read_receipts", ["user_id"])
    op.create_index("idx_read_receipt_read_at", "message_read_receipts", ["read_at"])


def downgrade():
    """Drop messaging system tables"""

    # Drop message_read_receipts
    op.drop_index("idx_read_receipt_read_at", table_name="message_read_receipts")
    op.drop_index("idx_read_receipt_user", table_name="message_read_receipts")
    op.drop_index("idx_read_receipt_message", table_name="message_read_receipts")
    op.drop_table("message_read_receipts")

    # Drop message_reactions
    op.drop_index("idx_reaction_user", table_name="message_reactions")
    op.drop_index("idx_reaction_message_emoji", table_name="message_reactions")
    op.drop_index("idx_reaction_message", table_name="message_reactions")
    op.drop_table("message_reactions")

    # Drop mentions
    op.drop_index("idx_mention_user", table_name="mentions")
    op.drop_index("idx_mention_message", table_name="mentions")
    op.drop_table("mentions")

    # Drop conversation_messages
    op.drop_index("idx_conv_message_created", table_name="conversation_messages")
    op.drop_index("idx_conv_message_parent", table_name="conversation_messages")
    op.drop_index("idx_conv_message_user", table_name="conversation_messages")
    op.drop_index("idx_conv_message_conversation", table_name="conversation_messages")
    op.drop_table("conversation_messages")

    # Drop conversation_participants
    op.drop_index("idx_participant_user", table_name="conversation_participants")
    op.drop_index("idx_participant_conversation", table_name="conversation_participants")
    op.drop_table("conversation_participants")

    # Drop conversations
    op.drop_table("conversations")

    # Drop messages
    op.drop_index("idx_messages_created_at", table_name="messages")
    op.drop_index("idx_messages_parent_id", table_name="messages")
    op.drop_index("idx_messages_user_id", table_name="messages")
    op.drop_index("idx_messages_model_record_parent", table_name="messages")
    op.drop_index("idx_messages_model_record", table_name="messages")
    op.drop_table("messages")

    # Drop enums
    message_level_enum = postgresql.ENUM("info", "success", "warning", "error", "debug", name="messagelevel")
    message_level_enum.drop(op.get_bind(), checkfirst=True)

    message_type_enum = postgresql.ENUM(
        "comment", "note", "system", "notification", "email",
        "log", "approval", "rejection", "assignment",
        name="messagetype",
    )
    message_type_enum.drop(op.get_bind(), checkfirst=True)
