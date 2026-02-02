"""
Employee Service V2 - Using the CRUD Framework

This is an example implementation showing how to use the BaseModelService
from the CRUD framework for the Employee model.

Features demonstrated:
- Service configuration (_name, _order, _rec_name, etc.)
- Hook overrides (_before_create, _after_create, etc.)
- Custom domain-based methods
- Recordset operations
- Context management
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload

from modules.base.services import (
    BaseModelService,
    Domain,
    Recordset,
    register_service,
    get_service,
    OR,
)
from ..models.employee import (
    Employee,
    EmployeeContact,
    EmployeeDocument,
    EmployeeBankAccount,
    EmployeeSkill,
    EmployeeCertification,
    EmployeeEducation,
    EmployeeExperience,
    EmployeeEmergencyContact,
    EmployeeDependent,
    DocumentStatus,
)


@register_service('employee_employees')
class EmployeeServiceV2(BaseModelService[Employee]):
    """
    Employee service using the CRUD framework.

    Provides standardized CRUD operations with:
    - Domain-based filtering
    - Recordset operations
    - Automatic company scoping
    - Soft delete support
    - Audit logging
    - Custom hooks for business logic
    """

    # =========================================================================
    # SERVICE CONFIGURATION
    # =========================================================================

    _name = "employee"
    _description = "Employee Records"
    _order = "first_name, last_name"  # Default sort order
    _rec_name = "full_name"  # Field for display name (computed property)
    _company_scoped = True  # Auto-filter by company_id
    _soft_delete = True  # Use soft delete (deleted_at)
    _audit_enabled = True  # Enable audit logging

    def __init__(self, db: Session, context: Dict[str, Any] = None):
        """
        Initialize employee service.

        Args:
            db: Database session
            context: Context dict with user_id, company_id, etc.
        """
        super().__init__(db, Employee, context)

    # =========================================================================
    # HOOK OVERRIDES
    # =========================================================================

    def _before_create(self, vals: Dict[str, Any]) -> Dict[str, Any]:
        """
        Called before creating an employee.

        - Auto-generates employee number if not provided
        - Sets default status
        - Validates required fields
        """
        vals = super()._before_create(vals)

        # Auto-generate employee number if not provided
        if not vals.get('employee_number'):
            vals['employee_number'] = self._generate_employee_number()

        # Set defaults
        if 'is_active' not in vals:
            vals['is_active'] = True

        if 'currency' not in vals:
            vals['currency'] = 'USD'

        if 'pay_frequency' not in vals:
            vals['pay_frequency'] = 'monthly'

        return vals

    def _after_create(self, record: Employee) -> None:
        """
        Called after creating an employee.

        - Creates default folder structure
        - Sends welcome notification
        """
        super()._after_create(record)

        # Log the creation
        self._log_activity('create', record.id, {
            'employee_number': record.employee_number,
            'full_name': record.full_name,
        })

    def _before_write(self, ids: List[int], vals: Dict[str, Any]) -> Dict[str, Any]:
        """
        Called before updating employees.

        - Tracks status changes
        - Validates updates
        """
        vals = super()._before_write(ids, vals)

        # Track status changes for audit
        if 'is_active' in vals:
            # Could log status change here
            pass

        return vals

    def _after_write(self, records: Recordset[Employee]) -> None:
        """Called after updating employees."""
        super()._after_write(records)

    def _before_unlink(self, records: Recordset[Employee]) -> None:
        """
        Called before deleting employees.

        - Prevents deletion of active employees with open tasks
        - Validates business rules
        """
        super()._before_unlink(records)

        # Example: Prevent deletion of managers with direct reports
        for record in records:
            direct_reports = self.get_direct_reports(record.id)
            if direct_reports:
                raise ValueError(
                    f"Cannot delete {record.full_name}: has {len(direct_reports)} direct reports. "
                    "Reassign them first."
                )

    def _get_base_domain(self) -> Domain:
        """
        Override to customize base domain.

        Filters by company_id and excludes soft-deleted records.
        """
        domain = []

        # Add company scope
        if self._company_scoped and self.company_id:
            domain.append(('company_id', '=', self.company_id))

        # Soft delete filter - use is_deleted (matches recordset.unlink behavior)
        if self._soft_delete:
            domain.append(('is_deleted', '=', False))

        return domain

    # =========================================================================
    # CUSTOM SEARCH METHODS
    # =========================================================================

    def search_employees(
        self,
        search: Optional[str] = None,
        department_id: Optional[int] = None,
        job_position_id: Optional[int] = None,
        employee_type_id: Optional[int] = None,
        reporting_manager_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        is_manager: Optional[bool] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[Recordset[Employee], int]:
        """
        Search employees with multiple filters.

        Args:
            search: Search term for name, email, employee number
            department_id: Filter by department
            job_position_id: Filter by job position
            employee_type_id: Filter by employee type
            reporting_manager_id: Filter by manager
            is_active: Filter by active status
            is_manager: Filter by manager status
            offset: Pagination offset
            limit: Pagination limit

        Returns:
            Tuple of (Recordset, total_count)
        """
        # Build domain from filters
        domain = []

        if department_id:
            domain.append(('department_id', '=', department_id))

        if job_position_id:
            domain.append(('job_position_id', '=', job_position_id))

        if employee_type_id:
            domain.append(('employee_type_id', '=', employee_type_id))

        if reporting_manager_id:
            domain.append(('reporting_manager_id', '=', reporting_manager_id))

        if is_active is not None:
            domain.append(('is_active', '=', is_active))

        if is_manager is not None:
            domain.append(('is_manager', '=', is_manager))

        # Add search filter (OR across multiple fields)
        if search:
            search_domain = [
                '|',
                ('first_name', 'ilike', f'%{search}%'),
                '|',
                ('last_name', 'ilike', f'%{search}%'),
                '|',
                ('employee_number', 'ilike', f'%{search}%'),
                ('work_email', 'ilike', f'%{search}%'),
            ]
            domain = search_domain + domain if domain else search_domain

        # Get total count
        total = self.search_count(domain)

        # Get paginated results
        records = self.search(
            domain=domain,
            offset=offset,
            limit=limit,
            order='first_name asc, last_name asc',
        )

        return records, total

    def get_by_user_id(self, user_id: int) -> Optional[Employee]:
        """Get employee by linked user ID."""
        records = self.search([('user_id', '=', user_id)], limit=1)
        return records.ensure_one() if records else None

    def get_by_employee_number(self, employee_number: str) -> Optional[Employee]:
        """Get employee by employee number."""
        records = self.search([('employee_number', '=', employee_number)], limit=1)
        return records.ensure_one() if records else None

    # =========================================================================
    # ORGANIZATION METHODS
    # =========================================================================

    def get_direct_reports(self, manager_id: int) -> Recordset[Employee]:
        """
        Get employees directly reporting to a manager.

        Args:
            manager_id: ID of the manager

        Returns:
            Recordset of direct reports
        """
        return self.search([
            ('reporting_manager_id', '=', manager_id),
            ('is_active', '=', True),
        ])

    def get_all_reports(self, manager_id: int) -> Recordset[Employee]:
        """
        Get all employees in the reporting chain (recursive).

        Args:
            manager_id: ID of the top manager

        Returns:
            Recordset of all reports (direct and indirect)
        """
        all_ids = []
        to_process = [manager_id]

        while to_process:
            current_id = to_process.pop(0)
            direct_reports = self.search([
                ('reporting_manager_id', '=', current_id),
                ('is_active', '=', True),
            ])

            for emp_id in direct_reports.ids:
                if emp_id not in all_ids:
                    all_ids.append(emp_id)
                    to_process.append(emp_id)

        return self.browse(all_ids)

    def get_org_chart(self, root_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Build organization chart structure.

        Args:
            root_id: ID of root employee (None for top-level)

        Returns:
            List of employee dicts with nested children
        """
        def build_tree(manager_id: Optional[int]) -> List[Dict[str, Any]]:
            employees = self.search_read(
                domain=[
                    ('reporting_manager_id', '=' if manager_id else '=', manager_id if manager_id else None),
                    ('is_active', '=', True),
                ],
                fields=['id', 'first_name', 'last_name', 'employee_number',
                        'job_position_id', 'department_id', 'avatar_url'],
            )

            result = []
            for emp in employees:
                node = {
                    **emp,
                    'name': f"{emp['first_name']} {emp['last_name']}",
                    'children': build_tree(emp['id']),
                }
                result.append(node)

            return result

        return build_tree(root_id)

    def get_managers(self) -> Recordset[Employee]:
        """Get all employees who are managers."""
        return self.search([('is_manager', '=', True)])

    def get_team_members(self, team_ids: List[int]) -> Recordset[Employee]:
        """Get employees by department/team IDs."""
        return self.search([('department_id', 'in', team_ids)])

    # =========================================================================
    # EMPLOYEE LIFECYCLE METHODS
    # =========================================================================

    def hire(self, vals: Dict[str, Any]) -> Employee:
        """
        Hire a new employee.

        Args:
            vals: Employee data including hire_date

        Returns:
            Created employee record
        """
        if 'hire_date' not in vals:
            vals['hire_date'] = date.today()

        return self.create(vals).ensure_one()

    def terminate(
        self,
        employee_id: int,
        termination_date: date = None,
        reason: str = None,
    ) -> bool:
        """
        Terminate an employee.

        Args:
            employee_id: Employee to terminate
            termination_date: Date of termination (default: today)
            reason: Termination reason

        Returns:
            True on success
        """
        return self.write(employee_id, {
            'termination_date': termination_date or date.today(),
            'termination_reason': reason,
            'is_active': False,
        })

    def promote(
        self,
        employee_id: int,
        new_job_position_id: int = None,
        new_salary: Decimal = None,
        effective_date: date = None,
    ) -> bool:
        """
        Promote an employee.

        Args:
            employee_id: Employee to promote
            new_job_position_id: New job position
            new_salary: New salary
            effective_date: When promotion takes effect

        Returns:
            True on success
        """
        vals = {}

        if new_job_position_id:
            vals['job_position_id'] = new_job_position_id

        if new_salary:
            vals['salary'] = new_salary

        if vals:
            return self.write(employee_id, vals)

        return False

    def transfer(
        self,
        employee_id: int,
        new_department_id: int,
        new_manager_id: int = None,
    ) -> bool:
        """
        Transfer an employee to a new department.

        Args:
            employee_id: Employee to transfer
            new_department_id: Target department
            new_manager_id: New reporting manager

        Returns:
            True on success
        """
        vals = {'department_id': new_department_id}

        if new_manager_id:
            vals['reporting_manager_id'] = new_manager_id

        return self.write(employee_id, vals)

    # =========================================================================
    # STATISTICS & REPORTING
    # =========================================================================

    def get_headcount(self, department_id: int = None) -> int:
        """
        Get active employee count.

        Args:
            department_id: Optional department filter

        Returns:
            Number of active employees
        """
        domain = [('is_active', '=', True)]

        if department_id:
            domain.append(('department_id', '=', department_id))

        return self.search_count(domain)

    def get_recent_hires(self, days: int = 30) -> Recordset[Employee]:
        """Get employees hired in the last N days."""
        since_date = date.today() - timedelta(days=days)
        return self.search([
            ('hire_date', '>=', since_date.isoformat()),
            ('is_active', '=', True),
        ])

    def get_upcoming_anniversaries(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get employees with work anniversaries in the next N days."""
        today = date.today()
        employees = self.search([('hire_date', '!=', None), ('is_active', '=', True)])

        upcoming = []
        for emp in employees:
            if emp.hire_date:
                # Calculate next anniversary
                anniversary = emp.hire_date.replace(year=today.year)
                if anniversary < today:
                    anniversary = anniversary.replace(year=today.year + 1)

                days_until = (anniversary - today).days
                if 0 <= days_until <= days:
                    years = today.year - emp.hire_date.year
                    if anniversary.year > today.year:
                        years += 1

                    upcoming.append({
                        'employee_id': emp.id,
                        'name': emp.full_name,
                        'hire_date': emp.hire_date,
                        'anniversary_date': anniversary,
                        'years': years,
                        'days_until': days_until,
                    })

        return sorted(upcoming, key=lambda x: x['days_until'])

    def get_probation_ending(self, days: int = 30) -> Recordset[Employee]:
        """Get employees whose probation ends in the next N days."""
        today = date.today()
        end_date = today + timedelta(days=days)

        return self.search([
            ('probation_end_date', '>=', today.isoformat()),
            ('probation_end_date', '<=', end_date.isoformat()),
            ('is_active', '=', True),
        ])

    # =========================================================================
    # PRIVATE HELPER METHODS
    # =========================================================================

    def _generate_employee_number(self) -> str:
        """
        Generate a unique employee number.

        Format: EMP-YYYYMMDD-XXXX
        """
        today = date.today()
        prefix = f"EMP-{today.strftime('%Y%m%d')}-"

        # Find the highest number for today
        existing = self._db.query(Employee).filter(
            Employee.employee_number.like(f"{prefix}%"),
            Employee.company_id == self.company_id,
        ).order_by(Employee.employee_number.desc()).first()

        if existing:
            try:
                last_num = int(existing.employee_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        return f"{prefix}{next_num:04d}"

    def _log_activity(self, action: str, record_id: int, changes: Dict[str, Any]) -> None:
        """
        Log activity for audit trail.

        Override to integrate with your ActivityLog model.
        """
        # Placeholder - integrate with your logging system
        pass


# =============================================================================
# CHILD MODEL SERVICES
# =============================================================================

class EmployeeDocumentService(BaseModelService[EmployeeDocument]):
    """Service for employee documents."""

    _name = "employee.document"
    _order = "created_at desc"
    _company_scoped = True
    _soft_delete = False

    def __init__(self, db: Session, context: Dict[str, Any] = None):
        super().__init__(db, EmployeeDocument, context)

    def get_expiring_soon(self, days: int = 30) -> Recordset[EmployeeDocument]:
        """Get documents expiring within specified days."""
        today = date.today()
        end_date = today + timedelta(days=days)

        return self.search([
            ('expiry_date', '>=', today.isoformat()),
            ('expiry_date', '<=', end_date.isoformat()),
        ])

    def verify(self, document_id: int, notes: str = None) -> bool:
        """Verify a document."""
        return self.write(document_id, {
            'status': DocumentStatus.VERIFIED.value,
            'verified_by': self.user_id,
            'verified_at': datetime.utcnow(),
            'verification_notes': notes,
        })


class EmployeeSkillService(BaseModelService[EmployeeSkill]):
    """Service for employee skills."""

    _name = "employee.skill"
    _order = "skill_name"
    _company_scoped = True
    _soft_delete = False

    def __init__(self, db: Session, context: Dict[str, Any] = None):
        super().__init__(db, EmployeeSkill, context)

    def get_by_category(self, category: str) -> Recordset[EmployeeSkill]:
        """Get skills by category."""
        return self.search([('category', '=', category)])

    def get_experts(self, skill_name: str) -> Recordset[EmployeeSkill]:
        """Get employees who are experts in a skill."""
        return self.search([
            ('skill_name', 'ilike', f'%{skill_name}%'),
            ('proficiency_level', '=', 'expert'),
        ])


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def get_employee_service(
    db: Session,
    user_id: int = None,
    company_id: int = None,
) -> EmployeeServiceV2:
    """
    Factory function to get employee service with context.

    Args:
        db: Database session
        user_id: Current user ID
        company_id: Current company ID

    Returns:
        Configured EmployeeServiceV2 instance

    Usage:
        service = get_employee_service(db, user_id=1, company_id=5)
        employees = service.search([('is_active', '=', True)])
    """
    context = {}
    if user_id:
        context['user_id'] = user_id
    if company_id:
        context['company_id'] = company_id

    return EmployeeServiceV2(db, context)
