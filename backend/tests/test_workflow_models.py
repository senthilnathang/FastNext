from datetime import datetime

import pytest
from app.db.base import Base
from app.models.user import User
from app.models.workflow import (
    InstanceStatus,
    WorkflowHistory,
    WorkflowInstance,
    WorkflowState,
    WorkflowStatus,
    WorkflowTemplate,
    WorkflowTransition,
    WorkflowType,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_workflow.db"
engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session():
    """Create test database session"""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db_session):
    """Create test user"""
    user = User(
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password="hashedpassword123",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_workflow_type(db_session, test_user):
    """Create test workflow type"""
    workflow_type = WorkflowType(
        name="Sales Order",
        description="Sales order processing workflow",
        icon="ShoppingCart",
        color="#3B82F6",
        created_by=test_user.id,
    )
    db_session.add(workflow_type)
    db_session.commit()
    db_session.refresh(workflow_type)
    return workflow_type


@pytest.fixture
def test_workflow_states(db_session):
    """Create test workflow states"""
    states = [
        WorkflowState(
            name="new",
            label="New",
            description="New order created",
            color="#3B82F6",
            bg_color="#EFF6FF",
            icon="plus-circle",
            is_initial=True,
            is_final=False,
        ),
        WorkflowState(
            name="confirmed",
            label="Confirmed",
            description="Order confirmed",
            color="#10B981",
            bg_color="#ECFDF5",
            icon="check-circle",
            is_initial=False,
            is_final=False,
        ),
        WorkflowState(
            name="completed",
            label="Completed",
            description="Order completed",
            color="#059669",
            bg_color="#D1FAE5",
            icon="check-circle",
            is_initial=False,
            is_final=True,
        ),
    ]

    for state in states:
        db_session.add(state)
    db_session.commit()

    for state in states:
        db_session.refresh(state)

    return states


class TestWorkflowModels:
    """Test workflow model creation and relationships"""

    def test_workflow_type_creation(self, db_session, test_user):
        """Test WorkflowType model creation"""
        workflow_type = WorkflowType(
            name="Purchase Order",
            description="Purchase order workflow",
            icon="Package",
            color="#8B5CF6",
            created_by=test_user.id,
        )

        db_session.add(workflow_type)
        db_session.commit()
        db_session.refresh(workflow_type)

        assert workflow_type.id is not None
        assert workflow_type.name == "Purchase Order"
        assert workflow_type.is_active == True
        assert workflow_type.created_by == test_user.id
        assert workflow_type.creator == test_user

    def test_workflow_state_creation(self, db_session):
        """Test WorkflowState model creation"""
        state = WorkflowState(
            name="pending",
            label="Pending Approval",
            description="Waiting for approval",
            color="#F59E0B",
            bg_color="#FFFBEB",
            icon="clock",
            is_initial=False,
            is_final=False,
        )

        db_session.add(state)
        db_session.commit()
        db_session.refresh(state)

        assert state.id is not None
        assert state.name == "pending"
        assert state.label == "Pending Approval"
        assert state.is_initial == False
        assert state.is_final == False

    def test_workflow_template_creation(
        self, db_session, test_user, test_workflow_type, test_workflow_states
    ):
        """Test WorkflowTemplate model creation"""
        new_state = test_workflow_states[0]  # Initial state

        template = WorkflowTemplate(
            name="Standard Sales Process",
            description="Standard sales order process",
            workflow_type_id=test_workflow_type.id,
            default_state_id=new_state.id,
            status=WorkflowStatus.ACTIVE,
            version="1.0.0",
            nodes=[
                {
                    "id": "node1",
                    "type": "workflowState",
                    "position": {"x": 100, "y": 100},
                    "data": {"label": "New", "stateId": new_state.id},
                }
            ],
            edges=[],
            settings={"auto_assign": True},
            created_by=test_user.id,
        )

        db_session.add(template)
        db_session.commit()
        db_session.refresh(template)

        assert template.id is not None
        assert template.name == "Standard Sales Process"
        assert template.status == WorkflowStatus.ACTIVE
        assert template.workflow_type_id == test_workflow_type.id
        assert template.default_state_id == new_state.id
        assert len(template.nodes) == 1
        assert template.creator == test_user
        assert template.workflow_type == test_workflow_type
        assert template.default_state == new_state

    def test_workflow_instance_creation(
        self, db_session, test_user, test_workflow_type, test_workflow_states
    ):
        """Test WorkflowInstance model creation"""
        # First create a template
        new_state = test_workflow_states[0]

        template = WorkflowTemplate(
            name="Test Template",
            workflow_type_id=test_workflow_type.id,
            default_state_id=new_state.id,
            created_by=test_user.id,
        )
        db_session.add(template)
        db_session.commit()
        db_session.refresh(template)

        # Create instance
        instance = WorkflowInstance(
            template_id=template.id,
            workflow_type_id=test_workflow_type.id,
            current_state_id=new_state.id,
            status=InstanceStatus.RUNNING,
            entity_id="SO-001",
            entity_type="sales_order",
            title="Sales Order SO-001",
            description="Customer order for products",
            data={"customer_id": 123, "amount": 1500.00},
            context={"variables": {}},
            active_nodes=[new_state.id],
            priority=1,
            created_by=test_user.id,
            assigned_to=test_user.id,
        )

        db_session.add(instance)
        db_session.commit()
        db_session.refresh(instance)

        assert instance.id is not None
        assert instance.entity_id == "SO-001"
        assert instance.status == InstanceStatus.RUNNING
        assert instance.template == template
        assert instance.workflow_type == test_workflow_type
        assert instance.current_state == new_state
        assert instance.creator == test_user
        assert instance.assigned_user == test_user
        assert instance.data["customer_id"] == 123

    def test_workflow_history_creation(
        self, db_session, test_user, test_workflow_type, test_workflow_states
    ):
        """Test WorkflowHistory model creation"""
        # Setup instance
        new_state, confirmed_state = test_workflow_states[0], test_workflow_states[1]

        template = WorkflowTemplate(
            name="Test Template",
            workflow_type_id=test_workflow_type.id,
            default_state_id=new_state.id,
            created_by=test_user.id,
        )
        db_session.add(template)
        db_session.commit()
        db_session.refresh(template)

        instance = WorkflowInstance(
            template_id=template.id,
            workflow_type_id=test_workflow_type.id,
            current_state_id=confirmed_state.id,
            entity_id="SO-002",
            entity_type="sales_order",
            created_by=test_user.id,
        )
        db_session.add(instance)
        db_session.commit()
        db_session.refresh(instance)

        # Create history entry
        history = WorkflowHistory(
            instance_id=instance.id,
            from_state_id=new_state.id,
            to_state_id=confirmed_state.id,
            action="confirm",
            comment="Order confirmed by customer",
            meta_data={"customer_signature": True},
            user_id=test_user.id,
        )

        db_session.add(history)
        db_session.commit()
        db_session.refresh(history)

        assert history.id is not None
        assert history.action == "confirm"
        assert history.instance == instance
        assert history.from_state == new_state
        assert history.to_state == confirmed_state
        assert history.user == test_user
        assert history.meta_data["customer_signature"] == True

    def test_workflow_transition_creation(self, db_session, test_workflow_states):
        """Test WorkflowTransition model creation"""
        # Setup template
        template = WorkflowTemplate(
            name="Test Template",
            workflow_type_id=1,  # Will be created separately
            created_by=1,
        )
        db_session.add(template)
        db_session.commit()
        db_session.refresh(template)

        new_state, confirmed_state = test_workflow_states[0], test_workflow_states[1]

        transition = WorkflowTransition(
            template_id=template.id,
            from_state_id=new_state.id,
            to_state_id=confirmed_state.id,
            action="confirm",
            label="Confirm Order",
            condition="amount > 0",
            requires_approval=False,
            allowed_roles=["sales_rep", "manager"],
        )

        db_session.add(transition)
        db_session.commit()
        db_session.refresh(transition)

        assert transition.id is not None
        assert transition.action == "confirm"
        assert transition.label == "Confirm Order"
        assert transition.condition == "amount > 0"
        assert transition.requires_approval == False
        assert "sales_rep" in transition.allowed_roles
        assert transition.from_state == new_state
        assert transition.to_state == confirmed_state

    def test_relationships(
        self, db_session, test_user, test_workflow_type, test_workflow_states
    ):
        """Test model relationships"""
        new_state = test_workflow_states[0]

        # Create template with instance
        template = WorkflowTemplate(
            name="Relationship Test",
            workflow_type_id=test_workflow_type.id,
            default_state_id=new_state.id,
            created_by=test_user.id,
        )
        db_session.add(template)
        db_session.commit()
        db_session.refresh(template)

        instance = WorkflowInstance(
            template_id=template.id,
            workflow_type_id=test_workflow_type.id,
            current_state_id=new_state.id,
            entity_id="TEST-001",
            entity_type="test",
            created_by=test_user.id,
        )
        db_session.add(instance)
        db_session.commit()
        db_session.refresh(instance)

        # Test relationships
        assert template in test_workflow_type.templates
        assert instance in template.instances
        assert template in test_user.created_workflow_templates
        assert instance in test_user.created_workflow_instances

        # Test reverse relationships work
        assert instance.template == template
        assert instance.workflow_type == test_workflow_type
        assert instance.creator == test_user

    def test_enum_values(self, db_session, test_user, test_workflow_type):
        """Test enum field values"""
        template = WorkflowTemplate(
            name="Enum Test",
            workflow_type_id=test_workflow_type.id,
            status=WorkflowStatus.DRAFT,
            created_by=test_user.id,
        )
        db_session.add(template)
        db_session.commit()
        db_session.refresh(template)

        assert template.status == WorkflowStatus.DRAFT

        # Update status
        template.status = WorkflowStatus.ACTIVE
        db_session.commit()
        db_session.refresh(template)

        assert template.status == WorkflowStatus.ACTIVE

        # Test instance status
        instance = WorkflowInstance(
            template_id=template.id,
            workflow_type_id=test_workflow_type.id,
            current_state_id=1,  # Will be set properly in real use
            entity_id="ENUM-001",
            entity_type="test",
            status=InstanceStatus.PENDING,
            created_by=test_user.id,
        )
        db_session.add(instance)
        db_session.commit()
        db_session.refresh(instance)

        assert instance.status == InstanceStatus.PENDING

        instance.status = InstanceStatus.RUNNING
        db_session.commit()
        db_session.refresh(instance)

        assert instance.status == InstanceStatus.RUNNING


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
