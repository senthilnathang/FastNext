"""
Offboarding Module Tests
"""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal

from ..models.offboarding import (
    ExitReason, OffboardingTemplate, OffboardingStage, TaskTemplate,
    OffboardingEmployee, OffboardingTask, AssetReturn, ExitInterview,
    FnFSettlement, FnFComponent,
    OffboardingStatus, ExitType, TaskStatus, TaskPriority, FnFStatus
)
from ..schemas.offboarding import (
    ExitReasonCreate, OffboardingTemplateCreate, OffboardingStageCreate,
    OffboardingEmployeeCreate, OffboardingTaskCreate,
    AssetReturnCreate, FnFSettlementCreate
)


class TestExitReasonModel:
    """Tests for ExitReason model."""

    def test_exit_reason_creation(self):
        """Test exit reason creation."""
        reason = ExitReason(
            name="Better Opportunity",
            description="Found a better job",
            exit_type=ExitType.RESIGNATION,
            is_rehirable=True,
        )
        assert reason.name == "Better Opportunity"
        assert reason.exit_type == ExitType.RESIGNATION
        assert reason.is_rehirable is True


class TestOffboardingStageModel:
    """Tests for OffboardingStage model."""

    def test_stage_creation(self):
        """Test stage creation."""
        stage = OffboardingStage(
            name="Notice Period",
            description="Serving notice period",
            sequence=1,
            is_mandatory=True,
            color="#f39c12",
        )
        assert stage.name == "Notice Period"
        assert stage.sequence == 1
        assert stage.is_mandatory is True


class TestOffboardingTemplateModel:
    """Tests for OffboardingTemplate model."""

    def test_template_creation(self):
        """Test template creation."""
        template = OffboardingTemplate(
            name="Standard Resignation",
            description="Standard offboarding for resignations",
            exit_type=ExitType.RESIGNATION,
            default_notice_period_days=30,
            require_exit_interview=True,
        )
        assert template.name == "Standard Resignation"
        assert template.exit_type == ExitType.RESIGNATION
        assert template.default_notice_period_days == 30


class TestOffboardingEmployeeModel:
    """Tests for OffboardingEmployee model."""

    def test_employee_creation(self):
        """Test offboarding employee creation."""
        employee = OffboardingEmployee(
            employee_id=1,
            exit_type=ExitType.RESIGNATION,
            resignation_date=date.today(),
            last_working_day=date.today() + timedelta(days=30),
            notice_period_days=30,
            status=OffboardingStatus.PENDING_APPROVAL,
        )
        assert employee.exit_type == ExitType.RESIGNATION
        assert employee.status == OffboardingStatus.PENDING_APPROVAL
        assert employee.notice_period_days == 30

    def test_offboarding_status_values(self):
        """Test offboarding status enum values."""
        assert OffboardingStatus.PENDING_APPROVAL.value == "pending_approval"
        assert OffboardingStatus.IN_PROGRESS.value == "in_progress"
        assert OffboardingStatus.COMPLETED.value == "completed"

    def test_exit_type_values(self):
        """Test exit type enum values."""
        assert ExitType.RESIGNATION.value == "resignation"
        assert ExitType.TERMINATION.value == "termination"
        assert ExitType.RETIREMENT.value == "retirement"
        assert ExitType.LAYOFF.value == "layoff"


class TestOffboardingTaskModel:
    """Tests for OffboardingTask model."""

    def test_task_creation(self):
        """Test task creation."""
        task = OffboardingTask(
            offboarding_employee_id=1,
            name="Return Laptop",
            category="IT",
            priority=TaskPriority.HIGH,
            status=TaskStatus.PENDING,
            due_date=date.today() + timedelta(days=7),
            is_mandatory=True,
            is_blocking=True,
        )
        assert task.name == "Return Laptop"
        assert task.status == TaskStatus.PENDING
        assert task.is_blocking is True

    def test_task_status_values(self):
        """Test task status enum values."""
        assert TaskStatus.PENDING.value == "pending"
        assert TaskStatus.IN_PROGRESS.value == "in_progress"
        assert TaskStatus.COMPLETED.value == "completed"
        assert TaskStatus.NOT_APPLICABLE.value == "not_applicable"


class TestAssetReturnModel:
    """Tests for AssetReturn model."""

    def test_asset_return_creation(self):
        """Test asset return creation."""
        asset = AssetReturn(
            offboarding_employee_id=1,
            asset_name="MacBook Pro",
            asset_type="Laptop",
            asset_serial="ABC123",
            is_returned=False,
        )
        assert asset.asset_name == "MacBook Pro"
        assert asset.is_returned is False


class TestExitInterviewModel:
    """Tests for ExitInterview model."""

    def test_interview_creation(self):
        """Test exit interview creation."""
        interview = ExitInterview(
            offboarding_employee_id=1,
            scheduled_date=datetime.now() + timedelta(days=7),
            is_completed=False,
        )
        assert interview.is_completed is False


class TestFnFSettlementModel:
    """Tests for FnFSettlement model."""

    def test_settlement_creation(self):
        """Test FnF settlement creation."""
        settlement = FnFSettlement(
            offboarding_employee_id=1,
            pending_salary=Decimal("5000"),
            leave_encashment=Decimal("1500"),
            tax_deductions=Decimal("750"),
            status=FnFStatus.DRAFT,
        )
        assert settlement.pending_salary == Decimal("5000")
        assert settlement.status == FnFStatus.DRAFT

    def test_fnf_status_values(self):
        """Test FnF status enum values."""
        assert FnFStatus.DRAFT.value == "draft"
        assert FnFStatus.APPROVED.value == "approved"
        assert FnFStatus.PAID.value == "paid"


class TestOffboardingSchemas:
    """Tests for Offboarding schemas."""

    def test_exit_reason_create(self):
        """Test exit reason create schema."""
        data = ExitReasonCreate(
            name="Relocation",
            exit_type=ExitType.RESIGNATION,
        )
        assert data.name == "Relocation"
        assert data.is_rehirable is True  # Default

    def test_stage_create(self):
        """Test stage create schema."""
        data = OffboardingStageCreate(
            name="Knowledge Transfer",
            sequence=2,
        )
        assert data.name == "Knowledge Transfer"
        assert data.is_mandatory is True  # Default

    def test_employee_create(self):
        """Test offboarding employee create schema."""
        data = OffboardingEmployeeCreate(
            employee_id=1,
            exit_type=ExitType.RESIGNATION,
            last_working_day=date.today() + timedelta(days=30),
        )
        assert data.exit_type == ExitType.RESIGNATION
        assert data.notice_period_days == 30  # Default


class TestOffboardingService:
    """Tests for OffboardingService."""

    def test_create_offboarding_with_tasks(self):
        """Test offboarding creation creates tasks from template."""
        # Would test with mock database
        pass

    def test_approve_offboarding(self):
        """Test offboarding approval."""
        # Would test with mock database
        pass

    def test_calculate_fnf_totals(self):
        """Test FnF settlement calculation."""
        # Would test with mock database
        pass

    def test_update_progress(self):
        """Test progress calculation."""
        # Would test with mock database
        pass


class TestOffboardingAPI:
    """Tests for Offboarding API endpoints."""

    def test_create_offboarding_endpoint(self):
        """Test POST /offboarding/employees endpoint."""
        # Would test with FastAPI TestClient
        pass

    def test_approve_offboarding_endpoint(self):
        """Test POST /offboarding/employees/{id}/approve endpoint."""
        # Would test with FastAPI TestClient
        pass

    def test_complete_task_endpoint(self):
        """Test POST /offboarding/tasks/{id}/complete endpoint."""
        # Would test with FastAPI TestClient
        pass

    def test_mark_asset_returned_endpoint(self):
        """Test POST /offboarding/asset-returns/{id}/mark-returned endpoint."""
        # Would test with FastAPI TestClient
        pass

    def test_fnf_approval_endpoints(self):
        """Test FnF approval endpoints."""
        # Would test with FastAPI TestClient
        pass

    def test_dashboard_endpoint(self):
        """Test GET /offboarding/dashboard endpoint."""
        # Would test with FastAPI TestClient
        pass
