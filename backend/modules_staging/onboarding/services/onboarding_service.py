"""
Onboarding Service

Business logic for onboarding operations.
"""

import secrets
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session, joinedload

from ..models import (
    OnboardingTemplate, OnboardingStage, TaskTemplate, DocumentType,
    OnboardingEmployee, OnboardingTask, OnboardingDocument, OnboardingChecklist,
    OnboardingStatus, TaskStatus, TaskPriority, DocumentStatus,
)
from ..models.process import (
    OnboardingProcess, OnboardingProcessStage, OnboardingProcessTask,
    OnboardingPortal, OnboardingProcessStatus, OnboardingProcessStageStatus,
    OnboardingProcessTaskStatus,
)
from ..models.verification import (
    OnboardingVerificationRequirement, CandidateVerification,
)
from ..models.conversion import (
    CandidateToEmployeeConversion, ConversionLog,
    OnboardingDocumentVerificationLog,
)
from ..models.onboarding import (
    template_stages, stage_tasks, template_documents
)
from ..schemas.onboarding import (
    OnboardingTemplateCreate, OnboardingTemplateUpdate,
    OnboardingStageCreate, OnboardingStageUpdate,
    TaskTemplateCreate, TaskTemplateUpdate,
    DocumentTypeCreate, DocumentTypeUpdate,
    OnboardingEmployeeCreate, OnboardingEmployeeUpdate,
    OnboardingTaskCreate, OnboardingTaskUpdate,
    OnboardingDocumentCreate, OnboardingDocumentUpdate,
    OnboardingChecklistCreate, OnboardingChecklistUpdate,
    OnboardingDashboard, OnboardingProgress
)


class OnboardingService:
    """Service for managing onboarding operations."""

    def __init__(self, db: Session):
        self.db = db

    # ============== Template Operations ==============

    def create_template(
        self,
        data: OnboardingTemplateCreate,
        company_id: int,
        user_id: int
    ) -> OnboardingTemplate:
        """Create a new onboarding template."""
        template = OnboardingTemplate(
            **data.model_dump(exclude={"stage_ids", "document_type_ids"}),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(template)
        self.db.flush()

        # Add stages
        if data.stage_ids:
            stages = self.db.query(OnboardingStage).filter(
                OnboardingStage.id.in_(data.stage_ids),
                OnboardingStage.company_id == company_id
            ).all()
            template.stages = stages

        # Add document types
        if data.document_type_ids:
            doc_types = self.db.query(DocumentType).filter(
                DocumentType.id.in_(data.document_type_ids),
                DocumentType.company_id == company_id
            ).all()
            template.document_types = doc_types

        self.db.commit()
        self.db.refresh(template)
        return template

    def get_template(self, template_id: int, company_id: int) -> Optional[OnboardingTemplate]:
        """Get a template by ID."""
        return self.db.query(OnboardingTemplate).filter(
            OnboardingTemplate.id == template_id,
            OnboardingTemplate.company_id == company_id,
            OnboardingTemplate.is_deleted == False
        ).first()

    def list_templates(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> Tuple[List[OnboardingTemplate], int]:
        """List templates with pagination."""
        query = self.db.query(OnboardingTemplate).filter(
            OnboardingTemplate.company_id == company_id,
            OnboardingTemplate.is_deleted == False
        )

        if is_active is not None:
            query = query.filter(OnboardingTemplate.is_active == is_active)

        total = query.count()
        templates = query.order_by(OnboardingTemplate.name).offset(skip).limit(limit).all()
        return templates, total

    def update_template(
        self,
        template_id: int,
        data: OnboardingTemplateUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[OnboardingTemplate]:
        """Update a template."""
        template = self.get_template(template_id, company_id)
        if not template:
            return None

        update_data = data.model_dump(exclude_unset=True, exclude={"stage_ids", "document_type_ids"})
        for field, value in update_data.items():
            setattr(template, field, value)

        template.updated_by = user_id

        # Update stages
        if data.stage_ids is not None:
            stages = self.db.query(OnboardingStage).filter(
                OnboardingStage.id.in_(data.stage_ids),
                OnboardingStage.company_id == company_id
            ).all()
            template.stages = stages

        # Update document types
        if data.document_type_ids is not None:
            doc_types = self.db.query(DocumentType).filter(
                DocumentType.id.in_(data.document_type_ids),
                DocumentType.company_id == company_id
            ).all()
            template.document_types = doc_types

        self.db.commit()
        self.db.refresh(template)
        return template

    def delete_template(self, template_id: int, company_id: int, user_id: int) -> bool:
        """Soft delete a template."""
        template = self.get_template(template_id, company_id)
        if not template:
            return False

        template.is_deleted = True
        template.deleted_by = user_id
        template.deleted_at = datetime.utcnow()
        self.db.commit()
        return True

    # ============== Stage Operations ==============

    def create_stage(
        self,
        data: OnboardingStageCreate,
        company_id: int,
        user_id: int
    ) -> OnboardingStage:
        """Create a new stage."""
        stage = OnboardingStage(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(stage)
        self.db.commit()
        self.db.refresh(stage)
        return stage

    def get_stage(self, stage_id: int, company_id: int) -> Optional[OnboardingStage]:
        """Get a stage by ID."""
        return self.db.query(OnboardingStage).filter(
            OnboardingStage.id == stage_id,
            OnboardingStage.company_id == company_id,
            OnboardingStage.is_deleted == False
        ).first()

    def list_stages(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[OnboardingStage], int]:
        """List stages with pagination."""
        query = self.db.query(OnboardingStage).filter(
            OnboardingStage.company_id == company_id,
            OnboardingStage.is_deleted == False
        )

        total = query.count()
        stages = query.order_by(OnboardingStage.sequence).offset(skip).limit(limit).all()
        return stages, total

    def update_stage(
        self,
        stage_id: int,
        data: OnboardingStageUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[OnboardingStage]:
        """Update a stage."""
        stage = self.get_stage(stage_id, company_id)
        if not stage:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(stage, field, value)

        stage.updated_by = user_id
        self.db.commit()
        self.db.refresh(stage)
        return stage

    # ============== Task Template Operations ==============

    def create_task_template(
        self,
        data: TaskTemplateCreate,
        company_id: int,
        user_id: int
    ) -> TaskTemplate:
        """Create a new task template."""
        task_template = TaskTemplate(
            **data.model_dump(exclude={"stage_ids"}),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(task_template)
        self.db.flush()

        if data.stage_ids:
            stages = self.db.query(OnboardingStage).filter(
                OnboardingStage.id.in_(data.stage_ids),
                OnboardingStage.company_id == company_id
            ).all()
            task_template.stages = stages

        self.db.commit()
        self.db.refresh(task_template)
        return task_template

    def get_task_template(self, template_id: int, company_id: int) -> Optional[TaskTemplate]:
        """Get a task template by ID."""
        return self.db.query(TaskTemplate).filter(
            TaskTemplate.id == template_id,
            TaskTemplate.company_id == company_id,
            TaskTemplate.is_deleted == False
        ).first()

    def list_task_templates(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[TaskTemplate], int]:
        """List task templates with pagination."""
        query = self.db.query(TaskTemplate).filter(
            TaskTemplate.company_id == company_id,
            TaskTemplate.is_deleted == False
        )

        total = query.count()
        templates = query.order_by(TaskTemplate.name).offset(skip).limit(limit).all()
        return templates, total

    # ============== Document Type Operations ==============

    def create_document_type(
        self,
        data: DocumentTypeCreate,
        company_id: int,
        user_id: int
    ) -> DocumentType:
        """Create a new document type."""
        doc_type = DocumentType(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(doc_type)
        self.db.commit()
        self.db.refresh(doc_type)
        return doc_type

    def get_document_type(self, doc_type_id: int, company_id: int) -> Optional[DocumentType]:
        """Get a document type by ID."""
        return self.db.query(DocumentType).filter(
            DocumentType.id == doc_type_id,
            DocumentType.company_id == company_id,
            DocumentType.is_deleted == False
        ).first()

    def list_document_types(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[DocumentType], int]:
        """List document types with pagination."""
        query = self.db.query(DocumentType).filter(
            DocumentType.company_id == company_id,
            DocumentType.is_deleted == False
        )

        total = query.count()
        doc_types = query.order_by(DocumentType.name).offset(skip).limit(limit).all()
        return doc_types, total

    # ============== Onboarding Employee Operations ==============

    def create_onboarding_employee(
        self,
        data: OnboardingEmployeeCreate,
        company_id: int,
        user_id: int
    ) -> OnboardingEmployee:
        """Create a new onboarding employee."""
        # Calculate target completion date
        target_date = None
        template = None

        if data.template_id:
            template = self.get_template(data.template_id, company_id)
            if template and data.start_date:
                target_date = data.start_date + timedelta(days=template.duration_days)

        employee = OnboardingEmployee(
            **data.model_dump(),
            target_completion_date=target_date,
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

        self.db.commit()
        self.db.refresh(employee)
        return employee

    def _create_tasks_from_template(
        self,
        employee: OnboardingEmployee,
        template: OnboardingTemplate,
        company_id: int,
        user_id: int
    ):
        """Create tasks for an employee from a template."""
        for stage in template.stages:
            for task_template in stage.task_templates:
                due_date = None
                if employee.start_date and task_template.duration_days:
                    due_date = employee.start_date + timedelta(days=task_template.duration_days)

                task = OnboardingTask(
                    onboarding_employee_id=employee.id,
                    template_id=task_template.id,
                    stage_id=stage.id,
                    name=task_template.name,
                    description=task_template.description,
                    instructions=task_template.instructions,
                    due_date=due_date,
                    priority=task_template.priority,
                    is_mandatory=task_template.is_mandatory,
                    requires_approval=task_template.requires_approval,
                    requires_document=task_template.requires_document,
                    company_id=company_id,
                    created_by=user_id
                )

                # Determine assignee
                if task_template.assigned_user_id:
                    task.assigned_to_id = task_template.assigned_user_id
                elif task_template.assign_to_manager and employee.manager_id:
                    # Get manager's user_id
                    pass  # Would need to lookup manager's user
                elif task_template.assign_to_employee and employee.portal_user_id:
                    task.assigned_to_id = employee.portal_user_id

                self.db.add(task)

                # Create checklist items
                if task_template.checklist_items:
                    for idx, item in enumerate(task_template.checklist_items):
                        checklist = OnboardingChecklist(
                            onboarding_employee_id=employee.id,
                            task_id=task.id,
                            item=item,
                            sequence=idx,
                            company_id=company_id
                        )
                        self.db.add(checklist)

    def get_onboarding_employee(
        self,
        employee_id: int,
        company_id: int
    ) -> Optional[OnboardingEmployee]:
        """Get an onboarding employee by ID."""
        return self.db.query(OnboardingEmployee).options(
            joinedload(OnboardingEmployee.template),
            joinedload(OnboardingEmployee.current_stage),
            joinedload(OnboardingEmployee.tasks),
            joinedload(OnboardingEmployee.documents)
        ).filter(
            OnboardingEmployee.id == employee_id,
            OnboardingEmployee.company_id == company_id,
            OnboardingEmployee.is_deleted == False
        ).first()

    def list_onboarding_employees(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OnboardingStatus] = None,
        stage_id: Optional[int] = None
    ) -> Tuple[List[OnboardingEmployee], int]:
        """List onboarding employees with pagination."""
        query = self.db.query(OnboardingEmployee).filter(
            OnboardingEmployee.company_id == company_id,
            OnboardingEmployee.is_deleted == False
        )

        if status:
            query = query.filter(OnboardingEmployee.status == status)
        if stage_id:
            query = query.filter(OnboardingEmployee.current_stage_id == stage_id)

        total = query.count()
        employees = query.order_by(OnboardingEmployee.created_at.desc()).offset(skip).limit(limit).all()
        return employees, total

    def update_onboarding_employee(
        self,
        employee_id: int,
        data: OnboardingEmployeeUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[OnboardingEmployee]:
        """Update an onboarding employee."""
        employee = self.get_onboarding_employee(employee_id, company_id)
        if not employee:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(employee, field, value)

        employee.updated_by = user_id

        # Update progress
        self._update_progress(employee)

        self.db.commit()
        self.db.refresh(employee)
        return employee

    def move_to_stage(
        self,
        employee_id: int,
        stage_id: int,
        company_id: int,
        user_id: int
    ) -> Optional[OnboardingEmployee]:
        """Move an employee to a different stage."""
        employee = self.get_onboarding_employee(employee_id, company_id)
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

    def _update_progress(self, employee: OnboardingEmployee):
        """Update the progress percentage for an employee."""
        total_tasks = len(employee.tasks)
        if total_tasks == 0:
            employee.progress_percentage = 0
            return

        completed_tasks = sum(1 for t in employee.tasks if t.status == TaskStatus.COMPLETED)
        employee.progress_percentage = int((completed_tasks / total_tasks) * 100)

        # Update status based on progress
        if employee.progress_percentage == 100:
            employee.status = OnboardingStatus.COMPLETED
            employee.actual_completion_date = date.today()
        elif employee.progress_percentage > 0:
            employee.status = OnboardingStatus.IN_PROGRESS

    # ============== Task Operations ==============

    def create_task(
        self,
        data: OnboardingTaskCreate,
        company_id: int,
        user_id: int
    ) -> OnboardingTask:
        """Create a new task."""
        task = OnboardingTask(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_task(self, task_id: int, company_id: int) -> Optional[OnboardingTask]:
        """Get a task by ID."""
        return self.db.query(OnboardingTask).filter(
            OnboardingTask.id == task_id,
            OnboardingTask.company_id == company_id,
            OnboardingTask.is_deleted == False
        ).first()

    def list_tasks(
        self,
        company_id: int,
        onboarding_employee_id: Optional[int] = None,
        assigned_to_id: Optional[int] = None,
        status: Optional[TaskStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[OnboardingTask], int]:
        """List tasks with pagination."""
        query = self.db.query(OnboardingTask).filter(
            OnboardingTask.company_id == company_id,
            OnboardingTask.is_deleted == False
        )

        if onboarding_employee_id:
            query = query.filter(OnboardingTask.onboarding_employee_id == onboarding_employee_id)
        if assigned_to_id:
            query = query.filter(OnboardingTask.assigned_to_id == assigned_to_id)
        if status:
            query = query.filter(OnboardingTask.status == status)

        total = query.count()
        tasks = query.order_by(OnboardingTask.due_date).offset(skip).limit(limit).all()
        return tasks, total

    def update_task(
        self,
        task_id: int,
        data: OnboardingTaskUpdate,
        company_id: int,
        user_id: int
    ) -> Optional[OnboardingTask]:
        """Update a task."""
        task = self.get_task(task_id, company_id)
        if not task:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        task.updated_by = user_id

        # Handle completion
        if data.status == TaskStatus.COMPLETED:
            task.completed_date = datetime.utcnow()
            # Update parent employee progress
            employee = self.get_onboarding_employee(task.onboarding_employee_id, company_id)
            if employee:
                self._update_progress(employee)

        self.db.commit()
        self.db.refresh(task)
        return task

    def complete_task(
        self,
        task_id: int,
        company_id: int,
        user_id: int,
        completion_notes: Optional[str] = None
    ) -> Optional[OnboardingTask]:
        """Mark a task as completed."""
        task = self.get_task(task_id, company_id)
        if not task:
            return None

        task.status = TaskStatus.COMPLETED
        task.completed_date = datetime.utcnow()
        task.completion_notes = completion_notes
        task.updated_by = user_id

        # Update parent employee progress
        employee = self.get_onboarding_employee(task.onboarding_employee_id, company_id)
        if employee:
            self._update_progress(employee)

        self.db.commit()
        self.db.refresh(task)
        return task

    def approve_task(
        self,
        task_id: int,
        company_id: int,
        user_id: int
    ) -> Optional[OnboardingTask]:
        """Approve a completed task."""
        task = self.get_task(task_id, company_id)
        if not task or not task.requires_approval:
            return None

        task.approved_by_id = user_id
        task.approved_date = datetime.utcnow()
        self.db.commit()
        self.db.refresh(task)
        return task

    # ============== Document Operations ==============

    def create_document(
        self,
        data: OnboardingDocumentCreate,
        company_id: int,
        user_id: int
    ) -> OnboardingDocument:
        """Create a new document."""
        document = OnboardingDocument(
            **data.model_dump(),
            status=DocumentStatus.SUBMITTED,
            company_id=company_id,
            created_by=user_id
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def get_document(self, document_id: int, company_id: int) -> Optional[OnboardingDocument]:
        """Get a document by ID."""
        return self.db.query(OnboardingDocument).filter(
            OnboardingDocument.id == document_id,
            OnboardingDocument.company_id == company_id,
            OnboardingDocument.is_deleted == False
        ).first()

    def list_documents(
        self,
        company_id: int,
        onboarding_employee_id: Optional[int] = None,
        status: Optional[DocumentStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[OnboardingDocument], int]:
        """List documents with pagination."""
        query = self.db.query(OnboardingDocument).filter(
            OnboardingDocument.company_id == company_id,
            OnboardingDocument.is_deleted == False
        )

        if onboarding_employee_id:
            query = query.filter(OnboardingDocument.onboarding_employee_id == onboarding_employee_id)
        if status:
            query = query.filter(OnboardingDocument.status == status)

        total = query.count()
        documents = query.order_by(OnboardingDocument.created_at.desc()).offset(skip).limit(limit).all()
        return documents, total

    def review_document(
        self,
        document_id: int,
        status: DocumentStatus,
        company_id: int,
        user_id: int,
        rejection_reason: Optional[str] = None
    ) -> Optional[OnboardingDocument]:
        """Review a document."""
        document = self.get_document(document_id, company_id)
        if not document:
            return None

        document.status = status
        document.reviewed_by_id = user_id
        document.reviewed_date = datetime.utcnow()
        if status == DocumentStatus.REJECTED:
            document.rejection_reason = rejection_reason

        self.db.commit()
        self.db.refresh(document)
        return document

    # ============== Checklist Operations ==============

    def toggle_checklist_item(
        self,
        checklist_id: int,
        company_id: int,
        user_id: int
    ) -> Optional[OnboardingChecklist]:
        """Toggle a checklist item completion status."""
        checklist = self.db.query(OnboardingChecklist).filter(
            OnboardingChecklist.id == checklist_id,
            OnboardingChecklist.company_id == company_id
        ).first()

        if not checklist:
            return None

        checklist.is_completed = not checklist.is_completed
        if checklist.is_completed:
            checklist.completed_by_id = user_id
            checklist.completed_date = datetime.utcnow()
        else:
            checklist.completed_by_id = None
            checklist.completed_date = None

        self.db.commit()
        self.db.refresh(checklist)
        return checklist

    # ============== Dashboard Operations ==============

    def get_dashboard(self, company_id: int) -> OnboardingDashboard:
        """Get onboarding dashboard data."""
        today = date.today()
        month_start = today.replace(day=1)

        # Counts by status
        total_in_progress = self.db.query(OnboardingEmployee).filter(
            OnboardingEmployee.company_id == company_id,
            OnboardingEmployee.status == OnboardingStatus.IN_PROGRESS,
            OnboardingEmployee.is_deleted == False
        ).count()

        total_completed = self.db.query(OnboardingEmployee).filter(
            OnboardingEmployee.company_id == company_id,
            OnboardingEmployee.status == OnboardingStatus.COMPLETED,
            OnboardingEmployee.is_deleted == False
        ).count()

        total_on_hold = self.db.query(OnboardingEmployee).filter(
            OnboardingEmployee.company_id == company_id,
            OnboardingEmployee.status == OnboardingStatus.ON_HOLD,
            OnboardingEmployee.is_deleted == False
        ).count()

        # This month counts
        new_this_month = self.db.query(OnboardingEmployee).filter(
            OnboardingEmployee.company_id == company_id,
            OnboardingEmployee.created_at >= month_start,
            OnboardingEmployee.is_deleted == False
        ).count()

        completed_this_month = self.db.query(OnboardingEmployee).filter(
            OnboardingEmployee.company_id == company_id,
            OnboardingEmployee.actual_completion_date >= month_start,
            OnboardingEmployee.is_deleted == False
        ).count()

        # Overdue tasks
        overdue_tasks = self.db.query(OnboardingTask).filter(
            OnboardingTask.company_id == company_id,
            OnboardingTask.due_date < today,
            OnboardingTask.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
            OnboardingTask.is_deleted == False
        ).limit(10).all()

        # Recent employees
        recent = self.db.query(OnboardingEmployee).filter(
            OnboardingEmployee.company_id == company_id,
            OnboardingEmployee.status.in_([OnboardingStatus.IN_PROGRESS, OnboardingStatus.NOT_STARTED]),
            OnboardingEmployee.is_deleted == False
        ).order_by(OnboardingEmployee.created_at.desc()).limit(5).all()

        recent_employees = []
        for emp in recent:
            total_tasks = len(emp.tasks)
            completed_tasks = sum(1 for t in emp.tasks if t.status == TaskStatus.COMPLETED)
            pending_tasks = sum(1 for t in emp.tasks if t.status == TaskStatus.PENDING)
            overdue = sum(1 for t in emp.tasks if t.due_date and t.due_date < today and t.status != TaskStatus.COMPLETED)

            recent_employees.append(OnboardingProgress(
                employee_id=emp.id,
                employee_name=emp.name,
                status=emp.status,
                progress_percentage=emp.progress_percentage,
                current_stage=emp.current_stage.name if emp.current_stage else None,
                start_date=emp.start_date,
                target_completion_date=emp.target_completion_date,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                pending_tasks=pending_tasks,
                overdue_tasks=overdue
            ))

        return OnboardingDashboard(
            total_in_progress=total_in_progress,
            total_completed=total_completed,
            total_on_hold=total_on_hold,
            new_this_month=new_this_month,
            completed_this_month=completed_this_month,
            recent_employees=recent_employees,
            overdue_tasks=overdue_tasks
        )

    # ============== Process Operations ==============

    def create_process_from_template(
        self,
        candidate_id: int,
        template_id: int,
        company_id: int,
        user_id: int,
        start_date=None,
        expected_end_date=None,
        joining_date=None,
        mentor_id=None,
        hr_manager_id=None,
        hiring_manager_id=None,
        notes=None,
    ):
        """Create an onboarding process from a template."""
        template = self.get_template(template_id, company_id)
        if not template:
            return None

        from datetime import date as date_type
        if not start_date:
            start_date = date_type.today()
        if not expected_end_date and template.duration_days:
            expected_end_date = start_date + timedelta(days=template.duration_days)

        process = OnboardingProcess(
            candidate_id=candidate_id,
            template_id=template_id,
            status=OnboardingProcessStatus.NOT_STARTED,
            start_date=start_date,
            expected_end_date=expected_end_date,
            joining_date=joining_date,
            mentor_id=mentor_id,
            hr_manager_id=hr_manager_id,
            hiring_manager_id=hiring_manager_id,
            notes=notes,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(process)
        self.db.flush()

        # Create stages from template
        for stage_def in template.stages:
            process_stage = OnboardingProcessStage(
                process_id=process.id,
                template_stage_id=stage_def.id,
                stage_definition_id=stage_def.id,
                name=stage_def.name,
                description=stage_def.description,
                sequence=stage_def.sequence,
                status=OnboardingProcessStageStatus.PENDING,
                company_id=company_id,
                created_by=user_id,
            )
            if stage_def.duration_days and start_date:
                process_stage.due_date = start_date + timedelta(days=stage_def.duration_days)

            self.db.add(process_stage)
            self.db.flush()

            # Create tasks from stage's task templates
            if hasattr(stage_def, 'task_templates'):
                for task_tmpl in stage_def.task_templates:
                    process_task = OnboardingProcessTask(
                        stage_id=process_stage.id,
                        template_task_id=task_tmpl.id,
                        title=task_tmpl.name,
                        description=task_tmpl.description,
                        task_type=getattr(task_tmpl, 'task_type', None) if hasattr(task_tmpl, 'task_type') else None,
                        priority=task_tmpl.priority.value if hasattr(task_tmpl.priority, 'value') else str(task_tmpl.priority),
                        sequence=getattr(task_tmpl, 'sequence', 0),
                        status=OnboardingProcessTaskStatus.PENDING,
                        is_mandatory=task_tmpl.is_mandatory,
                        assigned_to_candidate=task_tmpl.assign_to_employee,
                        company_id=company_id,
                        created_by=user_id,
                    )
                    if task_tmpl.duration_days and start_date:
                        process_task.due_date = start_date + timedelta(days=task_tmpl.duration_days)
                    if task_tmpl.assigned_user_id:
                        process_task.assigned_to_id = task_tmpl.assigned_user_id

                    self.db.add(process_task)

        # Set current stage to first stage
        first_stage = self.db.query(OnboardingProcessStage).filter(
            OnboardingProcessStage.process_id == process.id
        ).order_by(OnboardingProcessStage.sequence).first()
        if first_stage:
            process.current_stage_id = first_stage.id
            first_stage.status = OnboardingProcessStageStatus.IN_PROGRESS
            first_stage.start_date = start_date

        self.db.commit()
        self.db.refresh(process)
        return process

    def get_process(self, process_id: int, company_id: int):
        """Get an onboarding process by ID with stages."""
        return self.db.query(OnboardingProcess).options(
            joinedload(OnboardingProcess.stages)
        ).filter(
            OnboardingProcess.id == process_id,
            OnboardingProcess.company_id == company_id,
            OnboardingProcess.is_deleted == False,
        ).first()

    def get_process_detail(self, process_id: int, company_id: int):
        """Get process with stages and their tasks."""
        process = self.db.query(OnboardingProcess).filter(
            OnboardingProcess.id == process_id,
            OnboardingProcess.company_id == company_id,
            OnboardingProcess.is_deleted == False,
        ).first()
        if not process:
            return None

        # Load stages with tasks
        stages = self.db.query(OnboardingProcessStage).filter(
            OnboardingProcessStage.process_id == process.id,
            OnboardingProcessStage.is_deleted == False,
        ).order_by(OnboardingProcessStage.sequence).all()

        for stage in stages:
            stage.tasks = self.db.query(OnboardingProcessTask).filter(
                OnboardingProcessTask.stage_id == stage.id,
                OnboardingProcessTask.is_deleted == False,
            ).order_by(OnboardingProcessTask.sequence).all()

        process.stages = stages
        return process

    def list_processes(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100,
        status=None,
        candidate_id=None,
    ):
        """List onboarding processes with pagination."""
        query = self.db.query(OnboardingProcess).filter(
            OnboardingProcess.company_id == company_id,
            OnboardingProcess.is_deleted == False,
        )
        if status:
            query = query.filter(OnboardingProcess.status == status)
        if candidate_id:
            query = query.filter(OnboardingProcess.candidate_id == candidate_id)

        total = query.count()
        processes = query.order_by(OnboardingProcess.created_at.desc()).offset(skip).limit(limit).all()
        return processes, total

    def update_process(self, process_id: int, data: dict, company_id: int, user_id: int):
        """Update an onboarding process."""
        process = self.get_process(process_id, company_id)
        if not process:
            return None
        for field, value in data.items():
            if value is not None and hasattr(process, field):
                setattr(process, field, value)
        process.updated_by = user_id
        self.db.commit()
        self.db.refresh(process)
        return process

    def move_process_to_stage(self, process_id: int, stage_id: int, company_id: int, user_id: int):
        """Move a process to a specific stage."""
        process = self.get_process(process_id, company_id)
        if not process:
            return None

        target_stage = self.db.query(OnboardingProcessStage).filter(
            OnboardingProcessStage.id == stage_id,
            OnboardingProcessStage.process_id == process_id,
        ).first()
        if not target_stage:
            return None

        # Complete current stage
        if process.current_stage_id:
            current = self.db.query(OnboardingProcessStage).get(process.current_stage_id)
            if current and current.status != OnboardingProcessStageStatus.COMPLETED:
                current.status = OnboardingProcessStageStatus.COMPLETED
                current.completed_date = date.today()

        # Activate target stage
        target_stage.status = OnboardingProcessStageStatus.IN_PROGRESS
        if not target_stage.start_date:
            target_stage.start_date = date.today()
        process.current_stage_id = stage_id
        process.status = OnboardingProcessStatus.IN_PROGRESS
        process.updated_by = user_id

        self.calculate_process_progress(process)
        self.db.commit()
        self.db.refresh(process)
        return process

    def calculate_process_progress(self, process):
        """Calculate progress: 40% stages + 40% tasks + 20% documents."""
        stages = self.db.query(OnboardingProcessStage).filter(
            OnboardingProcessStage.process_id == process.id,
            OnboardingProcessStage.is_deleted == False,
        ).all()

        total_stages = len(stages)
        completed_stages = sum(1 for s in stages if s.status == OnboardingProcessStageStatus.COMPLETED)
        stage_pct = (completed_stages / total_stages * 40) if total_stages > 0 else 0

        # Task progress (40%)
        tasks = self.db.query(OnboardingProcessTask).filter(
            OnboardingProcessTask.stage_id.in_([s.id for s in stages]),
            OnboardingProcessTask.is_deleted == False,
        ).all()
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status == OnboardingProcessTaskStatus.COMPLETED)
        task_pct = (completed_tasks / total_tasks * 40) if total_tasks > 0 else 0

        # Document progress (20%)
        total_docs = self.db.query(OnboardingDocument).filter(
            OnboardingDocument.onboarding_employee_id == process.candidate_id,
            OnboardingDocument.is_deleted == False,
        ).count()
        verified_docs = self.db.query(OnboardingDocument).filter(
            OnboardingDocument.onboarding_employee_id == process.candidate_id,
            OnboardingDocument.status == DocumentStatus.APPROVED,
            OnboardingDocument.is_deleted == False,
        ).count()
        doc_pct = (verified_docs / total_docs * 20) if total_docs > 0 else 0

        process.overall_progress = int(stage_pct + task_pct + doc_pct)
        process.tasks_progress = int((completed_tasks / total_tasks * 100) if total_tasks else 0)
        process.documents_progress = int((verified_docs / total_docs * 100) if total_docs else 0)

        # Update stage progress
        for stage in stages:
            stage_tasks = [t for t in tasks if t.stage_id == stage.id]
            stage_total = len(stage_tasks)
            stage_completed = sum(1 for t in stage_tasks if t.status == OnboardingProcessTaskStatus.COMPLETED)
            stage.progress = int((stage_completed / stage_total * 100) if stage_total else 0)

        # Auto-complete process if 100%
        if process.overall_progress >= 100:
            process.status = OnboardingProcessStatus.COMPLETED
            process.actual_end_date = date.today()

        return process

    def update_process_stage(self, stage_id: int, data: dict, company_id: int, user_id: int):
        """Update a process stage."""
        stage = self.db.query(OnboardingProcessStage).filter(
            OnboardingProcessStage.id == stage_id,
        ).first()
        if not stage:
            return None
        # Verify company access
        process = self.get_process(stage.process_id, company_id)
        if not process:
            return None

        for field, value in data.items():
            if value is not None and hasattr(stage, field):
                setattr(stage, field, value)

        if data.get('status') == 'completed':
            stage.completed_date = date.today()
            stage.approved_by_id = user_id
            stage.approved_at = datetime.utcnow()

        self.calculate_process_progress(process)
        self.db.commit()
        self.db.refresh(stage)
        return stage

    def update_process_task(self, task_id: int, data: dict, company_id: int, user_id: int):
        """Update a process task."""
        task = self.db.query(OnboardingProcessTask).filter(
            OnboardingProcessTask.id == task_id,
        ).first()
        if not task:
            return None

        stage = self.db.query(OnboardingProcessStage).filter(
            OnboardingProcessStage.id == task.stage_id,
        ).first()
        if not stage:
            return None

        process = self.get_process(stage.process_id, company_id)
        if not process:
            return None

        for field, value in data.items():
            if value is not None and hasattr(task, field):
                setattr(task, field, value)

        if data.get('status') == 'completed':
            task.completed_at = datetime.utcnow()
            task.completed_by_id = user_id

        self.calculate_process_progress(process)
        self.db.commit()
        self.db.refresh(task)
        return task

    # ============== Verification Operations ==============

    def list_verification_requirements(self, company_id: int, skip: int = 0, limit: int = 100):
        """List verification requirements."""
        query = self.db.query(OnboardingVerificationRequirement).filter(
            OnboardingVerificationRequirement.company_id == company_id,
            OnboardingVerificationRequirement.is_deleted == False,
        )
        total = query.count()
        items = query.order_by(OnboardingVerificationRequirement.sequence).offset(skip).limit(limit).all()
        return items, total

    def create_verification_requirement(self, data: dict, company_id: int, user_id: int):
        """Create a verification requirement."""
        req = OnboardingVerificationRequirement(
            company_id=company_id,
            created_by=user_id,
            **{k: v for k, v in data.items() if k != 'document_type_ids'},
        )
        self.db.add(req)
        self.db.commit()
        self.db.refresh(req)
        return req

    def update_verification_requirement(self, req_id: int, data: dict, company_id: int, user_id: int):
        """Update a verification requirement."""
        req = self.db.query(OnboardingVerificationRequirement).filter(
            OnboardingVerificationRequirement.id == req_id,
            OnboardingVerificationRequirement.company_id == company_id,
            OnboardingVerificationRequirement.is_deleted == False,
        ).first()
        if not req:
            return None
        for field, value in data.items():
            if value is not None and hasattr(req, field) and field != 'document_type_ids':
                setattr(req, field, value)
        req.updated_by = user_id
        self.db.commit()
        self.db.refresh(req)
        return req

    def list_candidate_verifications(
        self, company_id: int, candidate_id: int = None, status: str = None,
        skip: int = 0, limit: int = 100,
    ):
        """List candidate verifications."""
        query = self.db.query(CandidateVerification).filter(
            CandidateVerification.company_id == company_id,
            CandidateVerification.is_deleted == False,
        )
        if candidate_id:
            query = query.filter(CandidateVerification.candidate_id == candidate_id)
        if status:
            query = query.filter(CandidateVerification.status == status)

        total = query.count()
        items = query.order_by(CandidateVerification.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def pass_verification(self, verification_id: int, company_id: int, user_id: int, notes: str = None, external_reference: str = None, external_report_url: str = None):
        """Mark a verification as passed."""
        verification = self.db.query(CandidateVerification).filter(
            CandidateVerification.id == verification_id,
            CandidateVerification.company_id == company_id,
        ).first()
        if not verification:
            return None

        verification.status = 'passed'
        verification.verified_by_id = user_id
        verification.verified_at = datetime.utcnow()
        if notes:
            verification.notes = notes
        if external_reference:
            verification.external_reference = external_reference
        if external_report_url:
            verification.external_report_url = external_report_url

        self.db.commit()
        self.db.refresh(verification)
        return verification

    def fail_verification(self, verification_id: int, company_id: int, user_id: int, notes: str = None):
        """Mark a verification as failed."""
        verification = self.db.query(CandidateVerification).filter(
            CandidateVerification.id == verification_id,
            CandidateVerification.company_id == company_id,
        ).first()
        if not verification:
            return None

        verification.status = 'failed'
        verification.verified_by_id = user_id
        verification.verified_at = datetime.utcnow()
        if notes:
            verification.notes = notes

        self.db.commit()
        self.db.refresh(verification)
        return verification

    # ============== Conversion Operations ==============

    def list_conversions(self, company_id: int, status: str = None, skip: int = 0, limit: int = 100):
        """List candidate-to-employee conversions."""
        query = self.db.query(CandidateToEmployeeConversion).filter(
            CandidateToEmployeeConversion.company_id == company_id,
            CandidateToEmployeeConversion.is_deleted == False,
        )
        if status:
            query = query.filter(CandidateToEmployeeConversion.status == status)

        total = query.count()
        items = query.order_by(CandidateToEmployeeConversion.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_conversion(self, conversion_id: int, company_id: int):
        """Get a conversion by ID."""
        return self.db.query(CandidateToEmployeeConversion).filter(
            CandidateToEmployeeConversion.id == conversion_id,
            CandidateToEmployeeConversion.company_id == company_id,
            CandidateToEmployeeConversion.is_deleted == False,
        ).first()

    def check_conversion_readiness(self, conversion_id: int, company_id: int):
        """Check if candidate is ready for conversion."""
        conversion = self.get_conversion(conversion_id, company_id)
        if not conversion:
            return None

        # Check all mandatory documents verified
        unverified_docs = self.db.query(OnboardingDocument).filter(
            OnboardingDocument.onboarding_employee_id == conversion.candidate_id,
            OnboardingDocument.is_deleted == False,
            OnboardingDocument.status != DocumentStatus.APPROVED,
        ).first()
        conversion.all_documents_verified = unverified_docs is None

        # Check all mandatory verifications passed
        failed_verifications = self.db.query(CandidateVerification).filter(
            CandidateVerification.candidate_id == conversion.candidate_id,
            CandidateVerification.is_deleted == False,
            CandidateVerification.status != 'passed',
        ).first()
        conversion.all_verifications_passed = failed_verifications is None

        # Check all tasks completed
        processes = self.db.query(OnboardingProcess).filter(
            OnboardingProcess.candidate_id == conversion.candidate_id,
            OnboardingProcess.company_id == company_id,
            OnboardingProcess.is_deleted == False,
        ).all()

        has_incomplete_tasks = False
        for process in processes:
            stages = self.db.query(OnboardingProcessStage).filter(
                OnboardingProcessStage.process_id == process.id,
            ).all()
            for stage in stages:
                incomplete = self.db.query(OnboardingProcessTask).filter(
                    OnboardingProcessTask.stage_id == stage.id,
                    OnboardingProcessTask.is_mandatory == True,
                    OnboardingProcessTask.status != OnboardingProcessTaskStatus.COMPLETED,
                ).first()
                if incomplete:
                    has_incomplete_tasks = True
                    break
            if has_incomplete_tasks:
                break
        conversion.all_tasks_completed = not has_incomplete_tasks

        # Update status if all ready
        if all([
            conversion.all_documents_verified,
            conversion.all_verifications_passed,
            conversion.all_tasks_completed,
            conversion.offer_accepted,
        ]):
            conversion.status = 'ready'

        self.db.commit()
        self.db.refresh(conversion)
        return conversion

    def initiate_conversion(self, data: dict, company_id: int, user_id: int):
        """Initiate a candidate-to-employee conversion."""
        conversion = CandidateToEmployeeConversion(
            candidate_id=data['candidate_id'],
            status='pending',
            department_id=data.get('department_id'),
            job_position_id=data.get('job_position_id'),
            reporting_manager_id=data.get('reporting_manager_id'),
            joining_date=data.get('joining_date'),
            employee_id_number=data.get('employee_id_number'),
            salary=data.get('salary'),
            notes=data.get('notes'),
            initiated_by_id=user_id,
            initiated_at=datetime.utcnow(),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(conversion)
        self.db.flush()

        # Create log
        log = ConversionLog(
            conversion_id=conversion.id,
            action='initiated',
            performed_by_id=user_id,
            notes=data.get('notes'),
            company_id=company_id,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(conversion)
        return conversion

    def complete_conversion(self, conversion_id: int, company_id: int, user_id: int, notes: str = None):
        """Complete a conversion - mark as completed."""
        conversion = self.get_conversion(conversion_id, company_id)
        if not conversion:
            return None

        conversion.status = 'completed'
        conversion.completed_by_id = user_id
        conversion.completed_at = datetime.utcnow()
        if notes:
            conversion.notes = notes

        # Create log
        log = ConversionLog(
            conversion_id=conversion.id,
            action='completed',
            performed_by_id=user_id,
            notes=notes,
            company_id=company_id,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(conversion)
        return conversion

    def get_conversion_logs(self, conversion_id: int, company_id: int):
        """Get logs for a conversion."""
        conversion = self.get_conversion(conversion_id, company_id)
        if not conversion:
            return []
        return self.db.query(ConversionLog).filter(
            ConversionLog.conversion_id == conversion_id,
        ).order_by(ConversionLog.created_at.desc()).all()

    # ============== Portal Operations ==============

    def generate_portal_token(self, candidate_id: int, company_id: int, user_id: int):
        """Generate a portal access token for a candidate."""
        portal = OnboardingPortal(
            candidate_id=candidate_id,
            token=secrets.token_hex(15),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(portal)
        self.db.commit()
        self.db.refresh(portal)
        return portal

    def get_portal_by_token(self, token: str):
        """Get portal by token."""
        return self.db.query(OnboardingPortal).filter(
            OnboardingPortal.token == token,
            OnboardingPortal.is_deleted == False,
        ).first()

    # ============== Template Clone ==============

    def clone_template(self, template_id: int, company_id: int, user_id: int):
        """Clone an onboarding template."""
        original = self.get_template(template_id, company_id)
        if not original:
            return None

        clone = OnboardingTemplate(
            name=f"{original.name} (Copy)",
            description=original.description,
            department_id=original.department_id,
            job_position_id=original.job_position_id,
            employment_type=original.employment_type,
            duration_days=original.duration_days,
            is_default=False,
            send_welcome_email=original.send_welcome_email,
            create_portal_account=original.create_portal_account,
            auto_create_employee=original.auto_create_employee,
            welcome_message=original.welcome_message,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(clone)
        self.db.flush()

        # Copy stage associations
        clone.stages = list(original.stages)
        # Copy document type associations
        clone.document_types = list(original.document_types)

        self.db.commit()
        self.db.refresh(clone)
        return clone

    # ============== Enhanced Dashboard Stats ==============

    def get_dashboard_stats(self, company_id: int):
        """Get enhanced dashboard statistics using OnboardingProcess model."""
        today = date.today()

        processes_query = self.db.query(OnboardingProcess).filter(
            OnboardingProcess.company_id == company_id,
            OnboardingProcess.is_deleted == False,
        )

        total_processes = processes_query.count()
        active_processes = processes_query.filter(
            OnboardingProcess.status == OnboardingProcessStatus.IN_PROGRESS
        ).count()

        month_start = today.replace(day=1)
        completed_this_month = processes_query.filter(
            OnboardingProcess.status == OnboardingProcessStatus.COMPLETED,
            OnboardingProcess.actual_end_date >= month_start,
        ).count()

        ending_soon = processes_query.filter(
            OnboardingProcess.status == OnboardingProcessStatus.IN_PROGRESS,
            OnboardingProcess.expected_end_date <= today + timedelta(days=7),
            OnboardingProcess.expected_end_date >= today,
        ).count()

        overdue = processes_query.filter(
            OnboardingProcess.status == OnboardingProcessStatus.IN_PROGRESS,
            OnboardingProcess.expected_end_date < today,
        ).count()

        # Conversion stats
        conversions_ready = self.db.query(CandidateToEmployeeConversion).filter(
            CandidateToEmployeeConversion.company_id == company_id,
            CandidateToEmployeeConversion.status == 'ready',
            CandidateToEmployeeConversion.is_deleted == False,
        ).count()

        conversions_pending = self.db.query(CandidateToEmployeeConversion).filter(
            CandidateToEmployeeConversion.company_id == company_id,
            CandidateToEmployeeConversion.status == 'pending',
            CandidateToEmployeeConversion.is_deleted == False,
        ).count()

        # Pending items
        pending_docs = self.db.query(OnboardingDocument).filter(
            OnboardingDocument.company_id == company_id,
            OnboardingDocument.status == DocumentStatus.SUBMITTED,
            OnboardingDocument.is_deleted == False,
        ).count()

        pending_verifications = self.db.query(CandidateVerification).filter(
            CandidateVerification.company_id == company_id,
            CandidateVerification.status == 'pending',
            CandidateVerification.is_deleted == False,
        ).count()

        # Recent processes
        recent = processes_query.filter(
            OnboardingProcess.status.in_([
                OnboardingProcessStatus.IN_PROGRESS,
                OnboardingProcessStatus.NOT_STARTED,
            ])
        ).order_by(OnboardingProcess.created_at.desc()).limit(10).all()

        return {
            'processes': {
                'total': total_processes,
                'active': active_processes,
                'completed_this_month': completed_this_month,
                'ending_soon': ending_soon,
                'overdue': overdue,
            },
            'conversions': {
                'ready': conversions_ready,
                'pending': conversions_pending,
            },
            'pending_items': {
                'documents': pending_docs,
                'verifications': pending_verifications,
            },
            'recent_processes': recent,
        }
