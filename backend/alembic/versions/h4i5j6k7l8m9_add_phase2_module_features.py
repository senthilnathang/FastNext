"""add_phase2_module_features

Revision ID: h4i5j6k7l8m9
Revises: g3h4i5j6k7l8
Create Date: 2024-12-26

Adds Phase 2 module features:
- languages: Installed languages for i18n
- ir_translations: Translation storage
- workflow_definitions: Workflow state machine definitions
- workflow_transitions: Workflow state transitions
- workflow_states: Record state tracking
- workflow_activities: Transition activity logs
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'h4i5j6k7l8m9'
down_revision: Union[str, None] = 'g3h4i5j6k7l8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create Phase 2 tables."""

    # -------------------------------------------------------------------------
    # Translation System Tables
    # -------------------------------------------------------------------------

    # Create languages table
    op.create_table(
        'languages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=10), nullable=False,
                  comment='Locale code: en_US, fr_FR, ar_SA'),
        sa.Column('name', sa.String(length=100), nullable=False,
                  comment='Display name: English (US)'),
        sa.Column('iso_code', sa.String(length=5), nullable=True,
                  comment='ISO 639-1 code: en, fr, ar'),
        sa.Column('direction', sa.String(length=3), server_default='ltr',
                  comment='Text direction: ltr or rtl'),
        sa.Column('date_format', sa.String(length=50), nullable=True,
                  comment='Date format pattern: %m/%d/%Y'),
        sa.Column('time_format', sa.String(length=50), nullable=True,
                  comment='Time format pattern: %H:%M:%S'),
        sa.Column('decimal_separator', sa.String(length=1), server_default='.',
                  comment='Decimal separator: . or ,'),
        sa.Column('thousands_separator', sa.String(length=1), server_default=',',
                  comment='Thousands separator: , or space'),
        sa.Column('is_active', sa.Boolean(), server_default='true',
                  comment='Whether this language is available for selection'),
        sa.Column('is_default', sa.Boolean(), server_default='false',
                  comment='Default language (only one should be true)'),
        sa.Column('translation_count', sa.Integer(), server_default='0',
                  comment='Number of translations in this language'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_languages_code')
    )
    op.create_index(op.f('ix_languages_id'), 'languages', ['id'], unique=False)
    op.create_index(op.f('ix_languages_code'), 'languages', ['code'], unique=True)

    # Create ir_translations table
    op.create_table(
        'ir_translations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lang', sa.String(length=10), nullable=False,
                  comment='Language code: en_US, fr_FR'),
        sa.Column('type', sa.String(length=30), nullable=False,
                  comment='Translation type: model, code, selection, view'),
        sa.Column('name', sa.String(length=200), nullable=False,
                  comment='Key: model.field or translation key'),
        sa.Column('res_id', sa.Integer(), nullable=True,
                  comment='Record ID for model translations (NULL for code strings)'),
        sa.Column('source', sa.Text(), nullable=False,
                  comment='Original text (usually in default language)'),
        sa.Column('value', sa.Text(), nullable=True,
                  comment='Translated text (NULL if not yet translated)'),
        sa.Column('module_name', sa.String(length=100), nullable=True,
                  comment='Module that owns this translation'),
        sa.Column('state', sa.String(length=20), server_default='to_translate',
                  comment='Translation state: to_translate, translated, validated'),
        sa.Column('comments', sa.Text(), nullable=True,
                  comment='Translator comments or context'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lang', 'type', 'name', 'res_id', name='uq_ir_translations_entry')
    )
    op.create_index(op.f('ix_ir_translations_id'), 'ir_translations', ['id'], unique=False)
    op.create_index(op.f('ix_ir_translations_lang'), 'ir_translations', ['lang'], unique=False)
    op.create_index(op.f('ix_ir_translations_type'), 'ir_translations', ['type'], unique=False)
    op.create_index(op.f('ix_ir_translations_name'), 'ir_translations', ['name'], unique=False)
    op.create_index(op.f('ix_ir_translations_res_id'), 'ir_translations', ['res_id'], unique=False)
    op.create_index(op.f('ix_ir_translations_module_name'), 'ir_translations', ['module_name'], unique=False)
    op.create_index('ix_ir_translations_lookup', 'ir_translations', ['lang', 'type', 'name', 'res_id'], unique=False)
    op.create_index('ix_ir_translations_source', 'ir_translations', ['source'], unique=False,
                    postgresql_ops={'source': 'text_pattern_ops'})

    # -------------------------------------------------------------------------
    # Workflow Engine Tables
    # -------------------------------------------------------------------------

    # Create workflow_definitions table
    op.create_table(
        'workflow_definitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False,
                  comment='Human-readable workflow name'),
        sa.Column('code', sa.String(length=100), nullable=False,
                  comment='Unique workflow code'),
        sa.Column('description', sa.Text(), nullable=True,
                  comment='Workflow description'),
        sa.Column('module_name', sa.String(length=100), nullable=True,
                  comment='Module that defines this workflow'),
        sa.Column('model_name', sa.String(length=100), nullable=False,
                  comment='Model this workflow applies to'),
        sa.Column('state_field', sa.String(length=100), server_default='state',
                  comment='Field name storing the state value'),
        sa.Column('states', postgresql.JSONB(astext_type=sa.Text()), server_default='[]',
                  comment='List of state definitions'),
        sa.Column('default_state', sa.String(length=50), nullable=True,
                  comment='Default state for new records'),
        sa.Column('is_active', sa.Boolean(), server_default='true',
                  comment='Whether this workflow is active'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_workflow_definitions_code')
    )
    op.create_index(op.f('ix_workflow_definitions_id'), 'workflow_definitions', ['id'], unique=False)
    op.create_index(op.f('ix_workflow_definitions_code'), 'workflow_definitions', ['code'], unique=True)
    op.create_index('ix_workflow_definitions_model', 'workflow_definitions', ['model_name'], unique=False)
    op.create_index('ix_workflow_definitions_module', 'workflow_definitions', ['module_name'], unique=False)

    # Create workflow_transitions table
    op.create_table(
        'workflow_transitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False,
                  comment='Human-readable transition name'),
        sa.Column('code', sa.String(length=100), nullable=False,
                  comment='Transition code'),
        sa.Column('from_state', sa.String(length=50), nullable=False,
                  comment='Source state code'),
        sa.Column('to_state', sa.String(length=50), nullable=False,
                  comment='Target state code'),
        sa.Column('condition_domain', postgresql.JSONB(astext_type=sa.Text()), server_default='[]',
                  comment='Domain filter that record must match'),
        sa.Column('condition_code', sa.Text(), nullable=True,
                  comment='Python expression that must return True'),
        sa.Column('required_groups', postgresql.JSONB(astext_type=sa.Text()), server_default='[]',
                  comment='List of group codes required to execute this transition'),
        sa.Column('action_id', sa.Integer(), nullable=True,
                  comment='ServerAction ID to execute on transition'),
        sa.Column('python_code', sa.Text(), nullable=True,
                  comment='Python code to execute on transition'),
        sa.Column('button_name', sa.String(length=100), nullable=True,
                  comment='Button label in UI'),
        sa.Column('button_class', sa.String(length=50), server_default='btn-primary',
                  comment='CSS class for button'),
        sa.Column('icon', sa.String(length=50), nullable=True,
                  comment='Icon name for button'),
        sa.Column('confirm_message', sa.Text(), nullable=True,
                  comment='Confirmation message to show before transition'),
        sa.Column('sequence', sa.Integer(), server_default='10',
                  comment='Display order'),
        sa.Column('is_active', sa.Boolean(), server_default='true',
                  comment='Whether this transition is active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflow_definitions.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_workflow_transitions_id'), 'workflow_transitions', ['id'], unique=False)
    op.create_index('ix_workflow_transitions_workflow', 'workflow_transitions', ['workflow_id'], unique=False)
    op.create_index('ix_workflow_transitions_states', 'workflow_transitions', ['from_state', 'to_state'], unique=False)

    # Create workflow_states table
    op.create_table(
        'workflow_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.Integer(), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False,
                  comment='Model name'),
        sa.Column('res_id', sa.Integer(), nullable=False,
                  comment='Record ID'),
        sa.Column('current_state', sa.String(length=50), nullable=False,
                  comment='Current state code'),
        sa.Column('previous_state', sa.String(length=50), nullable=True,
                  comment='Previous state code'),
        sa.Column('history', postgresql.JSONB(astext_type=sa.Text()), server_default='[]',
                  comment='State change history'),
        sa.Column('last_transition_id', sa.Integer(), nullable=True,
                  comment='ID of the last transition executed'),
        sa.Column('last_changed_by', sa.Integer(), nullable=True,
                  comment='User ID who made the last change'),
        sa.Column('last_changed_at', sa.DateTime(timezone=True), nullable=True,
                  comment='When the last change occurred'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflow_definitions.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('workflow_id', 'model_name', 'res_id', name='uq_workflow_states_record')
    )
    op.create_index(op.f('ix_workflow_states_id'), 'workflow_states', ['id'], unique=False)
    op.create_index('ix_workflow_states_record', 'workflow_states', ['model_name', 'res_id'], unique=False)
    op.create_index('ix_workflow_states_workflow', 'workflow_states', ['workflow_id'], unique=False)

    # Create workflow_activities table
    op.create_table(
        'workflow_activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.Integer(), nullable=True),
        sa.Column('transition_id', sa.Integer(), nullable=True),
        sa.Column('model_name', sa.String(length=100), nullable=False,
                  comment='Model name'),
        sa.Column('res_id', sa.Integer(), nullable=False,
                  comment='Record ID'),
        sa.Column('from_state', sa.String(length=50), nullable=False,
                  comment='Previous state'),
        sa.Column('to_state', sa.String(length=50), nullable=False,
                  comment='New state'),
        sa.Column('transition_code', sa.String(length=100), nullable=True,
                  comment='Transition code used'),
        sa.Column('user_id', sa.Integer(), nullable=True,
                  comment='User who executed the transition'),
        sa.Column('user_name', sa.String(length=200), nullable=True,
                  comment='User name (denormalized for history)'),
        sa.Column('note', sa.Text(), nullable=True,
                  comment='User note or reason'),
        sa.Column('context_data', postgresql.JSONB(astext_type=sa.Text()), server_default='{}',
                  comment='Additional context data'),
        sa.Column('is_automatic', sa.Boolean(), server_default='false',
                  comment='Whether this was an automatic transition'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'),
                  nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflow_definitions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['transition_id'], ['workflow_transitions.id'], ondelete='SET NULL')
    )
    op.create_index(op.f('ix_workflow_activities_id'), 'workflow_activities', ['id'], unique=False)
    op.create_index('ix_workflow_activities_record', 'workflow_activities', ['model_name', 'res_id'], unique=False)
    op.create_index('ix_workflow_activities_workflow', 'workflow_activities', ['workflow_id'], unique=False)
    op.create_index('ix_workflow_activities_user', 'workflow_activities', ['user_id'], unique=False)
    op.create_index('ix_workflow_activities_created', 'workflow_activities', ['created_at'], unique=False)


def downgrade() -> None:
    """Drop Phase 2 tables."""

    # Drop workflow tables
    op.drop_index('ix_workflow_activities_created', table_name='workflow_activities')
    op.drop_index('ix_workflow_activities_user', table_name='workflow_activities')
    op.drop_index('ix_workflow_activities_workflow', table_name='workflow_activities')
    op.drop_index('ix_workflow_activities_record', table_name='workflow_activities')
    op.drop_index(op.f('ix_workflow_activities_id'), table_name='workflow_activities')
    op.drop_table('workflow_activities')

    op.drop_index('ix_workflow_states_workflow', table_name='workflow_states')
    op.drop_index('ix_workflow_states_record', table_name='workflow_states')
    op.drop_index(op.f('ix_workflow_states_id'), table_name='workflow_states')
    op.drop_table('workflow_states')

    op.drop_index('ix_workflow_transitions_states', table_name='workflow_transitions')
    op.drop_index('ix_workflow_transitions_workflow', table_name='workflow_transitions')
    op.drop_index(op.f('ix_workflow_transitions_id'), table_name='workflow_transitions')
    op.drop_table('workflow_transitions')

    op.drop_index('ix_workflow_definitions_module', table_name='workflow_definitions')
    op.drop_index('ix_workflow_definitions_model', table_name='workflow_definitions')
    op.drop_index(op.f('ix_workflow_definitions_code'), table_name='workflow_definitions')
    op.drop_index(op.f('ix_workflow_definitions_id'), table_name='workflow_definitions')
    op.drop_table('workflow_definitions')

    # Drop translation tables
    op.drop_index('ix_ir_translations_source', table_name='ir_translations')
    op.drop_index('ix_ir_translations_lookup', table_name='ir_translations')
    op.drop_index(op.f('ix_ir_translations_module_name'), table_name='ir_translations')
    op.drop_index(op.f('ix_ir_translations_res_id'), table_name='ir_translations')
    op.drop_index(op.f('ix_ir_translations_name'), table_name='ir_translations')
    op.drop_index(op.f('ix_ir_translations_type'), table_name='ir_translations')
    op.drop_index(op.f('ix_ir_translations_lang'), table_name='ir_translations')
    op.drop_index(op.f('ix_ir_translations_id'), table_name='ir_translations')
    op.drop_table('ir_translations')

    op.drop_index(op.f('ix_languages_code'), table_name='languages')
    op.drop_index(op.f('ix_languages_id'), table_name='languages')
    op.drop_table('languages')
