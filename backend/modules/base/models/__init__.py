"""Base module models."""

from .module import InstalledModule, ModuleReloadSignal, serialize_manifest
from .sequence import Sequence, SequenceDateRange
from .scheduled_action import ScheduledAction, ScheduledActionLog, IntervalType
from .server_action import ServerAction, AutomationRule, ActionTrigger, ActionType
from .record_rule import RecordRule, RuleScope, RuleOperation
from .computed_field import (
    ComputedFieldDefinition,
    ComputedFieldInfo,
    ComputedFieldsMixin,
    ComputeType,
    AggregateFunction,
    computed,
    related,
    aggregate,
    setup_computed_field_listeners,
)
from .config_parameter import ConfigParameter, ConfigValueType
from .email_template import EmailTemplate, EmailQueue, EmailLog, EmailStatus
from .webhook import (
    WebhookDefinition,
    WebhookLog,
    WebhookSecret,
    WebhookEvent,
    WebhookAuthType,
    WebhookStatus,
)

__all__ = [
    # Module management
    "InstalledModule",
    "ModuleReloadSignal",
    "serialize_manifest",
    # Sequences
    "Sequence",
    "SequenceDateRange",
    # Scheduled actions
    "ScheduledAction",
    "ScheduledActionLog",
    "IntervalType",
    # Server actions and automation
    "ServerAction",
    "AutomationRule",
    "ActionTrigger",
    "ActionType",
    # Record rules
    "RecordRule",
    "RuleScope",
    "RuleOperation",
    # Computed fields
    "ComputedFieldDefinition",
    "ComputedFieldInfo",
    "ComputedFieldsMixin",
    "ComputeType",
    "AggregateFunction",
    "computed",
    "related",
    "aggregate",
    "setup_computed_field_listeners",
    # Configuration
    "ConfigParameter",
    "ConfigValueType",
    # Email templates
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
]
