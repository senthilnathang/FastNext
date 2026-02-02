"""
Employee Module Tests
"""

import pytest
from datetime import date

from ..models.employee import Employee, Gender, MaritalStatus, SkillLevel
from ..schemas.employee import EmployeeCreate, EmployeeUpdate


class TestEmployeeModel:
    """Tests for Employee model."""

    def test_employee_full_name(self):
        """Test full name property."""
        emp = Employee(
            first_name="John",
            middle_name="Robert",
            last_name="Smith",
            employee_number="EMP001",
        )
        assert emp.full_name == "John Robert Smith"

    def test_employee_full_name_no_middle(self):
        """Test full name without middle name."""
        emp = Employee(
            first_name="John",
            last_name="Smith",
            employee_number="EMP001",
        )
        assert emp.full_name == "John Smith"

    def test_employee_display_name_preferred(self):
        """Test display name with preferred name."""
        emp = Employee(
            first_name="Jonathan",
            last_name="Smith",
            preferred_name="John",
            employee_number="EMP001",
        )
        assert emp.display_name == "John"

    def test_employee_display_name_no_preferred(self):
        """Test display name without preferred name."""
        emp = Employee(
            first_name="John",
            last_name="Smith",
            employee_number="EMP001",
        )
        assert emp.display_name == "John Smith"


class TestEmployeeSchemas:
    """Tests for Employee schemas."""

    def test_employee_create_schema(self):
        """Test employee create schema."""
        data = EmployeeCreate(
            employee_number="EMP001",
            first_name="John",
            last_name="Smith",
            work_email="john@example.com",
            gender=Gender.MALE,
            hire_date=date(2024, 1, 15),
        )
        assert data.employee_number == "EMP001"
        assert data.first_name == "John"
        assert data.gender == Gender.MALE

    def test_employee_update_schema(self):
        """Test employee update schema with partial data."""
        data = EmployeeUpdate(
            first_name="Jonathan",
            mobile_phone="+1-555-0101",
        )
        assert data.first_name == "Jonathan"
        assert data.mobile_phone == "+1-555-0101"
        assert data.last_name is None


class TestEmployeeService:
    """Tests for EmployeeService."""

    def test_list_employees_with_search(self):
        """Test listing employees with search filter."""
        # Would test with mock database
        pass

    def test_create_employee(self):
        """Test creating an employee."""
        # Would test with mock database
        pass

    def test_get_direct_reports(self):
        """Test getting direct reports."""
        # Would test with mock database
        pass


class TestEmployeeAPI:
    """Tests for Employee API endpoints."""

    def test_list_employees_endpoint(self):
        """Test GET /employees endpoint."""
        # Would test with FastAPI TestClient
        pass

    def test_get_my_profile_endpoint(self):
        """Test GET /employees/me endpoint."""
        # Would test with FastAPI TestClient
        pass

    def test_create_employee_endpoint(self):
        """Test POST /employees endpoint."""
        # Would test with FastAPI TestClient
        pass

    def test_add_skill_endpoint(self):
        """Test POST /employees/{id}/skills endpoint."""
        # Would test with FastAPI TestClient
        pass
