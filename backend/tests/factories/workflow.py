"""
Workflow factories for testing.
"""

import factory
from factory import Sequence

from app.models.workflow import WorkflowState, WorkflowType, WorkflowTemplate
from tests.factories.base import SQLAlchemyModelFactory


class WorkflowStateFactory(SQLAlchemyModelFactory):
    """Factory for creating WorkflowState instances."""

    class Meta:
        model = WorkflowState

    name = Sequence(lambda n: f"state_{n}")
    label = Sequence(lambda n: f"State {n}")
    description = factory.Faker("sentence")
    color = factory.Iterator(["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#6B7280"])
    bg_color = factory.Iterator(["#EFF6FF", "#ECFDF5", "#FFFBEB", "#FEF2F2", "#F9FAFB"])
    icon = "CircleDot"
    is_initial = False
    is_final = False


class WorkflowTypeFactory(SQLAlchemyModelFactory):
    """Factory for creating WorkflowType instances."""

    class Meta:
        model = WorkflowType

    name = Sequence(lambda n: f"Workflow Type {n}")
    description = factory.Faker("sentence")
    icon = factory.Iterator(["Workflow", "GitBranch", "Zap", "ArrowRight"])
    color = factory.Iterator(["#3B82F6", "#10B981", "#F59E0B", "#EF4444"])
    is_active = True
    created_by = None  # Must be provided

    class Params:
        """Traits for workflow type configurations."""

        inactive = factory.Trait(is_active=False)


class WorkflowTemplateFactory(SQLAlchemyModelFactory):
    """Factory for creating WorkflowTemplate instances."""

    class Meta:
        model = WorkflowTemplate

    name = Sequence(lambda n: f"Workflow Template {n}")
    description = factory.Faker("sentence")
    model_type = factory.Iterator(["Project", "Task", "Order", "Request"])
    workflow_type_id = None  # Must be provided
    is_active = True
    created_by = None  # Must be provided

    class Params:
        """Traits for workflow template configurations."""

        inactive = factory.Trait(is_active=False)
