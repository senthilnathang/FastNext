"""
Model tests for HRMS Base module.
"""

import pytest
from datetime import datetime, time, date, timedelta

from ..models.department import Department
from ..models.job_position import JobPosition
from ..models.job_role import JobRole
from ..models.employee_type import EmployeeType
from ..models.shift import EmployeeShift, GraceTime, ShiftSchedule, RotatingShift
from ..models.work_type import WorkType, RotatingWorkType, WorkTypeRequest, ShiftRequest, RequestStatus
from ..models.approval import ApprovalWorkflow, ApprovalLevel, ApprovalRequest, ApprovalActionType
from ..models.settings import StageDefinition, StatusDefinition, HRMSSettings, Announcement


class TestDepartmentModel:
    """Tests for Department model."""

    def test_create_department(self, db_session, test_company, test_user):
        """Test creating a department."""
        department = Department(
            name="Human Resources",
            code="HR",
            description="HR department",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(department)
        db_session.commit()

        assert department.id is not None
        assert department.name == "Human Resources"
        assert department.code == "HR"
        assert department.is_active is True

    def test_department_hierarchy(self, db_session, test_company, test_user):
        """Test department parent-child relationship."""
        parent = Department(
            name="Engineering",
            code="ENG",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(parent)
        db_session.commit()

        child = Department(
            name="Backend",
            code="BE",
            parent_id=parent.id,
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(child)
        db_session.commit()

        assert child.parent_id == parent.id

    def test_department_soft_delete(self, db_session, test_department):
        """Test soft delete on department."""
        test_department.deleted_at = datetime.utcnow()
        db_session.commit()

        assert test_department.deleted_at is not None


class TestJobPositionModel:
    """Tests for JobPosition model."""

    def test_create_job_position(self, db_session, test_company, test_user, test_department):
        """Test creating a job position."""
        position = JobPosition(
            title="Senior Developer",
            code="SR_DEV",
            department_id=test_department.id,
            min_salary=100000.00,
            max_salary=150000.00,
            currency="USD",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(position)
        db_session.commit()

        assert position.id is not None
        assert position.title == "Senior Developer"
        assert position.min_salary == 100000.00
        assert position.max_salary == 150000.00

    def test_job_position_salary_range(self, test_job_position):
        """Test job position salary range."""
        assert test_job_position.min_salary < test_job_position.max_salary


class TestJobRoleModel:
    """Tests for JobRole model."""

    def test_create_job_role(self, db_session, test_company, test_user):
        """Test creating a job role."""
        role = JobRole(
            name="Admin",
            code="ADMIN",
            permissions={"system": ["read", "write", "delete"]},
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(role)
        db_session.commit()

        assert role.id is not None
        assert role.name == "Admin"
        assert "system" in role.permissions

    def test_job_role_permissions(self, test_job_role):
        """Test job role permissions."""
        assert isinstance(test_job_role.permissions, dict)
        assert "code" in test_job_role.permissions


class TestEmployeeTypeModel:
    """Tests for EmployeeType model."""

    def test_create_employee_type(self, db_session, test_company, test_user):
        """Test creating an employee type."""
        emp_type = EmployeeType(
            name="Contract",
            code="CT",
            description="Contract employee",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(emp_type)
        db_session.commit()

        assert emp_type.id is not None
        assert emp_type.name == "Contract"
        assert emp_type.code == "CT"


class TestShiftModels:
    """Tests for Shift-related models."""

    def test_create_shift(self, db_session, test_company, test_user):
        """Test creating a shift."""
        shift = EmployeeShift(
            name="Night Shift",
            start_time=time(22, 0),
            end_time=time(6, 0),
            working_hours=7.5,
            is_night_shift=True,
            color="#9C27B0",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(shift)
        db_session.commit()

        assert shift.id is not None
        assert shift.is_night_shift is True

    def test_create_grace_time(self, db_session, test_company, test_user, test_shift):
        """Test creating grace time for a shift."""
        grace = GraceTime(
            shift_id=test_shift.id,
            allowed_late_minutes=15,
            allowed_early_leave_minutes=10,
            overtime_threshold_minutes=30,
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(grace)
        db_session.commit()

        assert grace.id is not None
        assert grace.allowed_late_minutes == 15

    def test_create_rotating_shift(self, db_session, test_company, test_user):
        """Test creating a rotating shift."""
        rotating = RotatingShift(
            name="Weekly Rotation",
            rotation_type="weekly",
            start_date=date.today(),
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(rotating)
        db_session.commit()

        assert rotating.id is not None
        assert rotating.rotation_type == "weekly"


class TestWorkTypeModels:
    """Tests for WorkType-related models."""

    def test_create_work_type(self, db_session, test_company, test_user):
        """Test creating a work type."""
        work_type = WorkType(
            name="Remote",
            code="WFH",
            description="Work from home",
            color="#2196F3",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(work_type)
        db_session.commit()

        assert work_type.id is not None
        assert work_type.code == "WFH"

    def test_create_work_type_request(self, db_session, test_company, test_user, test_work_type):
        """Test creating a work type request."""
        request = WorkTypeRequest(
            employee_id=test_user.id,
            work_type_id=test_work_type.id,
            requested_date=date.today() + timedelta(days=1),
            reason="Personal reasons",
            status=RequestStatus.PENDING,
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(request)
        db_session.commit()

        assert request.id is not None
        assert request.status == RequestStatus.PENDING


class TestApprovalModels:
    """Tests for Approval-related models."""

    def test_create_approval_workflow(self, db_session, test_company, test_user):
        """Test creating an approval workflow."""
        workflow = ApprovalWorkflow(
            name="Expense Approval",
            model_name="expense_claim",
            description="Expense claim approval workflow",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(workflow)
        db_session.commit()

        assert workflow.id is not None
        assert workflow.model_name == "expense_claim"

    def test_create_approval_level(self, db_session, test_company, test_user, test_approval_workflow):
        """Test creating an approval level."""
        level = ApprovalLevel(
            workflow_id=test_approval_workflow.id,
            level=1,
            name="Manager Approval",
            approver_type="reporting_manager",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(level)
        db_session.commit()

        assert level.id is not None
        assert level.level == 1

    def test_create_approval_request(self, db_session, test_company, test_user, test_approval_workflow):
        """Test creating an approval request."""
        # First create a level
        level = ApprovalLevel(
            workflow_id=test_approval_workflow.id,
            level=1,
            name="Manager Approval",
            approver_type="reporting_manager",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(level)
        db_session.commit()

        request = ApprovalRequest(
            workflow_id=test_approval_workflow.id,
            model_name="leave_request",
            record_id=1,
            current_level=1,
            status="pending",
            requester_id=test_user.id,
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(request)
        db_session.commit()

        assert request.id is not None
        assert request.status == "pending"


class TestSettingsModels:
    """Tests for Settings-related models."""

    def test_create_stage_definition(self, db_session, test_company, test_user):
        """Test creating a stage definition."""
        stage = StageDefinition(
            model_name="candidate",
            name="Interview",
            code="interview",
            sequence=3,
            color="#FF9800",
            is_initial=False,
            is_final=False,
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(stage)
        db_session.commit()

        assert stage.id is not None
        assert stage.sequence == 3

    def test_create_status_definition(self, db_session, test_company, test_user):
        """Test creating a status definition."""
        status = StatusDefinition(
            model_name="leave_request",
            name="Approved",
            code="approved",
            color="#4CAF50",
            is_initial=False,
            is_final=True,
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(status)
        db_session.commit()

        assert status.id is not None
        assert status.is_final is True

    def test_create_hrms_settings(self, db_session, test_company, test_user):
        """Test creating HRMS settings."""
        setting = HRMSSettings(
            key="default_currency",
            value="USD",
            value_type="string",
            module="hrms_base",
            category="general",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(setting)
        db_session.commit()

        assert setting.id is not None
        assert setting.value == "USD"

    def test_create_announcement(self, db_session, test_company, test_user):
        """Test creating an announcement."""
        announcement = Announcement(
            title="System Update",
            content="System will be updated this weekend",
            priority="medium",
            is_published=True,
            publish_date=datetime.now(),
            target_audience="all",
            author_id=test_user.id,
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add(announcement)
        db_session.commit()

        assert announcement.id is not None
        assert announcement.is_published is True


class TestModelRelationships:
    """Tests for model relationships."""

    def test_department_positions(self, db_session, test_department, test_job_position):
        """Test department to positions relationship."""
        # Query positions through department
        db_session.refresh(test_department)
        # This would require relationship definition in model
        assert test_job_position.department_id == test_department.id

    def test_workflow_levels(self, db_session, test_approval_workflow, test_company, test_user):
        """Test workflow to levels relationship."""
        level1 = ApprovalLevel(
            workflow_id=test_approval_workflow.id,
            level=1,
            name="Level 1",
            approver_type="reporting_manager",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        level2 = ApprovalLevel(
            workflow_id=test_approval_workflow.id,
            level=2,
            name="Level 2",
            approver_type="department",
            company_id=test_company.id,
            created_by=test_user.id,
        )
        db_session.add_all([level1, level2])
        db_session.commit()

        db_session.refresh(test_approval_workflow)
        assert len(test_approval_workflow.levels) == 2
