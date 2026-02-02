"""
Approval Service

Business logic for approval workflow operations.
"""

from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from ..models.approval import (
    ApprovalWorkflow, ApprovalLevel, ApprovalRule, ApprovalDelegation,
    ApprovalRequest, ApprovalAction, ApprovalStatus, ApprovalActionType
)
from ..schemas.approval import (
    ApprovalWorkflowCreate, ApprovalWorkflowUpdate,
    ApprovalLevelCreate, ApprovalRuleCreate, ApprovalDelegationCreate
)


class ApprovalService:
    """Service class for approval workflow operations."""

    def __init__(self, db: Session):
        self.db = db

    # Workflow Methods
    def get_workflow(self, workflow_id: int, company_id: int) -> Optional[ApprovalWorkflow]:
        """Get an approval workflow by ID."""
        return self.db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.id == workflow_id,
            ApprovalWorkflow.company_id == company_id,
            ApprovalWorkflow.is_deleted == False
        ).first()

    def get_default_workflow(self, model_name: str, company_id: int) -> Optional[ApprovalWorkflow]:
        """Get the default workflow for a model."""
        return self.db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.model_name == model_name,
            ApprovalWorkflow.company_id == company_id,
            ApprovalWorkflow.is_default == True,
            ApprovalWorkflow.is_active == True,
            ApprovalWorkflow.is_deleted == False
        ).first()

    def list_workflows(
        self,
        company_id: int,
        model_name: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[ApprovalWorkflow], int]:
        """List approval workflows."""
        query = self.db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.company_id == company_id,
            ApprovalWorkflow.is_deleted == False
        )

        if model_name:
            query = query.filter(ApprovalWorkflow.model_name == model_name)

        total = query.count()
        workflows = query.order_by(ApprovalWorkflow.sequence).offset(skip).limit(limit).all()

        return workflows, total

    def create_workflow(self, data: ApprovalWorkflowCreate, company_id: int, user_id: int) -> ApprovalWorkflow:
        """Create a new approval workflow."""
        # If this is set as default, unset other defaults for same model
        if data.is_default:
            self.db.query(ApprovalWorkflow).filter(
                ApprovalWorkflow.model_name == data.model_name,
                ApprovalWorkflow.company_id == company_id,
                ApprovalWorkflow.is_default == True
            ).update({"is_default": False})

        workflow = ApprovalWorkflow(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(workflow)
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def update_workflow(
        self,
        workflow_id: int,
        data: ApprovalWorkflowUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[ApprovalWorkflow]:
        """Update an approval workflow."""
        workflow = self.get_workflow(workflow_id, company_id)
        if not workflow:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workflow, field, value)

        workflow.updated_by = user_id
        self.db.commit()
        self.db.refresh(workflow)
        return workflow

    def delete_workflow(self, workflow_id: int, company_id: int, user_id: int) -> bool:
        """Soft delete an approval workflow."""
        workflow = self.get_workflow(workflow_id, company_id)
        if not workflow:
            return False

        workflow.soft_delete(user_id)
        self.db.commit()
        return True

    # Level Methods
    def add_level(self, data: ApprovalLevelCreate, company_id: int, user_id: int) -> ApprovalLevel:
        """Add a level to a workflow."""
        level = ApprovalLevel(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(level)
        self.db.commit()
        self.db.refresh(level)
        return level

    def remove_level(self, level_id: int, company_id: int) -> bool:
        """Remove a level from a workflow."""
        level = self.db.query(ApprovalLevel).filter(
            ApprovalLevel.id == level_id,
            ApprovalLevel.company_id == company_id
        ).first()
        if not level:
            return False

        self.db.delete(level)
        self.db.commit()
        return True

    # Delegation Methods
    def get_delegation(self, delegation_id: int, company_id: int) -> Optional[ApprovalDelegation]:
        """Get an approval delegation by ID."""
        return self.db.query(ApprovalDelegation).filter(
            ApprovalDelegation.id == delegation_id,
            ApprovalDelegation.company_id == company_id
        ).first()

    def get_active_delegation(
        self,
        delegator_id: int,
        company_id: int,
        model_name: Optional[str] = None
    ) -> Optional[ApprovalDelegation]:
        """Get active delegation for a user."""
        today = date.today()
        query = self.db.query(ApprovalDelegation).filter(
            ApprovalDelegation.delegator_id == delegator_id,
            ApprovalDelegation.company_id == company_id,
            ApprovalDelegation.is_active == True,
            ApprovalDelegation.start_date <= today,
            ApprovalDelegation.end_date >= today
        )

        if model_name:
            query = query.filter(
                ApprovalDelegation.model_name.in_([model_name, None])
            )

        return query.first()

    def create_delegation(
        self,
        data: ApprovalDelegationCreate,
        delegator_id: int,
        company_id: int,
        user_id: int
    ) -> ApprovalDelegation:
        """Create a new approval delegation."""
        delegation = ApprovalDelegation(
            **data.model_dump(),
            delegator_id=delegator_id,
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(delegation)
        self.db.commit()
        self.db.refresh(delegation)
        return delegation

    # Request Methods
    def get_request(self, request_id: int, company_id: int) -> Optional[ApprovalRequest]:
        """Get an approval request by ID."""
        return self.db.query(ApprovalRequest).filter(
            ApprovalRequest.id == request_id,
            ApprovalRequest.company_id == company_id
        ).first()

    def get_pending_requests(
        self,
        approver_id: int,
        company_id: int,
        model_name: Optional[str] = None
    ) -> List[ApprovalRequest]:
        """Get pending requests for an approver."""
        # This is a simplified version - in production you'd check the approval levels
        query = self.db.query(ApprovalRequest).filter(
            ApprovalRequest.company_id == company_id,
            ApprovalRequest.status.in_([ApprovalStatus.PENDING, ApprovalStatus.IN_PROGRESS])
        )

        if model_name:
            query = query.filter(ApprovalRequest.model_name == model_name)

        return query.order_by(ApprovalRequest.submitted_at).all()

    def submit_for_approval(
        self,
        workflow_id: int,
        model_name: str,
        record_id: int,
        record_name: str,
        requestor_id: int,
        company_id: int
    ) -> ApprovalRequest:
        """Submit a record for approval."""
        request = ApprovalRequest(
            workflow_id=workflow_id,
            model_name=model_name,
            record_id=record_id,
            record_name=record_name,
            requestor_id=requestor_id,
            company_id=company_id,
            status=ApprovalStatus.PENDING,
            current_level=1
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def take_action(
        self,
        request_id: int,
        action_type: ApprovalActionType,
        user_id: int,
        company_id: int,
        comment: Optional[str] = None,
        on_behalf_of_id: Optional[int] = None
    ) -> Optional[ApprovalAction]:
        """Take an action on an approval request."""
        request = self.get_request(request_id, company_id)
        if not request or not request.is_pending():
            return None

        # Create action record
        action = ApprovalAction(
            request_id=request_id,
            action_type=action_type,
            level=request.current_level,
            user_id=user_id,
            on_behalf_of_id=on_behalf_of_id,
            comment=comment,
            company_id=company_id
        )
        self.db.add(action)

        # Update request status based on action
        if action_type == ApprovalActionType.APPROVE:
            # Check if there are more levels
            workflow = request.workflow
            next_level = request.current_level + 1
            has_more_levels = any(l.sequence > request.current_level for l in workflow.levels)

            if has_more_levels and workflow.require_all_levels:
                request.current_level = next_level
                request.status = ApprovalStatus.IN_PROGRESS
            else:
                request.approve(user_id, comment)

        elif action_type == ApprovalActionType.REJECT:
            request.reject(user_id, comment)

        self.db.commit()
        self.db.refresh(action)
        return action
