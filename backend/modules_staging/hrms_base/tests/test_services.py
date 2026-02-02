"""
Service tests for HRMS Base module.
"""

import pytest
from datetime import datetime, time, date, timedelta

from ..services.department_service import DepartmentService
from ..services.job_position_service import JobPositionService
from ..services.job_role_service import JobRoleService
from ..services.employee_type_service import EmployeeTypeService
from ..services.shift_service import ShiftService
from ..services.work_type_service import WorkTypeService
from ..services.approval_service import ApprovalService
from ..services.settings_service import SettingsService
from ..services.announcement_service import AnnouncementService

from ..schemas.department import DepartmentCreate, DepartmentUpdate
from ..schemas.job_position import JobPositionCreate, JobPositionUpdate
from ..schemas.job_role import JobRoleCreate
from ..schemas.employee_type import EmployeeTypeCreate
from ..schemas.shift import EmployeeShiftCreate, RotatingShiftCreate
from ..schemas.work_type import WorkTypeCreate, WorkTypeRequestCreate
from ..schemas.approval import ApprovalWorkflowCreate, ApprovalLevelCreate
from ..schemas.settings import (
    StageDefinitionCreate, StatusDefinitionCreate,
    HRMSSettingsCreate, AnnouncementCreate
)


class TestDepartmentService:
    """Tests for DepartmentService."""

    def test_create_department(self, db_session, test_company, test_user):
        """Test creating a department via service."""
        service = DepartmentService(db_session)
        data = DepartmentCreate(
            name="Finance",
            code="FIN",
            description="Finance department",
        )
        department = service.create(data, test_company.id, test_user.id)

        assert department.id is not None
        assert department.name == "Finance"
        assert department.code == "FIN"

    def test_get_department(self, db_session, test_department):
        """Test getting a department by ID."""
        service = DepartmentService(db_session)
        department = service.get(test_department.id, test_department.company_id)

        assert department is not None
        assert department.id == test_department.id

    def test_list_departments(self, db_session, test_company, test_user):
        """Test listing departments."""
        service = DepartmentService(db_session)

        # Create multiple departments
        for i in range(3):
            data = DepartmentCreate(name=f"Dept {i}", code=f"D{i}")
            service.create(data, test_company.id, test_user.id)

        departments, total = service.list(test_company.id)

        assert total >= 3
        assert len(departments) >= 3

    def test_update_department(self, db_session, test_department, test_user):
        """Test updating a department."""
        service = DepartmentService(db_session)
        data = DepartmentUpdate(name="Updated Engineering", description="Updated description")

        updated = service.update(
            test_department.id, data,
            test_department.company_id, test_user.id
        )

        assert updated.name == "Updated Engineering"
        assert updated.description == "Updated description"

    def test_delete_department(self, db_session, test_department, test_user):
        """Test soft deleting a department."""
        service = DepartmentService(db_session)

        result = service.delete(
            test_department.id,
            test_department.company_id,
            test_user.id
        )

        assert result is True

        # Verify soft delete
        deleted = service.get(test_department.id, test_department.company_id)
        assert deleted is None  # Should not return deleted items

    def test_get_tree(self, db_session, test_company, test_user):
        """Test getting department tree."""
        service = DepartmentService(db_session)

        # Create parent
        parent_data = DepartmentCreate(name="Parent", code="PAR")
        parent = service.create(parent_data, test_company.id, test_user.id)

        # Create children
        child1_data = DepartmentCreate(name="Child 1", code="CH1", parent_id=parent.id)
        child2_data = DepartmentCreate(name="Child 2", code="CH2", parent_id=parent.id)
        service.create(child1_data, test_company.id, test_user.id)
        service.create(child2_data, test_company.id, test_user.id)

        tree = service.get_tree(test_company.id)

        assert len(tree) > 0


class TestJobPositionService:
    """Tests for JobPositionService."""

    def test_create_job_position(self, db_session, test_company, test_user, test_department):
        """Test creating a job position via service."""
        service = JobPositionService(db_session)
        data = JobPositionCreate(
            title="Product Manager",
            code="PM",
            department_id=test_department.id,
            min_salary=90000.00,
            max_salary=140000.00,
            currency="USD",
        )
        position = service.create(data, test_company.id, test_user.id)

        assert position.id is not None
        assert position.title == "Product Manager"

    def test_list_by_department(self, db_session, test_company, test_user, test_department):
        """Test listing positions by department."""
        service = JobPositionService(db_session)

        # Create positions
        for i in range(2):
            data = JobPositionCreate(
                title=f"Position {i}",
                code=f"POS{i}",
                department_id=test_department.id,
            )
            service.create(data, test_company.id, test_user.id)

        positions, total = service.list(
            test_company.id,
            department_id=test_department.id
        )

        assert total >= 2


class TestJobRoleService:
    """Tests for JobRoleService."""

    def test_create_job_role(self, db_session, test_company, test_user):
        """Test creating a job role via service."""
        service = JobRoleService(db_session)
        data = JobRoleCreate(
            name="Manager",
            code="MGR",
            permissions={"team": ["read", "write"]},
        )
        role = service.create(data, test_company.id, test_user.id)

        assert role.id is not None
        assert role.name == "Manager"
        assert "team" in role.permissions


class TestEmployeeTypeService:
    """Tests for EmployeeTypeService."""

    def test_create_employee_type(self, db_session, test_company, test_user):
        """Test creating an employee type via service."""
        service = EmployeeTypeService(db_session)
        data = EmployeeTypeCreate(
            name="Intern",
            code="INT",
            description="Internship position",
        )
        emp_type = service.create(data, test_company.id, test_user.id)

        assert emp_type.id is not None
        assert emp_type.name == "Intern"


class TestShiftService:
    """Tests for ShiftService."""

    def test_create_shift(self, db_session, test_company, test_user):
        """Test creating a shift via service."""
        service = ShiftService(db_session)
        data = EmployeeShiftCreate(
            name="Evening Shift",
            start_time=time(14, 0),
            end_time=time(22, 0),
            working_hours=7.5,
            is_night_shift=False,
            color="#FF9800",
        )
        shift = service.create_shift(data, test_company.id, test_user.id)

        assert shift.id is not None
        assert shift.name == "Evening Shift"

    def test_list_shifts(self, db_session, test_company, test_user):
        """Test listing shifts."""
        service = ShiftService(db_session)

        # Create shifts
        for i in range(2):
            data = EmployeeShiftCreate(
                name=f"Shift {i}",
                start_time=time(9, 0),
                end_time=time(17, 0),
                working_hours=8.0,
            )
            service.create_shift(data, test_company.id, test_user.id)

        shifts, total = service.list_shifts(test_company.id)

        assert total >= 2

    def test_create_rotating_shift(self, db_session, test_company, test_user, test_shift):
        """Test creating a rotating shift."""
        service = ShiftService(db_session)
        data = RotatingShiftCreate(
            name="Weekly Rotation",
            rotation_type="weekly",
            start_date=date.today(),
        )
        rotating = service.create_rotating_shift(data, test_company.id, test_user.id)

        assert rotating.id is not None
        assert rotating.rotation_type == "weekly"


class TestWorkTypeService:
    """Tests for WorkTypeService."""

    def test_create_work_type(self, db_session, test_company, test_user):
        """Test creating a work type via service."""
        service = WorkTypeService(db_session)
        data = WorkTypeCreate(
            name="Hybrid",
            code="HYB",
            description="Hybrid work arrangement",
            color="#FF9800",
        )
        work_type = service.create_work_type(data, test_company.id, test_user.id)

        assert work_type.id is not None
        assert work_type.name == "Hybrid"

    def test_create_work_type_request(self, db_session, test_company, test_user, test_work_type):
        """Test creating a work type request."""
        service = WorkTypeService(db_session)
        data = WorkTypeRequestCreate(
            work_type_id=test_work_type.id,
            requested_date=date.today() + timedelta(days=1),
            reason="Need to work from home",
        )
        request = service.create_work_type_request(
            data, test_user.id, test_company.id, test_user.id
        )

        assert request.id is not None
        assert request.status.value == "pending"

    def test_approve_work_type_request(self, db_session, test_company, test_user, test_work_type):
        """Test approving a work type request."""
        service = WorkTypeService(db_session)

        # Create request
        data = WorkTypeRequestCreate(
            work_type_id=test_work_type.id,
            requested_date=date.today() + timedelta(days=1),
            reason="Personal reasons",
        )
        request = service.create_work_type_request(
            data, test_user.id, test_company.id, test_user.id
        )

        # Approve request
        approved = service.approve_work_type_request(
            request.id, test_company.id, test_user.id
        )

        assert approved is not None
        assert approved.status.value == "approved"


class TestApprovalService:
    """Tests for ApprovalService."""

    def test_create_workflow(self, db_session, test_company, test_user):
        """Test creating an approval workflow."""
        service = ApprovalService(db_session)
        data = ApprovalWorkflowCreate(
            name="Expense Approval",
            model_name="expense_claim",
            description="Multi-level expense approval",
        )
        workflow = service.create_workflow(data, test_company.id, test_user.id)

        assert workflow.id is not None
        assert workflow.model_name == "expense_claim"

    def test_add_approval_level(self, db_session, test_company, test_user, test_approval_workflow):
        """Test adding an approval level to workflow."""
        service = ApprovalService(db_session)
        data = ApprovalLevelCreate(
            workflow_id=test_approval_workflow.id,
            level=1,
            name="Manager Approval",
            approver_type="reporting_manager",
        )
        level = service.add_level(data, test_company.id, test_user.id)

        assert level.id is not None
        assert level.level == 1

    def test_get_workflow_for_model(self, db_session, test_approval_workflow):
        """Test getting workflow for a model."""
        service = ApprovalService(db_session)
        workflow = service.get_workflow_for_model(
            "leave_request",
            test_approval_workflow.company_id
        )

        assert workflow is not None
        assert workflow.model_name == "leave_request"


class TestSettingsService:
    """Tests for SettingsService."""

    def test_create_stage(self, db_session, test_company, test_user):
        """Test creating a stage definition."""
        service = SettingsService(db_session)
        data = StageDefinitionCreate(
            model_name="candidate",
            name="Screening",
            code="screening",
            sequence=2,
            color="#2196F3",
        )
        stage = service.create_stage(data, test_company.id, test_user.id)

        assert stage.id is not None
        assert stage.name == "Screening"

    def test_create_status(self, db_session, test_company, test_user):
        """Test creating a status definition."""
        service = SettingsService(db_session)
        data = StatusDefinitionCreate(
            model_name="leave_request",
            name="Approved",
            code="approved",
            color="#4CAF50",
            is_final=True,
        )
        status = service.create_status(data, test_company.id, test_user.id)

        assert status.id is not None
        assert status.is_final is True

    def test_set_and_get_setting(self, db_session, test_company, test_user):
        """Test setting and getting HRMS settings."""
        service = SettingsService(db_session)
        data = HRMSSettingsCreate(
            key="test_setting",
            value="test_value",
            value_type="string",
            module="hrms_base",
            category="test",
        )
        setting = service.set_setting(data, test_company.id, test_user.id)

        assert setting.value == "test_value"

        # Get setting
        retrieved = service.get_setting("test_setting", test_company.id, "hrms_base")
        assert retrieved is not None
        assert retrieved.value == "test_value"


class TestAnnouncementService:
    """Tests for AnnouncementService."""

    def test_create_announcement(self, db_session, test_company, test_user):
        """Test creating an announcement."""
        service = AnnouncementService(db_session)
        data = AnnouncementCreate(
            title="Important Notice",
            content="This is an important announcement",
            priority="high",
            is_published=True,
            is_pinned=False,
            target_audience="all",
        )
        announcement = service.create(
            data, test_user.id, test_company.id, test_user.id
        )

        assert announcement.id is not None
        assert announcement.title == "Important Notice"

    def test_list_announcements(self, db_session, test_company, test_user):
        """Test listing announcements."""
        service = AnnouncementService(db_session)

        # Create announcements
        for i in range(3):
            data = AnnouncementCreate(
                title=f"Announcement {i}",
                content=f"Content {i}",
                priority="medium",
                is_published=True,
                target_audience="all",
            )
            service.create(data, test_user.id, test_company.id, test_user.id)

        announcements, total = service.list(
            test_company.id,
            is_published=True
        )

        assert total >= 3

    def test_list_for_user(self, db_session, test_company, test_user):
        """Test listing announcements for a specific user."""
        service = AnnouncementService(db_session)

        # Create announcement for all
        data = AnnouncementCreate(
            title="For All",
            content="Content for all",
            priority="medium",
            is_published=True,
            target_audience="all",
        )
        service.create(data, test_user.id, test_company.id, test_user.id)

        announcements, total = service.list_for_user(
            user_id=test_user.id,
            company_id=test_company.id,
        )

        assert total >= 1

    def test_mark_as_viewed(self, db_session, test_announcement, test_user):
        """Test marking announcement as viewed."""
        service = AnnouncementService(db_session)

        view = service.mark_as_viewed(
            test_announcement.id,
            test_user.id,
            test_announcement.company_id
        )

        assert view is not None
        assert view.viewed_at is not None

    def test_acknowledge_announcement(self, db_session, test_announcement, test_user):
        """Test acknowledging an announcement."""
        service = AnnouncementService(db_session)

        # First mark as viewed
        service.mark_as_viewed(
            test_announcement.id,
            test_user.id,
            test_announcement.company_id
        )

        # Then acknowledge
        view = service.acknowledge(
            test_announcement.id,
            test_user.id,
            test_announcement.company_id
        )

        assert view is not None
        assert view.acknowledged_at is not None
