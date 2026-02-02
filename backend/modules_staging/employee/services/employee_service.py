"""
Employee Service

Business logic for employee management.
"""

from datetime import datetime, date
from typing import Optional, List, Tuple, Any, Dict

from sqlalchemy import or_, and_
from sqlalchemy.orm import Session, joinedload

from ..models.employee import (
    Employee, EmployeeContact, EmployeeDocument, EmployeeBankAccount,
    EmployeeSkill, EmployeeCertification, EmployeeEducation,
    EmployeeExperience, EmployeeEmergencyContact, EmployeeDependent,
    DocumentStatus
)
from ..schemas.employee import (
    EmployeeCreate, EmployeeUpdate,
    EmployeeContactCreate, EmployeeContactUpdate,
    EmployeeDocumentCreate, EmployeeDocumentUpdate,
    EmployeeBankAccountCreate, EmployeeBankAccountUpdate,
    EmployeeSkillCreate, EmployeeSkillUpdate,
    EmployeeCertificationCreate, EmployeeCertificationUpdate,
    EmployeeEducationCreate, EmployeeEducationUpdate,
    EmployeeExperienceCreate, EmployeeExperienceUpdate,
    EmployeeEmergencyContactCreate, EmployeeEmergencyContactUpdate,
    EmployeeDependentCreate, EmployeeDependentUpdate,
)


class EmployeeService:
    """Service for employee operations."""

    def __init__(self, db: Session):
        self.db = db

    # Employee CRUD
    def get(self, employee_id: int, company_id: int) -> Optional[Employee]:
        """Get employee by ID."""
        return self.db.query(Employee).options(
            joinedload(Employee.contacts),
            joinedload(Employee.documents),
            joinedload(Employee.bank_accounts),
            joinedload(Employee.skills),
            joinedload(Employee.certifications),
            joinedload(Employee.education),
            joinedload(Employee.experience),
            joinedload(Employee.emergency_contacts),
            joinedload(Employee.dependents),
        ).filter(
            Employee.id == employee_id,
            Employee.company_id == company_id,
            Employee.deleted_at.is_(None),
        ).first()

    def get_by_user_id(self, user_id: int, company_id: int) -> Optional[Employee]:
        """Get employee by user ID."""
        return self.db.query(Employee).filter(
            Employee.user_id == user_id,
            Employee.company_id == company_id,
            Employee.deleted_at.is_(None),
        ).first()

    def get_by_employee_number(self, employee_number: str, company_id: int) -> Optional[Employee]:
        """Get employee by employee number."""
        return self.db.query(Employee).filter(
            Employee.employee_number == employee_number,
            Employee.company_id == company_id,
            Employee.deleted_at.is_(None),
        ).first()

    def list(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        department_id: Optional[int] = None,
        job_position_id: Optional[int] = None,
        employee_type_id: Optional[int] = None,
        reporting_manager_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        is_manager: Optional[bool] = None,
    ) -> Tuple[List[Employee], int]:
        """List employees with filtering."""
        query = self.db.query(Employee).filter(
            Employee.company_id == company_id,
            Employee.deleted_at.is_(None),
        )

        if search:
            search_filter = or_(
                Employee.first_name.ilike(f"%{search}%"),
                Employee.last_name.ilike(f"%{search}%"),
                Employee.employee_number.ilike(f"%{search}%"),
                Employee.work_email.ilike(f"%{search}%"),
            )
            query = query.filter(search_filter)

        if department_id:
            query = query.filter(Employee.department_id == department_id)
        if job_position_id:
            query = query.filter(Employee.job_position_id == job_position_id)
        if employee_type_id:
            query = query.filter(Employee.employee_type_id == employee_type_id)
        if reporting_manager_id:
            query = query.filter(Employee.reporting_manager_id == reporting_manager_id)
        if is_active is not None:
            query = query.filter(Employee.is_active == is_active)
        if is_manager is not None:
            query = query.filter(Employee.is_manager == is_manager)

        total = query.count()
        employees = query.order_by(Employee.first_name, Employee.last_name).offset(skip).limit(limit).all()

        return employees, total

    def create(self, data: EmployeeCreate, company_id: int, user_id: int) -> Employee:
        """Create a new employee."""
        employee = Employee(
            **data.model_dump(),
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(employee)
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def update(
        self, employee_id: int, data: EmployeeUpdate, company_id: int, user_id: int
    ) -> Optional[Employee]:
        """Update an employee."""
        employee = self.get(employee_id, company_id)
        if not employee:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(employee, field, value)

        employee.updated_by = user_id
        self.db.commit()
        self.db.refresh(employee)
        return employee

    def delete(self, employee_id: int, company_id: int, user_id: int) -> bool:
        """Soft delete an employee."""
        employee = self.db.query(Employee).filter(
            Employee.id == employee_id,
            Employee.company_id == company_id,
            Employee.deleted_at.is_(None),
        ).first()

        if not employee:
            return False

        employee.deleted_at = datetime.utcnow()
        employee.deleted_by = user_id
        employee.is_active = False
        self.db.commit()
        return True

    def get_direct_reports(self, manager_id: int, company_id: int) -> List[Employee]:
        """Get direct reports of a manager."""
        return self.db.query(Employee).filter(
            Employee.reporting_manager_id == manager_id,
            Employee.company_id == company_id,
            Employee.deleted_at.is_(None),
            Employee.is_active == True,
        ).all()

    def get_org_chart(self, company_id: int, root_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get organization chart."""
        def build_tree(manager_id: Optional[int]) -> List[Dict[str, Any]]:
            employees = self.db.query(Employee).filter(
                Employee.reporting_manager_id == manager_id,
                Employee.company_id == company_id,
                Employee.deleted_at.is_(None),
                Employee.is_active == True,
            ).all()

            result = []
            for emp in employees:
                node = {
                    "id": emp.id,
                    "name": emp.full_name,
                    "employee_number": emp.employee_number,
                    "job_position_id": emp.job_position_id,
                    "department_id": emp.department_id,
                    "avatar_url": emp.avatar_url,
                    "children": build_tree(emp.id),
                }
                result.append(node)
            return result

        return build_tree(root_id)

    # Contact Management
    def add_contact(
        self, employee_id: int, data: EmployeeContactCreate, company_id: int, user_id: int
    ) -> Optional[EmployeeContact]:
        """Add a contact to an employee."""
        employee = self.get(employee_id, company_id)
        if not employee:
            return None

        # If primary, unset other primary contacts of same type
        if data.is_primary:
            self.db.query(EmployeeContact).filter(
                EmployeeContact.employee_id == employee_id,
                EmployeeContact.contact_type == data.contact_type,
            ).update({"is_primary": False})

        contact = EmployeeContact(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(contact)
        self.db.commit()
        self.db.refresh(contact)
        return contact

    def update_contact(
        self, contact_id: int, data: EmployeeContactUpdate, company_id: int, user_id: int
    ) -> Optional[EmployeeContact]:
        """Update a contact."""
        contact = self.db.query(EmployeeContact).filter(
            EmployeeContact.id == contact_id,
            EmployeeContact.company_id == company_id,
        ).first()

        if not contact:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(contact, field, value)

        contact.updated_by = user_id
        self.db.commit()
        self.db.refresh(contact)
        return contact

    def delete_contact(self, contact_id: int, company_id: int) -> bool:
        """Delete a contact."""
        contact = self.db.query(EmployeeContact).filter(
            EmployeeContact.id == contact_id,
            EmployeeContact.company_id == company_id,
        ).first()

        if not contact:
            return False

        self.db.delete(contact)
        self.db.commit()
        return True

    # Document Management
    def add_document(
        self, employee_id: int, data: EmployeeDocumentCreate, company_id: int, user_id: int
    ) -> Optional[EmployeeDocument]:
        """Add a document to an employee."""
        employee = self.get(employee_id, company_id)
        if not employee:
            return None

        document = EmployeeDocument(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def update_document(
        self, document_id: int, data: EmployeeDocumentUpdate, company_id: int, user_id: int
    ) -> Optional[EmployeeDocument]:
        """Update a document."""
        document = self.db.query(EmployeeDocument).filter(
            EmployeeDocument.id == document_id,
            EmployeeDocument.company_id == company_id,
        ).first()

        if not document:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(document, field, value)

        document.updated_by = user_id
        self.db.commit()
        self.db.refresh(document)
        return document

    def verify_document(
        self, document_id: int, company_id: int, user_id: int, notes: Optional[str] = None
    ) -> Optional[EmployeeDocument]:
        """Verify a document."""
        document = self.db.query(EmployeeDocument).filter(
            EmployeeDocument.id == document_id,
            EmployeeDocument.company_id == company_id,
        ).first()

        if not document:
            return None

        document.status = DocumentStatus.VERIFIED
        document.verified_by = user_id
        document.verified_at = datetime.utcnow()
        document.verification_notes = notes
        self.db.commit()
        self.db.refresh(document)
        return document

    def get_expiring_documents(
        self, company_id: int, days_ahead: int = 30
    ) -> List[EmployeeDocument]:
        """Get documents expiring within specified days."""
        expiry_date = date.today()
        from datetime import timedelta
        end_date = expiry_date + timedelta(days=days_ahead)

        return self.db.query(EmployeeDocument).filter(
            EmployeeDocument.company_id == company_id,
            EmployeeDocument.expiry_date.isnot(None),
            EmployeeDocument.expiry_date >= expiry_date,
            EmployeeDocument.expiry_date <= end_date,
        ).all()

    # Bank Account Management
    def add_bank_account(
        self, employee_id: int, data: EmployeeBankAccountCreate, company_id: int, user_id: int
    ) -> Optional[EmployeeBankAccount]:
        """Add a bank account to an employee."""
        employee = self.get(employee_id, company_id)
        if not employee:
            return None

        if data.is_primary:
            self.db.query(EmployeeBankAccount).filter(
                EmployeeBankAccount.employee_id == employee_id,
            ).update({"is_primary": False})

        account = EmployeeBankAccount(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def update_bank_account(
        self, account_id: int, data: EmployeeBankAccountUpdate, company_id: int, user_id: int
    ) -> Optional[EmployeeBankAccount]:
        """Update a bank account."""
        account = self.db.query(EmployeeBankAccount).filter(
            EmployeeBankAccount.id == account_id,
            EmployeeBankAccount.company_id == company_id,
        ).first()

        if not account:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(account, field, value)

        account.updated_by = user_id
        self.db.commit()
        self.db.refresh(account)
        return account

    # Skill Management
    def add_skill(
        self, employee_id: int, data: EmployeeSkillCreate, company_id: int, user_id: int
    ) -> Optional[EmployeeSkill]:
        """Add a skill to an employee."""
        employee = self.get(employee_id, company_id)
        if not employee:
            return None

        skill = EmployeeSkill(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(skill)
        self.db.commit()
        self.db.refresh(skill)
        return skill

    def update_skill(
        self, skill_id: int, data: EmployeeSkillUpdate, company_id: int, user_id: int
    ) -> Optional[EmployeeSkill]:
        """Update a skill."""
        skill = self.db.query(EmployeeSkill).filter(
            EmployeeSkill.id == skill_id,
            EmployeeSkill.company_id == company_id,
        ).first()

        if not skill:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(skill, field, value)

        skill.updated_by = user_id
        self.db.commit()
        self.db.refresh(skill)
        return skill

    # Certification Management
    def add_certification(
        self, employee_id: int, data: EmployeeCertificationCreate, company_id: int, user_id: int
    ) -> Optional[EmployeeCertification]:
        """Add a certification to an employee."""
        employee = self.get(employee_id, company_id)
        if not employee:
            return None

        cert = EmployeeCertification(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(cert)
        self.db.commit()
        self.db.refresh(cert)
        return cert

    # Education Management
    def add_education(
        self, employee_id: int, data: EmployeeEducationCreate, company_id: int, user_id: int
    ) -> Optional[EmployeeEducation]:
        """Add education to an employee."""
        employee = self.get(employee_id, company_id)
        if not employee:
            return None

        edu = EmployeeEducation(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(edu)
        self.db.commit()
        self.db.refresh(edu)
        return edu

    # Experience Management
    def add_experience(
        self, employee_id: int, data: EmployeeExperienceCreate, company_id: int, user_id: int
    ) -> Optional[EmployeeExperience]:
        """Add work experience to an employee."""
        employee = self.get(employee_id, company_id)
        if not employee:
            return None

        exp = EmployeeExperience(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)
        return exp

    # Emergency Contact Management
    def add_emergency_contact(
        self, employee_id: int, data: EmployeeEmergencyContactCreate, company_id: int, user_id: int
    ) -> Optional[EmployeeEmergencyContact]:
        """Add emergency contact to an employee."""
        employee = self.get(employee_id, company_id)
        if not employee:
            return None

        if data.is_primary:
            self.db.query(EmployeeEmergencyContact).filter(
                EmployeeEmergencyContact.employee_id == employee_id,
            ).update({"is_primary": False})

        contact = EmployeeEmergencyContact(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(contact)
        self.db.commit()
        self.db.refresh(contact)
        return contact

    # Dependent Management
    def add_dependent(
        self, employee_id: int, data: EmployeeDependentCreate, company_id: int, user_id: int
    ) -> Optional[EmployeeDependent]:
        """Add a dependent to an employee."""
        employee = self.get(employee_id, company_id)
        if not employee:
            return None

        dependent = EmployeeDependent(
            **data.model_dump(),
            employee_id=employee_id,
            company_id=company_id,
            created_by=user_id,
        )
        self.db.add(dependent)
        self.db.commit()
        self.db.refresh(dependent)
        return dependent

    # Generic delete for child records
    def delete_child_record(self, model_class, record_id: int, company_id: int) -> bool:
        """Delete a child record (contact, document, skill, etc.)."""
        record = self.db.query(model_class).filter(
            model_class.id == record_id,
            model_class.company_id == company_id,
        ).first()

        if not record:
            return False

        self.db.delete(record)
        self.db.commit()
        return True
