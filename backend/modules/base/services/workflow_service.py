"""
Workflow Service

Provides workflow engine functionality including:
- Workflow definition management
- State transitions with conditions and actions
- State tracking and history
- Visualization data for frontend
"""

from typing import Any, Dict, List, Optional, Type
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.db.base import Base

from ..models.workflow import (
    WorkflowDefinition,
    WorkflowTransition,
    WorkflowState,
    WorkflowActivity,
)


class WorkflowService:
    """
    Service for managing workflows.

    Example:
        service = WorkflowService(db)

        # Create a workflow
        workflow = service.create_workflow(
            name="Leave Request",
            code="leave_request",
            model_name="hr.leave",
            states=[
                {"code": "draft", "name": "Draft", "is_start": True},
                {"code": "submitted", "name": "Submitted"},
                {"code": "approved", "name": "Approved", "is_end": True},
            ]
        )

        # Execute a transition
        service.execute_transition(
            transition_id=1,
            model_name="hr.leave",
            res_id=123,
            user_id=1
        )
    """

    def __init__(self, db: Session):
        self.db = db

    # -------------------------------------------------------------------------
    # Workflow Definition Management
    # -------------------------------------------------------------------------

    def get_workflows(
        self,
        module_name: Optional[str] = None,
        model_name: Optional[str] = None,
        active_only: bool = True,
    ) -> List[WorkflowDefinition]:
        """Get all workflows with optional filters."""
        query = self.db.query(WorkflowDefinition)

        if active_only:
            query = query.filter(WorkflowDefinition.is_active == True)
        if module_name:
            query = query.filter(WorkflowDefinition.module_name == module_name)
        if model_name:
            query = query.filter(WorkflowDefinition.model_name == model_name)

        return query.order_by(WorkflowDefinition.name).all()

    def get_workflow(self, code: str) -> Optional[WorkflowDefinition]:
        """Get workflow by code."""
        return WorkflowDefinition.get_by_code(self.db, code)

    def get_workflow_by_id(self, workflow_id: int) -> Optional[WorkflowDefinition]:
        """Get workflow by ID."""
        return self.db.query(WorkflowDefinition).filter(
            WorkflowDefinition.id == workflow_id
        ).first()

    def get_workflow_for_model(self, model_name: str) -> Optional[WorkflowDefinition]:
        """Get active workflow for a model."""
        return WorkflowDefinition.get_for_model(self.db, model_name)

    def create_workflow(
        self,
        name: str,
        code: str,
        model_name: str,
        states: List[Dict[str, Any]],
        state_field: str = "state",
        default_state: Optional[str] = None,
        module_name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> WorkflowDefinition:
        """
        Create a new workflow definition.

        Args:
            name: Human-readable name
            code: Unique code
            model_name: Model this workflow applies to
            states: List of state definitions
            state_field: Field name storing state
            default_state: Default state for new records
            module_name: Module name
            description: Description

        Returns:
            Created WorkflowDefinition
        """
        # Validate states
        self._validate_states(states)

        # Set default state if not provided
        if not default_state:
            start_states = [s for s in states if s.get("is_start")]
            if start_states:
                default_state = start_states[0].get("code")
            elif states:
                default_state = states[0].get("code")

        workflow = WorkflowDefinition(
            name=name,
            code=code,
            model_name=model_name,
            state_field=state_field,
            states=states,
            default_state=default_state,
            module_name=module_name,
            description=description,
            is_active=True,
        )
        self.db.add(workflow)
        self.db.flush()
        return workflow

    def update_workflow(
        self,
        code: str,
        **kwargs
    ) -> Optional[WorkflowDefinition]:
        """
        Update a workflow definition.

        Args:
            code: Workflow code
            **kwargs: Fields to update

        Returns:
            Updated WorkflowDefinition or None
        """
        workflow = self.get_workflow(code)
        if not workflow:
            return None

        if "states" in kwargs:
            self._validate_states(kwargs["states"])

        for key, value in kwargs.items():
            if hasattr(workflow, key):
                setattr(workflow, key, value)

        self.db.flush()
        return workflow

    def delete_workflow(self, code: str) -> bool:
        """
        Delete a workflow and related data.

        Args:
            code: Workflow code

        Returns:
            True if deleted
        """
        workflow = self.get_workflow(code)
        if not workflow:
            return False

        # Delete will cascade to transitions and states
        self.db.delete(workflow)
        self.db.flush()
        return True

    def _validate_states(self, states: List[Dict[str, Any]]) -> None:
        """Validate state definitions."""
        if not states:
            raise ValueError("Workflow must have at least one state")

        codes = [s.get("code") for s in states]
        if len(codes) != len(set(codes)):
            raise ValueError("Duplicate state codes found")

        for state in states:
            if not state.get("code"):
                raise ValueError("State must have a code")
            if not state.get("name"):
                raise ValueError("State must have a name")

    # -------------------------------------------------------------------------
    # Transition Management
    # -------------------------------------------------------------------------

    def get_transition(self, transition_id: int) -> Optional[WorkflowTransition]:
        """Get transition by ID."""
        return self.db.query(WorkflowTransition).filter(
            WorkflowTransition.id == transition_id
        ).first()

    def get_transitions(
        self,
        workflow_id: int,
        from_state: Optional[str] = None,
        active_only: bool = True,
    ) -> List[WorkflowTransition]:
        """Get transitions for a workflow."""
        query = self.db.query(WorkflowTransition).filter(
            WorkflowTransition.workflow_id == workflow_id
        )

        if active_only:
            query = query.filter(WorkflowTransition.is_active == True)
        if from_state:
            query = query.filter(WorkflowTransition.from_state == from_state)

        return query.order_by(WorkflowTransition.sequence).all()

    def create_transition(
        self,
        workflow_id: int,
        name: str,
        code: str,
        from_state: str,
        to_state: str,
        condition_domain: Optional[List] = None,
        condition_code: Optional[str] = None,
        required_groups: Optional[List[str]] = None,
        action_id: Optional[int] = None,
        python_code: Optional[str] = None,
        button_name: Optional[str] = None,
        button_class: str = "btn-primary",
        icon: Optional[str] = None,
        confirm_message: Optional[str] = None,
        sequence: int = 10,
    ) -> WorkflowTransition:
        """
        Create a new transition.

        Args:
            workflow_id: Parent workflow ID
            name: Human-readable name
            code: Transition code
            from_state: Source state
            to_state: Target state
            condition_domain: Domain filter
            condition_code: Python condition
            required_groups: Required user groups
            action_id: ServerAction to execute
            python_code: Python code to execute
            button_name: UI button label
            button_class: CSS class
            icon: Icon name
            confirm_message: Confirmation message
            sequence: Display order

        Returns:
            Created WorkflowTransition
        """
        # Validate workflow exists
        workflow = self.get_workflow_by_id(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Validate states exist in workflow
        state_codes = workflow.state_codes
        if from_state not in state_codes:
            raise ValueError(f"State '{from_state}' not found in workflow")
        if to_state not in state_codes:
            raise ValueError(f"State '{to_state}' not found in workflow")

        transition = WorkflowTransition(
            workflow_id=workflow_id,
            name=name,
            code=code,
            from_state=from_state,
            to_state=to_state,
            condition_domain=condition_domain or [],
            condition_code=condition_code,
            required_groups=required_groups or [],
            action_id=action_id,
            python_code=python_code,
            button_name=button_name or name,
            button_class=button_class,
            icon=icon,
            confirm_message=confirm_message,
            sequence=sequence,
            is_active=True,
        )
        self.db.add(transition)
        self.db.flush()
        return transition

    def update_transition(
        self,
        transition_id: int,
        **kwargs
    ) -> Optional[WorkflowTransition]:
        """Update a transition."""
        transition = self.get_transition(transition_id)
        if not transition:
            return None

        for key, value in kwargs.items():
            if hasattr(transition, key):
                setattr(transition, key, value)

        self.db.flush()
        return transition

    def delete_transition(self, transition_id: int) -> bool:
        """Delete a transition."""
        transition = self.get_transition(transition_id)
        if not transition:
            return False

        self.db.delete(transition)
        self.db.flush()
        return True

    # -------------------------------------------------------------------------
    # State Management
    # -------------------------------------------------------------------------

    def get_current_state(
        self,
        model_name: str,
        res_id: int,
    ) -> Optional[str]:
        """
        Get current state of a record.

        Args:
            model_name: Model name
            res_id: Record ID

        Returns:
            Current state code or None
        """
        state = WorkflowState.get_for_record(self.db, model_name, res_id)
        return state.current_state if state else None

    def get_state_info(
        self,
        model_name: str,
        res_id: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Get full state information for a record.

        Args:
            model_name: Model name
            res_id: Record ID

        Returns:
            State info dict or None
        """
        state = WorkflowState.get_for_record(self.db, model_name, res_id)
        if not state:
            return None

        workflow = self.get_workflow_by_id(state.workflow_id)
        state_def = workflow.get_state_info(state.current_state) if workflow else None

        return {
            "id": state.id,
            "workflow_id": state.workflow_id,
            "workflow_code": workflow.code if workflow else None,
            "model_name": state.model_name,
            "res_id": state.res_id,
            "current_state": state.current_state,
            "previous_state": state.previous_state,
            "state_info": state_def,
            "last_changed_by": state.last_changed_by,
            "last_changed_at": state.last_changed_at.isoformat() if state.last_changed_at else None,
            "history_count": len(state.history or []),
        }

    def initialize_state(
        self,
        workflow_id: int,
        model_name: str,
        res_id: int,
        initial_state: Optional[str] = None,
    ) -> WorkflowState:
        """
        Initialize workflow state for a new record.

        Args:
            workflow_id: Workflow ID
            model_name: Model name
            res_id: Record ID
            initial_state: Initial state (uses workflow default if not provided)

        Returns:
            Created WorkflowState
        """
        workflow = self.get_workflow_by_id(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        state_code = initial_state or workflow.default_state
        if not state_code:
            raise ValueError("No initial state specified and workflow has no default")

        return WorkflowState.get_or_create(
            self.db, workflow_id, model_name, res_id, state_code
        )

    # -------------------------------------------------------------------------
    # Transition Execution
    # -------------------------------------------------------------------------

    def get_available_transitions(
        self,
        model_name: str,
        res_id: int,
        user_id: Optional[int] = None,
        user_groups: Optional[List[str]] = None,
        record: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get available transitions for a record.

        Args:
            model_name: Model name
            res_id: Record ID
            user_id: Current user ID
            user_groups: User's group codes
            record: Optional record object for condition evaluation

        Returns:
            List of available transition dicts
        """
        state = WorkflowState.get_for_record(self.db, model_name, res_id)
        if not state:
            return []

        workflow = self.get_workflow_by_id(state.workflow_id)
        if not workflow or not workflow.is_active:
            return []

        transitions = self.get_transitions(
            workflow_id=workflow.id,
            from_state=state.current_state,
            active_only=True,
        )

        available = []
        for t in transitions:
            if self._check_transition_conditions(t, record, user_groups):
                available.append({
                    "id": t.id,
                    "code": t.code,
                    "name": t.name,
                    "from_state": t.from_state,
                    "to_state": t.to_state,
                    "button_name": t.button_name,
                    "button_class": t.button_class,
                    "icon": t.icon,
                    "confirm_message": t.confirm_message,
                })

        return available

    def _check_transition_conditions(
        self,
        transition: WorkflowTransition,
        record: Optional[Any],
        user_groups: Optional[List[str]],
    ) -> bool:
        """Check if transition conditions are met."""
        # Check required groups
        if transition.required_groups:
            if not user_groups:
                return False
            if not any(g in user_groups for g in transition.required_groups):
                return False

        # Check domain condition
        if transition.condition_domain and record:
            if not self._evaluate_domain(transition.condition_domain, record):
                return False

        # Check Python condition
        if transition.condition_code and record:
            if not self._evaluate_condition(transition.condition_code, record):
                return False

        return True

    def _evaluate_domain(
        self,
        domain: List,
        record: Any,
    ) -> bool:
        """Evaluate domain filter against record."""
        try:
            for condition in domain:
                if isinstance(condition, (list, tuple)) and len(condition) >= 3:
                    field, op, value = condition[:3]

                    # Get record value
                    record_value = getattr(record, field, None)

                    # Evaluate condition
                    if op == "=":
                        if record_value != value:
                            return False
                    elif op == "!=":
                        if record_value == value:
                            return False
                    elif op == "in":
                        if record_value not in value:
                            return False
                    elif op == "not in":
                        if record_value in value:
                            return False
                    elif op == ">":
                        if not (record_value > value):
                            return False
                    elif op == ">=":
                        if not (record_value >= value):
                            return False
                    elif op == "<":
                        if not (record_value < value):
                            return False
                    elif op == "<=":
                        if not (record_value <= value):
                            return False

            return True
        except Exception:
            return False

    def _evaluate_condition(
        self,
        condition_code: str,
        record: Any,
    ) -> bool:
        """Evaluate Python condition."""
        try:
            # Limited context for safety
            context = {
                "record": record,
                "True": True,
                "False": False,
                "None": None,
            }
            result = eval(condition_code, {"__builtins__": {}}, context)
            return bool(result)
        except Exception:
            return False

    def execute_transition(
        self,
        transition_id: int,
        model_name: str,
        res_id: int,
        user_id: Optional[int] = None,
        user_name: Optional[str] = None,
        note: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        skip_conditions: bool = False,
    ) -> Dict[str, Any]:
        """
        Execute a workflow transition.

        Args:
            transition_id: Transition ID
            model_name: Model name
            res_id: Record ID
            user_id: User executing the transition
            user_name: User name for logging
            note: Optional note/reason
            context: Additional context data
            skip_conditions: Skip condition checks (admin only)

        Returns:
            Result dict with success status and new state
        """
        transition = self.get_transition(transition_id)
        if not transition:
            return {"success": False, "error": "Transition not found"}

        if not transition.is_active:
            return {"success": False, "error": "Transition is not active"}

        workflow = self.get_workflow_by_id(transition.workflow_id)
        if not workflow or not workflow.is_active:
            return {"success": False, "error": "Workflow is not active"}

        # Get or create state
        state = WorkflowState.get_or_create(
            self.db,
            workflow.id,
            model_name,
            res_id,
            workflow.default_state,
        )

        # Verify current state
        if state.current_state != transition.from_state:
            return {
                "success": False,
                "error": f"Invalid state: expected '{transition.from_state}', got '{state.current_state}'"
            }

        # Execute transition
        old_state = state.current_state
        new_state = transition.to_state

        # Update state
        state.previous_state = old_state
        state.current_state = new_state
        state.last_transition_id = transition.id
        state.last_changed_by = user_id
        state.last_changed_at = datetime.utcnow()

        # Add history entry
        state.add_history_entry(
            from_state=old_state,
            to_state=new_state,
            user_id=user_id,
            transition_code=transition.code,
            note=note,
        )

        # Log activity
        activity = WorkflowActivity(
            workflow_id=workflow.id,
            transition_id=transition.id,
            model_name=model_name,
            res_id=res_id,
            from_state=old_state,
            to_state=new_state,
            transition_code=transition.code,
            user_id=user_id,
            user_name=user_name,
            note=note,
            context_data=context or {},
            is_automatic=False,
        )
        self.db.add(activity)

        # Execute action if defined
        action_result = None
        if transition.python_code:
            try:
                # Limited execution context
                exec_context = {
                    "transition": transition,
                    "old_state": old_state,
                    "new_state": new_state,
                    "user_id": user_id,
                    "note": note,
                }
                exec(transition.python_code, {"__builtins__": {}}, exec_context)
                action_result = exec_context.get("result")
            except Exception as e:
                # Log error but don't fail transition
                action_result = {"error": str(e)}

        self.db.flush()

        return {
            "success": True,
            "from_state": old_state,
            "to_state": new_state,
            "transition_code": transition.code,
            "action_result": action_result,
        }

    # -------------------------------------------------------------------------
    # History
    # -------------------------------------------------------------------------

    def get_workflow_history(
        self,
        model_name: str,
        res_id: int,
    ) -> List[Dict[str, Any]]:
        """
        Get state change history for a record.

        Args:
            model_name: Model name
            res_id: Record ID

        Returns:
            List of history entries
        """
        state = WorkflowState.get_for_record(self.db, model_name, res_id)
        if not state:
            return []

        return state.history or []

    def get_activities(
        self,
        model_name: Optional[str] = None,
        res_id: Optional[int] = None,
        workflow_id: Optional[int] = None,
        user_id: Optional[int] = None,
        limit: int = 100,
    ) -> List[WorkflowActivity]:
        """
        Get workflow activities with filters.

        Args:
            model_name: Filter by model
            res_id: Filter by record ID
            workflow_id: Filter by workflow
            user_id: Filter by user
            limit: Maximum results

        Returns:
            List of WorkflowActivity
        """
        query = self.db.query(WorkflowActivity)

        if model_name:
            query = query.filter(WorkflowActivity.model_name == model_name)
        if res_id is not None:
            query = query.filter(WorkflowActivity.res_id == res_id)
        if workflow_id:
            query = query.filter(WorkflowActivity.workflow_id == workflow_id)
        if user_id:
            query = query.filter(WorkflowActivity.user_id == user_id)

        return query.order_by(WorkflowActivity.created_at.desc()).limit(limit).all()

    # -------------------------------------------------------------------------
    # Visualization
    # -------------------------------------------------------------------------

    def get_visualization_data(self, workflow_code: str) -> Optional[Dict[str, Any]]:
        """
        Get data for workflow visualization (graph/diagram).

        Args:
            workflow_code: Workflow code

        Returns:
            Visualization data with nodes and edges
        """
        workflow = self.get_workflow(workflow_code)
        if not workflow:
            return None

        # Build nodes from states
        nodes = []
        for i, state in enumerate(workflow.states or []):
            node = {
                "id": state.get("code"),
                "label": state.get("name"),
                "sequence": state.get("sequence", i * 10),
                "is_start": state.get("is_start", False),
                "is_end": state.get("is_end", False),
                "color": state.get("color"),
            }
            nodes.append(node)

        # Build edges from transitions
        edges = []
        for transition in self.get_transitions(workflow.id, active_only=True):
            edge = {
                "id": f"t_{transition.id}",
                "source": transition.from_state,
                "target": transition.to_state,
                "label": transition.button_name or transition.name,
                "code": transition.code,
            }
            edges.append(edge)

        return {
            "workflow_code": workflow.code,
            "workflow_name": workflow.name,
            "model_name": workflow.model_name,
            "nodes": nodes,
            "edges": edges,
        }

    # -------------------------------------------------------------------------
    # Batch Operations
    # -------------------------------------------------------------------------

    def get_records_in_state(
        self,
        workflow_code: str,
        state: str,
    ) -> List[Dict[str, Any]]:
        """
        Get all records in a specific state.

        Args:
            workflow_code: Workflow code
            state: State code

        Returns:
            List of record references
        """
        workflow = self.get_workflow(workflow_code)
        if not workflow:
            return []

        states = WorkflowState.get_records_in_state(
            self.db, workflow.id, state
        )

        return [
            {
                "model_name": s.model_name,
                "res_id": s.res_id,
                "current_state": s.current_state,
            }
            for s in states
        ]


# Convenience function for dependency injection
def get_workflow_service(db: Session) -> WorkflowService:
    """Get workflow service instance."""
    return WorkflowService(db)
