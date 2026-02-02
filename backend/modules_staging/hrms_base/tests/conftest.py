"""
Test fixtures for HRMS Base module.
"""

import pytest
from datetime import datetime, time, date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.user import User
from app.models.company import Company

from ..models.department import Department
from ..models.job_position import JobPosition
from ..models.job_role import JobRole
from ..models.employee_type import EmployeeType
from ..models.shift import EmployeeShift, GraceTime, ShiftSchedule, RotatingShift
from ..models.work_type import WorkType, RotatingWorkType, WorkTypeRequest, ShiftRequest
from ..models.approval import ApprovalWorkflow, ApprovalLevel, ApprovalRequest
from ..models.settings import (
    StageDefinition, StatusDefinition, StatusTransition,
    HRMSSettings, Announcement, MailTemplate
)


@pytest.fixture(scope="function")
def db_engine():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a new database session for a test."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def test_company(db_session):
    """Create a test company."""
    company = Company(
        id=1,
        name="Test Company",
        is_active=True,
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    return company


@pytest.fixture
def test_user(db_session, test_company):
    """Create a test user."""
    user = User(
        id=1,
        email="test@example.com",
        full_name="Test User",
        hashed_password="hashed_password",
        is_active=True,
        current_company_id=test_company.id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_department(db_session, test_company, test_user):
    """Create a test department."""
    department = Department(
        name="Engineering",
        code="ENG",
        description="Software engineering team",
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(department)
    db_session.commit()
    db_session.refresh(department)
    return department


@pytest.fixture
def test_job_position(db_session, test_company, test_user, test_department):
    """Create a test job position."""
    position = JobPosition(
        title="Software Engineer",
        code="SWE",
        description="Software development role",
        department_id=test_department.id,
        min_salary=70000.00,
        max_salary=120000.00,
        currency="USD",
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(position)
    db_session.commit()
    db_session.refresh(position)
    return position


@pytest.fixture
def test_job_role(db_session, test_company, test_user):
    """Create a test job role."""
    role = JobRole(
        name="Developer",
        code="DEV",
        description="Development team role",
        permissions={"code": ["read", "write"]},
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role


@pytest.fixture
def test_employee_type(db_session, test_company, test_user):
    """Create a test employee type."""
    emp_type = EmployeeType(
        name="Full-time",
        code="FT",
        description="Full-time permanent employee",
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(emp_type)
    db_session.commit()
    db_session.refresh(emp_type)
    return emp_type


@pytest.fixture
def test_shift(db_session, test_company, test_user):
    """Create a test shift."""
    shift = EmployeeShift(
        name="Day Shift",
        start_time=time(9, 0),
        end_time=time(18, 0),
        break_start=time(12, 0),
        break_end=time(13, 0),
        working_hours=8.0,
        is_night_shift=False,
        color="#4CAF50",
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(shift)
    db_session.commit()
    db_session.refresh(shift)
    return shift


@pytest.fixture
def test_work_type(db_session, test_company, test_user):
    """Create a test work type."""
    work_type = WorkType(
        name="Office",
        code="OFFICE",
        description="Working from office",
        color="#4CAF50",
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(work_type)
    db_session.commit()
    db_session.refresh(work_type)
    return work_type


@pytest.fixture
def test_approval_workflow(db_session, test_company, test_user):
    """Create a test approval workflow."""
    workflow = ApprovalWorkflow(
        name="Leave Approval",
        model_name="leave_request",
        description="Standard leave request approval workflow",
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(workflow)
    db_session.commit()
    db_session.refresh(workflow)
    return workflow


@pytest.fixture
def test_stage_definition(db_session, test_company, test_user):
    """Create a test stage definition."""
    stage = StageDefinition(
        model_name="candidate",
        name="New",
        code="new",
        sequence=1,
        color="#9E9E9E",
        is_initial=True,
        is_final=False,
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(stage)
    db_session.commit()
    db_session.refresh(stage)
    return stage


@pytest.fixture
def test_status_definition(db_session, test_company, test_user):
    """Create a test status definition."""
    status = StatusDefinition(
        model_name="leave_request",
        name="Pending",
        code="pending",
        color="#FF9800",
        is_initial=True,
        is_final=False,
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(status)
    db_session.commit()
    db_session.refresh(status)
    return status


@pytest.fixture
def test_hrms_settings(db_session, test_company, test_user):
    """Create test HRMS settings."""
    setting = HRMSSettings(
        key="working_days_per_week",
        value="5",
        value_type="integer",
        module="hrms_base",
        category="general",
        description="Number of working days per week",
        is_system=True,
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(setting)
    db_session.commit()
    db_session.refresh(setting)
    return setting


@pytest.fixture
def test_announcement(db_session, test_company, test_user):
    """Create a test announcement."""
    announcement = Announcement(
        title="Welcome",
        content="Welcome to the HRMS system",
        priority="high",
        is_published=True,
        is_pinned=True,
        publish_date=datetime.now(),
        target_audience="all",
        author_id=test_user.id,
        company_id=test_company.id,
        created_by=test_user.id,
    )
    db_session.add(announcement)
    db_session.commit()
    db_session.refresh(announcement)
    return announcement
