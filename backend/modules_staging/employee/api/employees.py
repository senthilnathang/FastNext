"""
Employee API Routes

CRUD operations for employees and related entities.
Uses the CRUD Framework (EmployeeServiceV2) for standardized operations.
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..services.employee_service_v2 import (
    EmployeeServiceV2,
    EmployeeDocumentService,
    EmployeeSkillService,
    get_employee_service,
)
from ..models.employee import (
    Employee,
    EmployeeContact, EmployeeDocument, EmployeeBankAccount,
    EmployeeSkill, EmployeeCertification, EmployeeEducation,
    EmployeeExperience, EmployeeEmergencyContact, EmployeeDependent
)
from ..schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeList, EmployeeSummary,
    EmployeeContactCreate, EmployeeContactUpdate, EmployeeContactResponse,
    EmployeeDocumentCreate, EmployeeDocumentUpdate, EmployeeDocumentResponse,
    EmployeeBankAccountCreate, EmployeeBankAccountUpdate, EmployeeBankAccountResponse,
    EmployeeSkillCreate, EmployeeSkillUpdate, EmployeeSkillResponse,
    EmployeeCertificationCreate, EmployeeCertificationResponse,
    EmployeeEducationCreate, EmployeeEducationResponse,
    EmployeeExperienceCreate, EmployeeExperienceResponse,
    EmployeeEmergencyContactCreate, EmployeeEmergencyContactResponse,
    EmployeeDependentCreate, EmployeeDependentResponse,
)

# Import base services for child models
from modules.base.services import BaseModelService

router = APIRouter(tags=["Employees"])  # No prefix - module mounted at /employee


# =============================================================================
# DEPENDENCY INJECTION
# =============================================================================

def get_service(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EmployeeServiceV2:
    """
    Get EmployeeServiceV2 with user context.

    The service is automatically scoped to the user's company
    and includes user_id for audit trails.
    """
    return get_employee_service(
        db=db,
        user_id=current_user.id,
        company_id=current_user.current_company_id,
    )


def get_document_service(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EmployeeDocumentService:
    """Get EmployeeDocumentService with user context."""
    return EmployeeDocumentService(db, {
        'user_id': current_user.id,
        'company_id': current_user.current_company_id,
    })


def get_skill_service(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EmployeeSkillService:
    """Get EmployeeSkillService with user context."""
    return EmployeeSkillService(db, {
        'user_id': current_user.id,
        'company_id': current_user.current_company_id,
    })


def get_child_service(model_class, db: Session, current_user: User):
    """Get a generic service for child models."""
    return BaseModelService(db, model_class, {
        'user_id': current_user.id,
        'company_id': current_user.current_company_id,
    })


# =============================================================================
# EMPLOYEE CRUD ENDPOINTS
# =============================================================================

@router.get("/", response_model=EmployeeList)
@router.get("/list", response_model=EmployeeList)
def list_employees(
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    job_position_id: Optional[int] = None,
    employee_type_id: Optional[int] = None,
    reporting_manager_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    is_manager: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: EmployeeServiceV2 = Depends(get_service),
):
    """List employees with filtering and pagination."""
    employees, total = service.search_employees(
        search=search,
        department_id=department_id,
        job_position_id=job_position_id,
        employee_type_id=employee_type_id,
        reporting_manager_id=reporting_manager_id,
        is_active=is_active,
        is_manager=is_manager,
        offset=skip,
        limit=limit,
    )

    items = [
        EmployeeSummary(
            id=e.id,
            employee_number=e.employee_number,
            full_name=e.full_name,
            display_name=e.display_name,
            work_email=e.work_email,
            avatar_url=e.avatar_url,
            department_id=e.department_id,
            job_position_id=e.job_position_id,
            is_active=e.is_active,
        )
        for e in employees
    ]

    return EmployeeList(items=items, total=total, page=skip // limit + 1, page_size=limit)


@router.get("/me", response_model=EmployeeResponse)
def get_my_profile(
    service: EmployeeServiceV2 = Depends(get_service),
    current_user: User = Depends(get_current_user),
):
    """Get current user's employee profile."""
    employee = service.get_by_user_id(current_user.id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return employee


@router.get("/directory", response_model=List[EmployeeSummary])
def get_directory(
    department_id: Optional[int] = None,
    service: EmployeeServiceV2 = Depends(get_service),
):
    """Get employee directory."""
    domain = [('is_active', '=', True)]
    if department_id:
        domain.append(('department_id', '=', department_id))

    employees = service.search(domain, limit=1000)

    return [
        EmployeeSummary(
            id=e.id,
            employee_number=e.employee_number,
            full_name=e.full_name,
            display_name=e.display_name,
            work_email=e.work_email,
            avatar_url=e.avatar_url,
            department_id=e.department_id,
            job_position_id=e.job_position_id,
            is_active=e.is_active,
        )
        for e in employees
    ]


@router.get("/org-chart")
def get_org_chart(
    root_id: Optional[int] = None,
    service: EmployeeServiceV2 = Depends(get_service),
):
    """Get organization chart."""
    return service.get_org_chart(root_id)


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    service: EmployeeServiceV2 = Depends(get_service),
):
    """Get an employee by ID."""
    employee = service.get_by_id(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.post("/", response_model=EmployeeResponse, status_code=201)
def create_employee(
    data: EmployeeCreate,
    service: EmployeeServiceV2 = Depends(get_service),
):
    """Create a new employee."""
    # Check for duplicate employee number
    existing = service.get_by_employee_number(data.employee_number)
    if existing:
        raise HTTPException(status_code=400, detail="Employee number already exists")

    # Create using the CRUD framework
    result = service.create(data.model_dump())
    return result.ensure_one()


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    service: EmployeeServiceV2 = Depends(get_service),
):
    """Update an employee."""
    # Check if employee exists
    if not service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    # Update using the CRUD framework
    service.write(employee_id, data.model_dump(exclude_unset=True))
    return service.get_by_id(employee_id)


@router.delete("/{employee_id}", status_code=204)
def delete_employee(
    employee_id: int,
    service: EmployeeServiceV2 = Depends(get_service),
):
    """Delete an employee (soft delete)."""
    if not service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    service.unlink(employee_id)
    return None


@router.get("/{employee_id}/direct-reports", response_model=List[EmployeeSummary])
def get_direct_reports(
    employee_id: int,
    service: EmployeeServiceV2 = Depends(get_service),
):
    """Get direct reports of an employee."""
    reports = service.get_direct_reports(employee_id)
    return [
        EmployeeSummary(
            id=e.id,
            employee_number=e.employee_number,
            full_name=e.full_name,
            display_name=e.display_name,
            work_email=e.work_email,
            avatar_url=e.avatar_url,
            department_id=e.department_id,
            job_position_id=e.job_position_id,
            is_active=e.is_active,
        )
        for e in reports
    ]


# =============================================================================
# CONTACT ROUTES
# =============================================================================

@router.post("/{employee_id}/contacts", response_model=EmployeeContactResponse, status_code=201)
def add_contact(
    employee_id: int,
    data: EmployeeContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    employee_service: EmployeeServiceV2 = Depends(get_service),
):
    """Add a contact to an employee."""
    # Verify employee exists
    if not employee_service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    contact_service = get_child_service(EmployeeContact, db, current_user)

    # If primary, unset other primary contacts of same type
    if data.is_primary:
        existing_primary = contact_service.search([
            ('employee_id', '=', employee_id),
            ('contact_type', '=', data.contact_type),
            ('is_primary', '=', True),
        ])
        if existing_primary:
            contact_service.write(existing_primary.ids, {'is_primary': False})

    # Create contact
    vals = data.model_dump()
    vals['employee_id'] = employee_id
    result = contact_service.create(vals)
    return result.ensure_one()


@router.put("/contacts/{contact_id}", response_model=EmployeeContactResponse)
def update_contact(
    contact_id: int,
    data: EmployeeContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a contact."""
    contact_service = get_child_service(EmployeeContact, db, current_user)

    if not contact_service.exists(contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")

    contact_service.write(contact_id, data.model_dump(exclude_unset=True))
    return contact_service.get_by_id(contact_id)


@router.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a contact."""
    contact_service = get_child_service(EmployeeContact, db, current_user)

    if not contact_service.exists(contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")

    contact_service.unlink(contact_id, hard_delete=True)
    return None


# =============================================================================
# DOCUMENT ROUTES
# =============================================================================

@router.post("/{employee_id}/documents", response_model=EmployeeDocumentResponse, status_code=201)
def add_document(
    employee_id: int,
    data: EmployeeDocumentCreate,
    employee_service: EmployeeServiceV2 = Depends(get_service),
    doc_service: EmployeeDocumentService = Depends(get_document_service),
):
    """Add a document to an employee."""
    if not employee_service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    vals = data.model_dump()
    vals['employee_id'] = employee_id
    result = doc_service.create(vals)
    return result.ensure_one()


@router.put("/documents/{document_id}", response_model=EmployeeDocumentResponse)
def update_document(
    document_id: int,
    data: EmployeeDocumentUpdate,
    doc_service: EmployeeDocumentService = Depends(get_document_service),
):
    """Update a document."""
    if not doc_service.exists(document_id):
        raise HTTPException(status_code=404, detail="Document not found")

    doc_service.write(document_id, data.model_dump(exclude_unset=True))
    return doc_service.get_by_id(document_id)


@router.post("/documents/{document_id}/verify", response_model=EmployeeDocumentResponse)
def verify_document(
    document_id: int,
    notes: Optional[str] = None,
    doc_service: EmployeeDocumentService = Depends(get_document_service),
):
    """Verify a document."""
    if not doc_service.exists(document_id):
        raise HTTPException(status_code=404, detail="Document not found")

    doc_service.verify(document_id, notes)
    return doc_service.get_by_id(document_id)


@router.get("/documents/expiring", response_model=List[EmployeeDocumentResponse])
def get_expiring_documents(
    days_ahead: int = Query(30, ge=1, le=365),
    doc_service: EmployeeDocumentService = Depends(get_document_service),
):
    """Get documents expiring within specified days."""
    return list(doc_service.get_expiring_soon(days_ahead))


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    doc_service: EmployeeDocumentService = Depends(get_document_service),
):
    """Delete a document."""
    if not doc_service.exists(document_id):
        raise HTTPException(status_code=404, detail="Document not found")

    doc_service.unlink(document_id, hard_delete=True)
    return None


# =============================================================================
# BANK ACCOUNT ROUTES
# =============================================================================

@router.post("/{employee_id}/bank-accounts", response_model=EmployeeBankAccountResponse, status_code=201)
def add_bank_account(
    employee_id: int,
    data: EmployeeBankAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    employee_service: EmployeeServiceV2 = Depends(get_service),
):
    """Add a bank account to an employee."""
    if not employee_service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    bank_service = get_child_service(EmployeeBankAccount, db, current_user)

    # If primary, unset other primary accounts
    if data.is_primary:
        existing_primary = bank_service.search([
            ('employee_id', '=', employee_id),
            ('is_primary', '=', True),
        ])
        if existing_primary:
            bank_service.write(existing_primary.ids, {'is_primary': False})

    vals = data.model_dump()
    vals['employee_id'] = employee_id
    result = bank_service.create(vals)
    return result.ensure_one()


@router.put("/bank-accounts/{account_id}", response_model=EmployeeBankAccountResponse)
def update_bank_account(
    account_id: int,
    data: EmployeeBankAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a bank account."""
    bank_service = get_child_service(EmployeeBankAccount, db, current_user)

    if not bank_service.exists(account_id):
        raise HTTPException(status_code=404, detail="Bank account not found")

    bank_service.write(account_id, data.model_dump(exclude_unset=True))
    return bank_service.get_by_id(account_id)


@router.delete("/bank-accounts/{account_id}", status_code=204)
def delete_bank_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a bank account."""
    bank_service = get_child_service(EmployeeBankAccount, db, current_user)

    if not bank_service.exists(account_id):
        raise HTTPException(status_code=404, detail="Bank account not found")

    bank_service.unlink(account_id, hard_delete=True)
    return None


# =============================================================================
# SKILL ROUTES
# =============================================================================

@router.post("/{employee_id}/skills", response_model=EmployeeSkillResponse, status_code=201)
def add_skill(
    employee_id: int,
    data: EmployeeSkillCreate,
    employee_service: EmployeeServiceV2 = Depends(get_service),
    skill_service: EmployeeSkillService = Depends(get_skill_service),
):
    """Add a skill to an employee."""
    if not employee_service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    vals = data.model_dump()
    vals['employee_id'] = employee_id
    result = skill_service.create(vals)
    return result.ensure_one()


@router.put("/skills/{skill_id}", response_model=EmployeeSkillResponse)
def update_skill(
    skill_id: int,
    data: EmployeeSkillUpdate,
    skill_service: EmployeeSkillService = Depends(get_skill_service),
):
    """Update a skill."""
    if not skill_service.exists(skill_id):
        raise HTTPException(status_code=404, detail="Skill not found")

    skill_service.write(skill_id, data.model_dump(exclude_unset=True))
    return skill_service.get_by_id(skill_id)


@router.delete("/skills/{skill_id}", status_code=204)
def delete_skill(
    skill_id: int,
    skill_service: EmployeeSkillService = Depends(get_skill_service),
):
    """Delete a skill."""
    if not skill_service.exists(skill_id):
        raise HTTPException(status_code=404, detail="Skill not found")

    skill_service.unlink(skill_id, hard_delete=True)
    return None


# =============================================================================
# CERTIFICATION ROUTES
# =============================================================================

@router.post("/{employee_id}/certifications", response_model=EmployeeCertificationResponse, status_code=201)
def add_certification(
    employee_id: int,
    data: EmployeeCertificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    employee_service: EmployeeServiceV2 = Depends(get_service),
):
    """Add a certification to an employee."""
    if not employee_service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    cert_service = get_child_service(EmployeeCertification, db, current_user)

    vals = data.model_dump()
    vals['employee_id'] = employee_id
    result = cert_service.create(vals)
    return result.ensure_one()


@router.delete("/certifications/{cert_id}", status_code=204)
def delete_certification(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a certification."""
    cert_service = get_child_service(EmployeeCertification, db, current_user)

    if not cert_service.exists(cert_id):
        raise HTTPException(status_code=404, detail="Certification not found")

    cert_service.unlink(cert_id, hard_delete=True)
    return None


# =============================================================================
# EDUCATION ROUTES
# =============================================================================

@router.post("/{employee_id}/education", response_model=EmployeeEducationResponse, status_code=201)
def add_education(
    employee_id: int,
    data: EmployeeEducationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    employee_service: EmployeeServiceV2 = Depends(get_service),
):
    """Add education to an employee."""
    if not employee_service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    edu_service = get_child_service(EmployeeEducation, db, current_user)

    vals = data.model_dump()
    vals['employee_id'] = employee_id
    result = edu_service.create(vals)
    return result.ensure_one()


@router.delete("/education/{edu_id}", status_code=204)
def delete_education(
    edu_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete education."""
    edu_service = get_child_service(EmployeeEducation, db, current_user)

    if not edu_service.exists(edu_id):
        raise HTTPException(status_code=404, detail="Education not found")

    edu_service.unlink(edu_id, hard_delete=True)
    return None


# =============================================================================
# EXPERIENCE ROUTES
# =============================================================================

@router.post("/{employee_id}/experience", response_model=EmployeeExperienceResponse, status_code=201)
def add_experience(
    employee_id: int,
    data: EmployeeExperienceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    employee_service: EmployeeServiceV2 = Depends(get_service),
):
    """Add experience to an employee."""
    if not employee_service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    exp_service = get_child_service(EmployeeExperience, db, current_user)

    vals = data.model_dump()
    vals['employee_id'] = employee_id
    result = exp_service.create(vals)
    return result.ensure_one()


@router.delete("/experience/{exp_id}", status_code=204)
def delete_experience(
    exp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete experience."""
    exp_service = get_child_service(EmployeeExperience, db, current_user)

    if not exp_service.exists(exp_id):
        raise HTTPException(status_code=404, detail="Experience not found")

    exp_service.unlink(exp_id, hard_delete=True)
    return None


# =============================================================================
# EMERGENCY CONTACT ROUTES
# =============================================================================

@router.post("/{employee_id}/emergency-contacts", response_model=EmployeeEmergencyContactResponse, status_code=201)
def add_emergency_contact(
    employee_id: int,
    data: EmployeeEmergencyContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    employee_service: EmployeeServiceV2 = Depends(get_service),
):
    """Add an emergency contact to an employee."""
    if not employee_service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    ec_service = get_child_service(EmployeeEmergencyContact, db, current_user)

    # If primary, unset other primary contacts
    if data.is_primary:
        existing_primary = ec_service.search([
            ('employee_id', '=', employee_id),
            ('is_primary', '=', True),
        ])
        if existing_primary:
            ec_service.write(existing_primary.ids, {'is_primary': False})

    vals = data.model_dump()
    vals['employee_id'] = employee_id
    result = ec_service.create(vals)
    return result.ensure_one()


@router.delete("/emergency-contacts/{contact_id}", status_code=204)
def delete_emergency_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an emergency contact."""
    ec_service = get_child_service(EmployeeEmergencyContact, db, current_user)

    if not ec_service.exists(contact_id):
        raise HTTPException(status_code=404, detail="Emergency contact not found")

    ec_service.unlink(contact_id, hard_delete=True)
    return None


# =============================================================================
# DEPENDENT ROUTES
# =============================================================================

@router.post("/{employee_id}/dependents", response_model=EmployeeDependentResponse, status_code=201)
def add_dependent(
    employee_id: int,
    data: EmployeeDependentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    employee_service: EmployeeServiceV2 = Depends(get_service),
):
    """Add a dependent to an employee."""
    if not employee_service.exists(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")

    dep_service = get_child_service(EmployeeDependent, db, current_user)

    vals = data.model_dump()
    vals['employee_id'] = employee_id
    result = dep_service.create(vals)
    return result.ensure_one()


@router.delete("/dependents/{dependent_id}", status_code=204)
def delete_dependent(
    dependent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a dependent."""
    dep_service = get_child_service(EmployeeDependent, db, current_user)

    if not dep_service.exists(dependent_id):
        raise HTTPException(status_code=404, detail="Dependent not found")

    dep_service.unlink(dependent_id, hard_delete=True)
    return None
