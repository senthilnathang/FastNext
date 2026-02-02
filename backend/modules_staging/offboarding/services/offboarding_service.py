"""
Offboarding Service

Business logic for offboarding operations.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session, joinedload

from ..models import (
    ExitReason, OffboardingTemplate, OffboardingStage, TaskTemplate,
    OffboardingEmployee, OffboardingTask, AssetReturn, ExitInterview,
    FnFSettlement, FnFComponent,
    ResignationLetter, OffboardingNote, OffboardingGeneralSetting,
    OffboardingStatus, ExitType, TaskStatus, TaskPriority, FnFStatus,
)
from ..models.offboarding import (
    template_stages, stage_tasks
)
from ..schemas.offboarding import (
    ExitReasonCreate, ExitReasonUpdate,
    OffboardingTemplateCreate, OffboardingTemplateUpdate,
    OffboardingStageCreate, OffboardingStageUpdate,
    TaskTemplateCreate, TaskTemplateUpdate,
    OffboardingEmployeeCreate, OffboardingEmployeeUpdate,
    OffboardingTaskCreate, OffboardingTaskUpdate,
    AssetReturnCreate, AssetReturnUpdate,
    ExitInterviewCreate, ExitInterviewUpdate,
    FnFSettlementCreate, FnFSettlementUpdate,
    FnFComponentCreate,
    OffboardingDashboard, OffboardingProgress
)


class OffboardingService:
    """Service for managing offboarding operations."""

    def __init__(self, db: Session):
        self.db = db

    # ============== Exit Reason Operations ==============

    def create_exit_reason(
        self,
        data: ExitReasonCreate,
        company_id: int,
        user_id: int
    ) -> ExitReason:
        """Create a new exit reason."""
        reason = ExitReason(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(reason)
        self.db.commit()
        self.db.refresh(reason)
        return reason

    def list_exit_reasons(
        self,
        company_id: int,
        exit_type: Optional[ExitType] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[ExitReason], int]:
        """List exit reasons with pagination."""
        query = self.db.query(ExitReason).filter(
            ExitReason.company_id == company_id,
            ExitReason.is_deleted == False
        )

        if exit_type:
            query = query.filter(ExitReason.exit_type == exit_type)

        total = query.count()
        reasons = query.order_by(ExitReason.name).offset(skip).limit(limit).all()
        return reasons, total

    # ============== Template Operations ==============

    def create_template(
        self,
        data: OffboardingTemplateCreate,
        company_id: int,
        user_id: int
    ) -> OffboardingTemplate:
        """Create a new offboarding template."""
        template = OffboardingTemplate(
            **data.model_dump(exclude={"stage_ids"}),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(template)
        self.db.flush()

        if data.stage_ids:
            stages = self.db.query(OffboardingStage).filter(
                OffboardingStage.id.in_(data.stage_ids),
                OffboardingStage.company_id == company_id
            ).all()
            template.stages = stages

        self.db.commit()
        self.db.refresh(template)
        return template

    def get_template(self, template_id: int, company_id: int) -> Optional[OffboardingTemplate]:
        """Get a template by ID."""
        return self.db.query(OffboardingTemplate).filter(
            OffboardingTemplate.id == template_id,
            OffboardingTemplate.company_id == company_id,
            OffboardingTemplate.is_deleted == False
        ).first()

    def list_templates(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100,
        exit_type: Optional[ExitType] = None
    ) -> Tuple[List[OffboardingTemplate], int]:
        """List templates with pagination."""
        query = self.db.query(OffboardingTemplate).filter(
            OffboardingTemplate.company_id == company_id,
            OffboardingTemplate.is_deleted == False
        )

        if exit_type:
            query = query.filter(OffboardingTemplate.exit_type == exit_type)

        total = query.count()
        templates = query.order_by(OffboardingTemplate.name).offset(skip).limit(limit).all()
        return templates, total

    # ============== Stage Operations ==============

    def create_stage(
        self,
        data: OffboardingStageCreate,
        company_id: int,
        user_id: int
    ) -> OffboardingStage:
        """Create a new stage."""
        stage = OffboardingStage(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(stage)
        self.db.commit()
        self.db.refresh(stage)
        return stage

    def get_stage(self, stage_id: int, company_id: int) -> Optional[OffboardingStage]:
        """Get a stage by ID."""
        return self.db.query(OffboardingStage).filter(
            OffboardingStage.id == stage_id,
            OffboardingStage.company_id == company_id,
            OffboardingStage.is_deleted == False
        ).first()

    def list_stages(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[OffboardingStage], int]:
        """List stages with pagination."""
        query = self.db.query(OffboardingStage).filter(
            OffboardingStage.company_id == company_id,
            OffboardingStage.is_deleted == False
        )

        total = query.count()
        stages = query.order_by(OffboardingStage.sequence).offset(skip).limit(limit).all()
        return stages, total

    # ============== Offboarding Employee Operations ==============

    def create_offboarding_employee(
        self,
        data: OffboardingEmployeeCreate,
        company_id: int,
        user_id: int
    ) -> OffboardingEmployee:
        """Create a new offboarding employee record."""
        template = None
        if data.template_id:
            template = self.get_template(data.template_id, company_id)

        employee = OffboardingEmployee(
            **data.model_dump(),
            notice_start_date=data.resignation_date or date.today(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(employee)
        self.db.flush()

        # Create tasks from template
        if template:
            self._create_tasks_from_template(employee, template, company_id, user_id)
            # Set initial stage
            if template.stages:
                employee.current_stage_id = template.stages[0].id
            # Create exit interview if required
            if template.require_exit_interview:
                self._create_exit_interview(employee, company_id, user_id)

        # Create FnF settlement record
        self._create_fnf_settlement(employee, company_id, user_id)

        self.db.commit()
        self.db.refresh(employee)
        return employee

    def _create_tasks_from_template(
        self,
        employee: OffboardingEmployee,
        template: OffboardingTemplate,
        company_id: int,
        user_id: int
    ):
        """Create tasks for an employee from a template."""
        for stage in template.stages:
            for task_template in stage.task_templates:
                due_date = None
                if task_template.days_before_exit:
                    due_date = employee.last_working_day - timedelta(days=task_template.days_before_exit)

                task = OffboardingTask(
                    offboarding_employee_id=employee.id,
                    template_id=task_template.id,
                    stage_id=stage.id,
                    name=task_template.name,
                    description=task_template.description,
                    category=task_template.category,
                    instructions=task_template.instructions,
                    due_date=due_date,
                    priority=task_template.priority,
                    is_mandatory=task_template.is_mandatory,
                    is_blocking=task_template.blocking,
                    requires_approval=task_template.requires_approval,
                    company_id=company_id,
                    created_by=user_id
                )

                # Determine assignee
                if task_template.assigned_user_id:
                    task.assigned_to_id = task_template.assigned_user_id

                self.db.add(task)

    def _create_exit_interview(
        self,
        employee: OffboardingEmployee,
        company_id: int,
        user_id: int
    ):
        """Create exit interview record."""
        interview = ExitInterview(
            offboarding_employee_id=employee.id,
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(interview)

    def _create_fnf_settlement(
        self,
        employee: OffboardingEmployee,
        company_id: int,
        user_id: int
    ):
        """Create FnF settlement record."""
        settlement = FnFSettlement(
            offboarding_employee_id=employee.id,
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(settlement)

    def get_offboarding_employee(
        self,
        offboarding_id: int,
        company_id: int
    ) -> Optional[OffboardingEmployee]:
        """Get an offboarding employee by ID."""
        return self.db.query(OffboardingEmployee).options(
            joinedload(OffboardingEmployee.template),
            joinedload(OffboardingEmployee.current_stage),
            joinedload(OffboardingEmployee.exit_reason),
            joinedload(OffboardingEmployee.tasks),
            joinedload(OffboardingEmployee.asset_returns),
            joinedload(OffboardingEmployee.exit_interview),
            joinedload(OffboardingEmployee.fnf_settlement)
        ).filter(
            OffboardingEmployee.id == offboarding_id,
            OffboardingEmployee.company_id == company_id,
            OffboardingEmployee.is_deleted == False
        ).first()

    def list_offboarding_employees(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OffboardingStatus] = None,
        exit_type: Optional[ExitType] = None,
        stage_id: Optional[int] = None
    ) -> Tuple[List[OffboardingEmployee], int]:
        """List offboarding employees with pagination."""
        query = self.db.query(OffboardingEmployee).filter(
            OffboardingEmployee.company_id == company_id,
            OffboardingEmployee.is_deleted == False
        )

        if status:
            query = query.filter(OffboardingEmployee.status == status)
        if exit_type:
            query = query.filter(OffboardingEmployee.exit_type == exit_type)
        if stage_id:
            query = query.filter(OffboardingEmployee.current_stage_id == stage_id)

        total = query.count()
        employees = query.order_by(OffboardingEmployee.last_working_day).offset(skip).limit(limit).all()
        return employees, total

    def update_offboarding_employee(
        self,
        offboarding_id: int,
        data: OffboardingEmployeeUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[OffboardingEmployee]:
        """Update an offboarding employee."""
        employee = self.get_offboarding_employee(offboarding_id, company_id)
        if not employee:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(employee, field, value)

        employee.updated_by = user_id
        self._update_progress(employee)

        self.db.commit()
        self.db.refresh(employee)
        return employee

    def approve_offboarding(
        self,
        offboarding_id: int,
        company_id: int,
        user_id: int
    ) -> Optional[OffboardingEmployee]:
        """Approve an offboarding request."""
        employee = self.get_offboarding_employee(offboarding_id, company_id)
        if not employee or employee.status != OffboardingStatus.PENDING_APPROVAL:
            return None

        employee.status = OffboardingStatus.APPROVED
        employee.approved_by_id = user_id
        employee.approved_date = datetime.utcnow()
        employee.updated_by = user_id

        self.db.commit()
        self.db.refresh(employee)
        return employee

    def start_offboarding(
        self,
        offboarding_id: int,
        company_id: int,
        user_id: int
    ) -> Optional[OffboardingEmployee]:
        """Start the offboarding process."""
        employee = self.get_offboarding_employee(offboarding_id, company_id)
        if not employee or employee.status not in [OffboardingStatus.APPROVED, OffboardingStatus.ON_HOLD]:
            return None

        employee.status = OffboardingStatus.IN_PROGRESS
        employee.updated_by = user_id

        self.db.commit()
        self.db.refresh(employee)
        return employee

    def move_to_stage(
        self,
        offboarding_id: int,
        stage_id: int,
        company_id: int,
        user_id: int
    ) -> Optional[OffboardingEmployee]:
        """Move an employee to a different stage."""
        employee = self.get_offboarding_employee(offboarding_id, company_id)
        if not employee:
            return None

        stage = self.get_stage(stage_id, company_id)
        if not stage:
            return None

        employee.current_stage_id = stage_id
        employee.updated_by = user_id

        self._update_progress(employee)
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def _update_progress(self, employee: OffboardingEmployee):
        """Update the progress percentage for an employee."""
        total_tasks = len(employee.tasks)
        if total_tasks == 0:
            employee.progress_percentage = 0
            return

        completed_tasks = sum(1 for t in employee.tasks if t.status == TaskStatus.COMPLETED)
        employee.progress_percentage = int((completed_tasks / total_tasks) * 100)

        # Update status based on progress
        if employee.progress_percentage == 100:
            employee.status = OffboardingStatus.COMPLETED
            employee.actual_exit_date = date.today()
        elif employee.progress_percentage > 0 and employee.status == OffboardingStatus.APPROVED:
            employee.status = OffboardingStatus.IN_PROGRESS

    # ============== Task Operations ==============

    def create_task(
        self,
        data: OffboardingTaskCreate,
        company_id: int,
        user_id: int
    ) -> OffboardingTask:
        """Create a new task."""
        task = OffboardingTask(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_task(self, task_id: int, company_id: int) -> Optional[OffboardingTask]:
        """Get a task by ID."""
        return self.db.query(OffboardingTask).filter(
            OffboardingTask.id == task_id,
            OffboardingTask.company_id == company_id,
            OffboardingTask.is_deleted == False
        ).first()

    def list_tasks(
        self,
        company_id: int,
        offboarding_employee_id: Optional[int] = None,
        assigned_to_id: Optional[int] = None,
        status: Optional[TaskStatus] = None,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[OffboardingTask], int]:
        """List tasks with pagination."""
        query = self.db.query(OffboardingTask).filter(
            OffboardingTask.company_id == company_id,
            OffboardingTask.is_deleted == False
        )

        if offboarding_employee_id:
            query = query.filter(OffboardingTask.offboarding_employee_id == offboarding_employee_id)
        if assigned_to_id:
            query = query.filter(OffboardingTask.assigned_to_id == assigned_to_id)
        if status:
            query = query.filter(OffboardingTask.status == status)
        if category:
            query = query.filter(OffboardingTask.category == category)

        total = query.count()
        tasks = query.order_by(OffboardingTask.due_date).offset(skip).limit(limit).all()
        return tasks, total

    def complete_task(
        self,
        task_id: int,
        company_id: int,
        user_id: int,
        completion_notes: Optional[str] = None
    ) -> Optional[OffboardingTask]:
        """Mark a task as completed."""
        task = self.get_task(task_id, company_id)
        if not task:
            return None

        task.status = TaskStatus.COMPLETED
        task.completed_date = datetime.utcnow()
        task.completion_notes = completion_notes
        task.updated_by = user_id

        # Update parent employee progress
        employee = self.get_offboarding_employee(task.offboarding_employee_id, company_id)
        if employee:
            self._update_progress(employee)

        self.db.commit()
        self.db.refresh(task)
        return task

    # ============== Asset Return Operations ==============

    def create_asset_return(
        self,
        data: AssetReturnCreate,
        company_id: int,
        user_id: int
    ) -> AssetReturn:
        """Create a new asset return record."""
        asset_return = AssetReturn(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(asset_return)
        self.db.commit()
        self.db.refresh(asset_return)
        return asset_return

    def mark_asset_returned(
        self,
        asset_return_id: int,
        company_id: int,
        user_id: int,
        condition: str = "good",
        condition_notes: Optional[str] = None
    ) -> Optional[AssetReturn]:
        """Mark an asset as returned."""
        asset_return = self.db.query(AssetReturn).filter(
            AssetReturn.id == asset_return_id,
            AssetReturn.company_id == company_id,
            AssetReturn.is_deleted == False
        ).first()

        if not asset_return:
            return None

        asset_return.is_returned = True
        asset_return.return_date = date.today()
        asset_return.received_by_id = user_id
        asset_return.condition = condition
        asset_return.condition_notes = condition_notes

        self.db.commit()
        self.db.refresh(asset_return)
        return asset_return

    def list_asset_returns(
        self,
        company_id: int,
        offboarding_employee_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[AssetReturn], int]:
        """List asset returns for an employee."""
        query = self.db.query(AssetReturn).filter(
            AssetReturn.company_id == company_id,
            AssetReturn.offboarding_employee_id == offboarding_employee_id,
            AssetReturn.is_deleted == False
        )

        total = query.count()
        returns = query.offset(skip).limit(limit).all()
        return returns, total

    # ============== Exit Interview Operations ==============

    def get_exit_interview(
        self,
        offboarding_employee_id: int,
        company_id: int
    ) -> Optional[ExitInterview]:
        """Get exit interview for an employee."""
        return self.db.query(ExitInterview).filter(
            ExitInterview.offboarding_employee_id == offboarding_employee_id,
            ExitInterview.company_id == company_id,
            ExitInterview.is_deleted == False
        ).first()

    def update_exit_interview(
        self,
        interview_id: int,
        data: ExitInterviewUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[ExitInterview]:
        """Update exit interview."""
        interview = self.db.query(ExitInterview).filter(
            ExitInterview.id == interview_id,
            ExitInterview.company_id == company_id,
            ExitInterview.is_deleted == False
        ).first()

        if not interview:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(interview, field, value)

        interview.updated_by = user_id

        if data.is_completed:
            interview.conducted_by_id = user_id
            interview.conducted_date = datetime.utcnow()

        self.db.commit()
        self.db.refresh(interview)
        return interview

    # ============== FnF Settlement Operations ==============

    def get_fnf_settlement(
        self,
        offboarding_employee_id: int,
        company_id: int
    ) -> Optional[FnFSettlement]:
        """Get FnF settlement for an employee."""
        return self.db.query(FnFSettlement).options(
            joinedload(FnFSettlement.components)
        ).filter(
            FnFSettlement.offboarding_employee_id == offboarding_employee_id,
            FnFSettlement.company_id == company_id,
            FnFSettlement.is_deleted == False
        ).first()

    def update_fnf_settlement(
        self,
        settlement_id: int,
        data: FnFSettlementUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[FnFSettlement]:
        """Update FnF settlement."""
        settlement = self.db.query(FnFSettlement).filter(
            FnFSettlement.id == settlement_id,
            FnFSettlement.company_id == company_id,
            FnFSettlement.is_deleted == False
        ).first()

        if not settlement:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(settlement, field, value)

        settlement.updated_by = user_id

        # Recalculate totals
        self._calculate_fnf_totals(settlement)

        self.db.commit()
        self.db.refresh(settlement)
        return settlement

    def _calculate_fnf_totals(self, settlement: FnFSettlement):
        """Calculate FnF settlement totals."""
        settlement.total_earnings = (
            settlement.pending_salary +
            settlement.leave_encashment +
            settlement.bonus_pending +
            settlement.gratuity +
            settlement.notice_pay +
            settlement.reimbursements +
            settlement.other_earnings
        )

        settlement.total_deductions = (
            settlement.notice_recovery +
            settlement.loan_recovery +
            settlement.advance_recovery +
            settlement.asset_deductions +
            settlement.tax_deductions +
            settlement.other_deductions
        )

        # Add custom components
        for component in settlement.components:
            if component.component_type == "earning":
                settlement.total_earnings += component.amount
            else:
                settlement.total_deductions += component.amount

        settlement.net_payable = settlement.total_earnings - settlement.total_deductions

    def approve_fnf_hr(
        self,
        settlement_id: int,
        company_id: int,
        user_id: int
    ) -> Optional[FnFSettlement]:
        """HR approval for FnF settlement."""
        settlement = self.db.query(FnFSettlement).filter(
            FnFSettlement.id == settlement_id,
            FnFSettlement.company_id == company_id
        ).first()

        if not settlement:
            return None

        settlement.hr_approved_by_id = user_id
        settlement.hr_approved_date = datetime.utcnow()
        settlement.status = FnFStatus.PENDING_APPROVAL

        self.db.commit()
        self.db.refresh(settlement)
        return settlement

    def approve_fnf_finance(
        self,
        settlement_id: int,
        company_id: int,
        user_id: int
    ) -> Optional[FnFSettlement]:
        """Finance approval for FnF settlement."""
        settlement = self.db.query(FnFSettlement).filter(
            FnFSettlement.id == settlement_id,
            FnFSettlement.company_id == company_id
        ).first()

        if not settlement:
            return None

        settlement.finance_approved_by_id = user_id
        settlement.finance_approved_date = datetime.utcnow()
        settlement.status = FnFStatus.APPROVED

        self.db.commit()
        self.db.refresh(settlement)
        return settlement

    def mark_fnf_paid(
        self,
        settlement_id: int,
        company_id: int,
        user_id: int,
        payment_date: date,
        payment_reference: str
    ) -> Optional[FnFSettlement]:
        """Mark FnF settlement as paid."""
        settlement = self.db.query(FnFSettlement).filter(
            FnFSettlement.id == settlement_id,
            FnFSettlement.company_id == company_id
        ).first()

        if not settlement:
            return None

        settlement.status = FnFStatus.PAID
        settlement.payment_date = payment_date
        settlement.payment_reference = payment_reference
        settlement.updated_by = user_id

        self.db.commit()
        self.db.refresh(settlement)
        return settlement

    # ============== Dashboard Operations ==============

    def get_dashboard(self, company_id: int) -> OffboardingDashboard:
        """Get offboarding dashboard data."""
        today = date.today()
        month_start = today.replace(day=1)

        # Counts by status
        total_in_progress = self.db.query(OffboardingEmployee).filter(
            OffboardingEmployee.company_id == company_id,
            OffboardingEmployee.status == OffboardingStatus.IN_PROGRESS,
            OffboardingEmployee.is_deleted == False
        ).count()

        total_pending_approval = self.db.query(OffboardingEmployee).filter(
            OffboardingEmployee.company_id == company_id,
            OffboardingEmployee.status == OffboardingStatus.PENDING_APPROVAL,
            OffboardingEmployee.is_deleted == False
        ).count()

        total_completed_this_month = self.db.query(OffboardingEmployee).filter(
            OffboardingEmployee.company_id == company_id,
            OffboardingEmployee.status == OffboardingStatus.COMPLETED,
            OffboardingEmployee.actual_exit_date >= month_start,
            OffboardingEmployee.is_deleted == False
        ).count()

        # Upcoming exits (next 30 days)
        upcoming_exits = self.db.query(OffboardingEmployee).filter(
            OffboardingEmployee.company_id == company_id,
            OffboardingEmployee.last_working_day >= today,
            OffboardingEmployee.last_working_day <= today + timedelta(days=30),
            OffboardingEmployee.status.in_([OffboardingStatus.IN_PROGRESS, OffboardingStatus.APPROVED]),
            OffboardingEmployee.is_deleted == False
        ).count()

        # By exit type
        by_exit_type = []
        for exit_type in ExitType:
            count = self.db.query(OffboardingEmployee).filter(
                OffboardingEmployee.company_id == company_id,
                OffboardingEmployee.exit_type == exit_type,
                OffboardingEmployee.is_deleted == False
            ).count()
            if count > 0:
                by_exit_type.append({"type": exit_type.value, "count": count})

        # Recent and upcoming
        recent = self.db.query(OffboardingEmployee).filter(
            OffboardingEmployee.company_id == company_id,
            OffboardingEmployee.status.in_([OffboardingStatus.IN_PROGRESS, OffboardingStatus.APPROVED]),
            OffboardingEmployee.is_deleted == False
        ).order_by(OffboardingEmployee.last_working_day).limit(5).all()

        recent_exits = []
        for emp in recent:
            total_tasks = len(emp.tasks)
            completed_tasks = sum(1 for t in emp.tasks if t.status == TaskStatus.COMPLETED)
            pending_tasks = sum(1 for t in emp.tasks if t.status == TaskStatus.PENDING)
            blocking = sum(1 for t in emp.tasks if t.is_blocking and t.status != TaskStatus.COMPLETED)

            days_remaining = (emp.last_working_day - today).days

            recent_exits.append(OffboardingProgress(
                employee_id=emp.employee_id,
                employee_name=f"Employee {emp.employee_id}",  # Would fetch from employee
                exit_type=emp.exit_type,
                status=emp.status,
                progress_percentage=emp.progress_percentage,
                current_stage=emp.current_stage.name if emp.current_stage else None,
                last_working_day=emp.last_working_day,
                days_remaining=days_remaining,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                pending_tasks=pending_tasks,
                blocking_tasks=blocking
            ))

        # Exit interview stats
        total_interviews = self.db.query(ExitInterview).filter(
            ExitInterview.company_id == company_id,
            ExitInterview.is_deleted == False
        ).count()

        completed_interviews = self.db.query(ExitInterview).filter(
            ExitInterview.company_id == company_id,
            ExitInterview.is_completed == True,
            ExitInterview.is_deleted == False
        ).count()

        exit_interview_stats = {
            "total": total_interviews,
            "completed": completed_interviews,
            "pending": total_interviews - completed_interviews
        }

        return OffboardingDashboard(
            total_in_progress=total_in_progress,
            total_completed_this_month=total_completed_this_month,
            total_pending_approval=total_pending_approval,
            upcoming_exits=upcoming_exits,
            by_exit_type=by_exit_type,
            recent_exits=recent_exits,
            exit_interview_stats=exit_interview_stats
        )

    # =========================================================================
    # Resignation Letter Operations
    # =========================================================================

    def create_resignation(self, company_id: int, data: dict, created_by_id: int = None) -> ResignationLetter:
        resignation = ResignationLetter(
            employee_id=data["employee_id"],
            title=data.get("title"),
            description=data.get("description"),
            planned_to_leave_on=data["planned_to_leave_on"],
            status="requested",
            company_id=company_id,
            created_by=created_by_id,
        )
        self.db.add(resignation)
        self.db.commit()
        self.db.refresh(resignation)
        return resignation

    def list_resignations(self, company_id: int, status: str = None, search: str = None,
                          skip: int = 0, limit: int = 20) -> tuple:
        from modules.employee.models import Employee

        query = self.db.query(ResignationLetter).filter(
            ResignationLetter.company_id == company_id,
            ResignationLetter.deleted_at.is_(None),
        )
        if status:
            query = query.filter(ResignationLetter.status == status)
        if search:
            query = query.join(Employee, ResignationLetter.employee_id == Employee.id).filter(
                or_(
                    func.concat(Employee.first_name, ' ', Employee.last_name).ilike(f"%{search}%"),
                    ResignationLetter.title.ilike(f"%{search}%"),
                )
            )
        total = query.count()
        items = query.order_by(ResignationLetter.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_resignation(self, resignation_id: int, company_id: int) -> ResignationLetter:
        return self.db.query(ResignationLetter).filter(
            ResignationLetter.id == resignation_id,
            ResignationLetter.company_id == company_id,
            ResignationLetter.deleted_at.is_(None),
        ).first()

    def update_resignation(self, resignation_id: int, company_id: int, data: dict) -> ResignationLetter:
        resignation = self.get_resignation(resignation_id, company_id)
        if not resignation:
            return None
        for key, value in data.items():
            if value is not None and hasattr(resignation, key):
                setattr(resignation, key, value)
        self.db.commit()
        self.db.refresh(resignation)
        return resignation

    def delete_resignation(self, resignation_id: int, company_id: int) -> bool:
        resignation = self.get_resignation(resignation_id, company_id)
        if not resignation:
            return False
        resignation.deleted_at = func.now()
        self.db.commit()
        return True

    def approve_resignation(self, resignation_id: int, company_id: int, approved_by_id: int,
                            offboarding_data: dict = None) -> ResignationLetter:
        resignation = self.get_resignation(resignation_id, company_id)
        if not resignation:
            return None
        resignation.status = "approved"
        resignation.approved_by_id = approved_by_id
        resignation.approved_date = func.now()

        # Optionally create offboarding employee from resignation
        if offboarding_data:
            offboarding_data["employee_id"] = resignation.employee_id
            offboarding_data["exit_type"] = "resignation"
            offboarding_create = OffboardingEmployeeCreate(**offboarding_data)
            offboarding_employee = self.create_offboarding_employee(
                offboarding_create, company_id, approved_by_id
            )
            resignation.offboarding_employee_id = offboarding_employee.id

        self.db.commit()
        self.db.refresh(resignation)
        return resignation

    def reject_resignation(self, resignation_id: int, company_id: int, reason: str = None) -> ResignationLetter:
        resignation = self.get_resignation(resignation_id, company_id)
        if not resignation:
            return None
        resignation.status = "rejected"
        resignation.rejection_reason = reason
        self.db.commit()
        self.db.refresh(resignation)
        return resignation

    # =========================================================================
    # Note Operations
    # =========================================================================

    def create_note(self, company_id: int, data: dict, note_by_id: int = None) -> OffboardingNote:
        note = OffboardingNote(
            offboarding_employee_id=data["offboarding_employee_id"],
            description=data["description"],
            note_by_id=note_by_id,
            company_id=company_id,
        )
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note

    def list_notes(self, offboarding_employee_id: int, company_id: int):
        return self.db.query(OffboardingNote).filter(
            OffboardingNote.offboarding_employee_id == offboarding_employee_id,
            OffboardingNote.company_id == company_id,
            OffboardingNote.deleted_at.is_(None),
        ).order_by(OffboardingNote.created_at.desc()).all()

    def delete_note(self, note_id: int, company_id: int) -> bool:
        note = self.db.query(OffboardingNote).filter(
            OffboardingNote.id == note_id,
            OffboardingNote.company_id == company_id,
        ).first()
        if not note:
            return False
        note.deleted_at = func.now()
        self.db.commit()
        return True

    # =========================================================================
    # Settings Operations
    # =========================================================================

    def get_settings(self, company_id: int) -> OffboardingGeneralSetting:
        setting = self.db.query(OffboardingGeneralSetting).filter(
            OffboardingGeneralSetting.company_id == company_id,
        ).first()
        if not setting:
            setting = OffboardingGeneralSetting(company_id=company_id)
            self.db.add(setting)
            self.db.commit()
            self.db.refresh(setting)
        return setting

    def update_settings(self, company_id: int, data: dict) -> OffboardingGeneralSetting:
        setting = self.get_settings(company_id)
        for key, value in data.items():
            if value is not None and hasattr(setting, key):
                setattr(setting, key, value)
        self.db.commit()
        self.db.refresh(setting)
        return setting
