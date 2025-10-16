"""Add workflow tables

Revision ID: add_workflow_tables
Revises: enhance_activity_log_for_events
Create Date: 2025-10-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_workflow_tables'
down_revision = 'enhance_activity_log_for_events'
branch_labels = None
depends_on = None


def upgrade():
    # Create workflow_types table
    op.create_table('workflow_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(), nullable=True),
        sa.Column('color', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name=op.f('fk_workflow_types_created_by_users')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflow_types_id'), 'workflow_types', ['id'], unique=False)
    op.create_index(op.f('ix_workflow_types_name'), 'workflow_types', ['name'], unique=True)

    # Create workflow_states table
    op.create_table('workflow_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(), nullable=False),
        sa.Column('bg_color', sa.String(), nullable=False),
        sa.Column('icon', sa.String(), nullable=True),
        sa.Column('is_initial', sa.Boolean(), nullable=True),
        sa.Column('is_final', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflow_states_id'), 'workflow_states', ['id'], unique=False)
    op.create_index(op.f('ix_workflow_states_name'), 'workflow_states', ['name'], unique=False)

    # Create workflow_templates table
    op.create_table('workflow_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('workflow_type_id', sa.Integer(), nullable=False),
        sa.Column('default_state_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('version', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('nodes', sa.JSON(), nullable=True),
        sa.Column('edges', sa.JSON(), nullable=True),
        sa.Column('settings', sa.JSON(), nullable=True),
        sa.Column('conditions', sa.JSON(), nullable=True),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('sla_config', sa.JSON(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name=op.f('fk_workflow_templates_created_by_users')),
        sa.ForeignKeyConstraint(['default_state_id'], ['workflow_states.id'], name=op.f('fk_workflow_templates_default_state_id_workflow_states')),
        sa.ForeignKeyConstraint(['workflow_type_id'], ['workflow_types.id'], name=op.f('fk_workflow_templates_workflow_type_id_workflow_types')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflow_templates_id'), 'workflow_templates', ['id'], unique=False)
    op.create_index(op.f('ix_workflow_templates_name'), 'workflow_templates', ['name'], unique=False)

    # Create workflow_instances table
    op.create_table('workflow_instances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('workflow_type_id', sa.Integer(), nullable=False),
        sa.Column('current_state_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('entity_id', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('context', sa.JSON(), nullable=True),
        sa.Column('active_nodes', sa.JSON(), nullable=True),
        sa.Column('deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], name=op.f('fk_workflow_instances_assigned_to_users')),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name=op.f('fk_workflow_instances_created_by_users')),
        sa.ForeignKeyConstraint(['current_state_id'], ['workflow_states.id'], name=op.f('fk_workflow_instances_current_state_id_workflow_states')),
        sa.ForeignKeyConstraint(['template_id'], ['workflow_templates.id'], name=op.f('fk_workflow_instances_template_id_workflow_templates')),
        sa.ForeignKeyConstraint(['workflow_type_id'], ['workflow_types.id'], name=op.f('fk_workflow_instances_workflow_type_id_workflow_types')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflow_instances_id'), 'workflow_instances', ['id'], unique=False)

    # Create workflow_history table
    op.create_table('workflow_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('instance_id', sa.Integer(), nullable=False),
        sa.Column('from_state_id', sa.Integer(), nullable=True),
        sa.Column('to_state_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('meta_data', sa.JSON(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['from_state_id'], ['workflow_states.id'], name=op.f('fk_workflow_history_from_state_id_workflow_states')),
        sa.ForeignKeyConstraint(['instance_id'], ['workflow_instances.id'], name=op.f('fk_workflow_history_instance_id_workflow_instances')),
        sa.ForeignKeyConstraint(['to_state_id'], ['workflow_states.id'], name=op.f('fk_workflow_history_to_state_id_workflow_states')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_workflow_history_user_id_users')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflow_history_id'), 'workflow_history', ['id'], unique=False)

    # Create workflow_transitions table
    op.create_table('workflow_transitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('from_state_id', sa.Integer(), nullable=False),
        sa.Column('to_state_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('condition', sa.Text(), nullable=True),
        sa.Column('requires_approval', sa.Boolean(), nullable=True),
        sa.Column('allowed_roles', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['from_state_id'], ['workflow_states.id'], name=op.f('fk_workflow_transitions_from_state_id_workflow_states')),
        sa.ForeignKeyConstraint(['template_id'], ['workflow_templates.id'], name=op.f('fk_workflow_transitions_template_id_workflow_templates')),
        sa.ForeignKeyConstraint(['to_state_id'], ['workflow_states.id'], name=op.f('fk_workflow_transitions_to_state_id_workflow_states')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workflow_transitions_id'), 'workflow_transitions', ['id'], unique=False)


def downgrade():
    op.drop_table('workflow_transitions')
    op.drop_table('workflow_history')
    op.drop_table('workflow_instances')
    op.drop_table('workflow_templates')
    op.drop_table('workflow_states')
    op.drop_table('workflow_types')