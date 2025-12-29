"""Base module models."""

from .module import InstalledModule

# Migration Tracking
from .module_migration import (
    ModuleMigration,
    ModuleModelState,
    MigrationType,
    MigrationStatus,
)

# Configuration Parameters
from .config_parameter import ConfigParameter, ConfigValueType

# Module Operations (State Machine)
from .module_operation import ModuleOperation, OperationType, OperationStatus

# Record Rules (Row-Level Security)
from .record_rule import RecordRule, RuleScope, RuleOperation

# Sequences (Auto-Numbering)
from .sequence import Sequence, SequenceDateRange

# Scheduled Actions (Cron Jobs)
from .scheduled_action import ScheduledAction, ScheduledActionLog, IntervalType

# Server Actions and Automation
from .server_action import ServerAction, AutomationRule, ActionType, ActionTrigger

# Computed Fields
from .computed_field import (
    ComputedFieldDefinition,
    ComputedFieldInfo,
    ComputedFieldsMixin,
    ComputeType,
    AggregateFunction,
    computed,
    related,
    aggregate,
)

# Model Data (XML ID Registry)
from .model_data import IrModelData, ref

# Model Hooks
from .model_hook import (
    ModelHookDefinition,
    HookEvent,
    HookRegistry,
    HookableMixin,
    hook_registry,
    before_create,
    after_create,
    before_update,
    after_update,
    before_delete,
    after_delete,
    onchange,
    constrains,
    setup_sqlalchemy_hooks,
)

# Translation System
from .translation import (
    Language,
    IrTranslation,
    TranslationType,
    TranslationState,
    translatable,
)

# Workflow Engine
from .workflow import (
    WorkflowDefinition,
    WorkflowTransition,
    WorkflowState,
    WorkflowActivity,
)

# Email Templates
from .email_template import (
    EmailTemplate,
    EmailQueue,
    EmailLog,
    EmailStatus,
)

# Webhooks
from .webhook import (
    WebhookDefinition,
    WebhookLog,
    WebhookSecret,
    WebhookEvent,
    WebhookAuthType,
    WebhookStatus,
)

# Reports
from .report import (
    ReportDefinition,
    ReportExecution,
    ReportSchedule,
    ReportFormat,
    ReportTemplateType,
    PaperFormat,
)

# Module Export/Import
from .module_export import (
    ModuleExport,
    ModuleImport,
    DataExportTemplate,
    ExportType,
    ImportStatus,
    ConflictResolution,
)

__all__ = [
    # Core
    "InstalledModule",
    # Migration Tracking
    "ModuleMigration",
    "ModuleModelState",
    "MigrationType",
    "MigrationStatus",
    # Configuration Parameters
    "ConfigParameter",
    "ConfigValueType",
    # Module Operations
    "ModuleOperation",
    "OperationType",
    "OperationStatus",
    # Record Rules
    "RecordRule",
    "RuleScope",
    "RuleOperation",
    # Sequences
    "Sequence",
    "SequenceDateRange",
    # Scheduled Actions
    "ScheduledAction",
    "ScheduledActionLog",
    "IntervalType",
    # Server Actions
    "ServerAction",
    "AutomationRule",
    "ActionType",
    "ActionTrigger",
    # Computed Fields
    "ComputedFieldDefinition",
    "ComputedFieldInfo",
    "ComputedFieldsMixin",
    "ComputeType",
    "AggregateFunction",
    "computed",
    "related",
    "aggregate",
    # Model Data
    "IrModelData",
    "ref",
    # Model Hooks
    "ModelHookDefinition",
    "HookEvent",
    "HookRegistry",
    "HookableMixin",
    "hook_registry",
    "before_create",
    "after_create",
    "before_update",
    "after_update",
    "before_delete",
    "after_delete",
    "onchange",
    "constrains",
    "setup_sqlalchemy_hooks",
    # Translation System
    "Language",
    "IrTranslation",
    "TranslationType",
    "TranslationState",
    "translatable",
    # Workflow Engine
    "WorkflowDefinition",
    "WorkflowTransition",
    "WorkflowState",
    "WorkflowActivity",
    # Email Templates
    "EmailTemplate",
    "EmailQueue",
    "EmailLog",
    "EmailStatus",
    # Webhooks
    "WebhookDefinition",
    "WebhookLog",
    "WebhookSecret",
    "WebhookEvent",
    "WebhookAuthType",
    "WebhookStatus",
    # Reports
    "ReportDefinition",
    "ReportExecution",
    "ReportSchedule",
    "ReportFormat",
    "ReportTemplateType",
    "PaperFormat",
    # Module Export/Import
    "ModuleExport",
    "ModuleImport",
    "DataExportTemplate",
    "ExportType",
    "ImportStatus",
    "ConflictResolution",
]
