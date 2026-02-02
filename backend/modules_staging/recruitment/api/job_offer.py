"""
Job Offer API Routes

CRUD operations for job offer management.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.advanced import JobOffer, OfferNegotiation, HiringApproval


router = APIRouter(tags=["Job Offers"])


def get_db_session(db: Session = Depends(get_db)) -> Session:
    return db


# =============================================================================
# Pydantic Schemas
# =============================================================================

class JobOfferBase(BaseModel):
    job_title: str
    department_id: Optional[int] = None
    employment_type: str = "full_time"
    work_location: Optional[str] = None
    reporting_to_id: Optional[int] = None
    base_salary: Decimal
    salary_currency: str = "USD"
    salary_frequency: str = "annual"
    bonus_amount: Optional[Decimal] = None
    bonus_type: Optional[str] = None
    equity_grant: Optional[str] = None
    benefits: List[str] = Field(default_factory=list)
    start_date: date
    offer_expiry_date: Optional[date] = None
    probation_period_months: int = 3
    terms_and_conditions: Optional[str] = None
    special_conditions: Optional[str] = None


class JobOfferCreate(JobOfferBase):
    candidate_id: int
    recruitment_id: int


class JobOfferUpdate(BaseModel):
    job_title: Optional[str] = None
    department_id: Optional[int] = None
    employment_type: Optional[str] = None
    work_location: Optional[str] = None
    reporting_to_id: Optional[int] = None
    base_salary: Optional[Decimal] = None
    salary_currency: Optional[str] = None
    salary_frequency: Optional[str] = None
    bonus_amount: Optional[Decimal] = None
    bonus_type: Optional[str] = None
    equity_grant: Optional[str] = None
    benefits: Optional[List[str]] = None
    start_date: Optional[date] = None
    offer_expiry_date: Optional[date] = None
    probation_period_months: Optional[int] = None
    terms_and_conditions: Optional[str] = None
    special_conditions: Optional[str] = None
    is_active: Optional[bool] = None


class JobOfferResponse(JobOfferBase):
    id: int
    candidate_id: int
    recruitment_id: int
    status: str = "draft"
    offer_letter_file: Optional[str] = None
    signed_offer_file: Optional[str] = None
    created_by_id: Optional[int] = None
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    candidate_response: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class JobOfferList(BaseModel):
    items: List[JobOfferResponse]
    total: int
    page: int
    page_size: int


class SendOfferRequest(BaseModel):
    offer_letter_file: Optional[str] = None


class RespondOfferRequest(BaseModel):
    response: str  # "accepted" or "declined"
    response_text: Optional[str] = None


class NegotiationBase(BaseModel):
    initiated_by: str  # "candidate" or "employer"
    original_value: Dict[str, Any] = Field(default_factory=dict)
    proposed_value: Dict[str, Any] = Field(default_factory=dict)
    negotiation_notes: Optional[str] = None


class NegotiationCreate(NegotiationBase):
    pass


class NegotiationResponse(NegotiationBase):
    id: int
    offer_id: int
    is_accepted: Optional[bool] = None
    responded_by_id: Optional[int] = None
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NegotiationRespondRequest(BaseModel):
    is_accepted: bool
    response_notes: Optional[str] = None


class ApprovalBase(BaseModel):
    approval_type: str
    request_notes: Optional[str] = None
    due_date: Optional[datetime] = None


class ApprovalCreate(ApprovalBase):
    assigned_to_id: int
    candidate_id: Optional[int] = None


class ApprovalResponse(ApprovalBase):
    id: int
    recruitment_id: int
    candidate_id: Optional[int] = None
    offer_id: Optional[int] = None
    requested_by_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    status: str = "pending"
    response_notes: Optional[str] = None
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApprovalList(BaseModel):
    items: List[ApprovalResponse]
    total: int
    page: int
    page_size: int


class ApprovalDecisionRequest(BaseModel):
    decision: str  # "approved" or "rejected"
    response_notes: Optional[str] = None


# =============================================================================
# Job Offer List Endpoints (MUST be first)
# =============================================================================

@router.get("/", response_model=JobOfferList)
@router.get("/list", response_model=JobOfferList)
def list_job_offers(
    candidate_id: Optional[int] = None,
    recruitment_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List job offers with filters."""
    query = db.query(JobOffer).filter(
        JobOffer.company_id == current_user.current_company_id,
        JobOffer.is_deleted == False,
    )

    if candidate_id:
        query = query.filter(JobOffer.candidate_id == candidate_id)
    if recruitment_id:
        query = query.filter(JobOffer.recruitment_id == recruitment_id)
    if status:
        query = query.filter(JobOffer.status == status)

    total = query.count()
    offers = query.order_by(JobOffer.created_at.desc()).offset(skip).limit(limit).all()

    return JobOfferList(
        items=offers,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/", response_model=JobOfferResponse, status_code=201)
def create_job_offer(
    data: JobOfferCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new job offer."""
    # Get employee_id for created_by
    from modules.employee.models.employee import Employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.company_id == current_user.current_company_id,
    ).first()

    offer = JobOffer(
        candidate_id=data.candidate_id,
        recruitment_id=data.recruitment_id,
        job_title=data.job_title,
        department_id=data.department_id,
        employment_type=data.employment_type,
        work_location=data.work_location,
        reporting_to_id=data.reporting_to_id,
        base_salary=data.base_salary,
        salary_currency=data.salary_currency,
        salary_frequency=data.salary_frequency,
        bonus_amount=data.bonus_amount,
        bonus_type=data.bonus_type,
        equity_grant=data.equity_grant,
        benefits=data.benefits,
        start_date=data.start_date,
        offer_expiry_date=data.offer_expiry_date,
        probation_period_months=data.probation_period_months,
        terms_and_conditions=data.terms_and_conditions,
        special_conditions=data.special_conditions,
        status="draft",
        created_by_id=employee.id if employee else None,
        company_id=current_user.current_company_id,
        created_by=current_user.id,
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


@router.get("/stats")
def get_offer_stats(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get job offer statistics."""
    query = db.query(JobOffer).filter(
        JobOffer.company_id == current_user.current_company_id,
        JobOffer.is_deleted == False,
    )

    if start_date:
        query = query.filter(JobOffer.created_at >= start_date)
    if end_date:
        query = query.filter(JobOffer.created_at <= end_date)

    total = query.count()
    draft = query.filter(JobOffer.status == "draft").count()
    pending_approval = query.filter(JobOffer.status == "pending_approval").count()
    approved = query.filter(JobOffer.status == "approved").count()
    sent = query.filter(JobOffer.status == "sent").count()
    accepted = query.filter(JobOffer.status == "accepted").count()
    declined = query.filter(JobOffer.status == "declined").count()
    expired = query.filter(JobOffer.status == "expired").count()
    withdrawn = query.filter(JobOffer.status == "withdrawn").count()

    acceptance_rate = (accepted / (accepted + declined) * 100) if (accepted + declined) > 0 else 0

    return {
        "total": total,
        "by_status": {
            "draft": draft,
            "pending_approval": pending_approval,
            "approved": approved,
            "sent": sent,
            "accepted": accepted,
            "declined": declined,
            "expired": expired,
            "withdrawn": withdrawn,
        },
        "acceptance_rate": round(acceptance_rate, 2),
    }


# =============================================================================
# Approval Endpoints
# =============================================================================

@router.get("/approvals", response_model=ApprovalList)
def list_approvals(
    status: Optional[str] = None,
    approval_type: Optional[str] = None,
    assigned_to_me: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List hiring approvals."""
    query = db.query(HiringApproval).filter(
        HiringApproval.company_id == current_user.current_company_id,
        HiringApproval.is_deleted == False,
    )

    if status:
        query = query.filter(HiringApproval.status == status)
    if approval_type:
        query = query.filter(HiringApproval.approval_type == approval_type)

    if assigned_to_me:
        from modules.employee.models.employee import Employee
        employee = db.query(Employee).filter(
            Employee.user_id == current_user.id,
            Employee.company_id == current_user.current_company_id,
        ).first()
        if employee:
            query = query.filter(HiringApproval.assigned_to_id == employee.id)

    total = query.count()
    approvals = query.order_by(HiringApproval.created_at.desc()).offset(skip).limit(limit).all()

    return ApprovalList(
        items=approvals,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/approvals/{approval_id}/decision", response_model=ApprovalResponse)
def make_approval_decision(
    approval_id: int,
    data: ApprovalDecisionRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Make a decision on an approval request."""
    approval = db.query(HiringApproval).filter(
        HiringApproval.id == approval_id,
        HiringApproval.company_id == current_user.current_company_id,
        HiringApproval.is_deleted == False,
    ).first()

    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval.status != "pending":
        raise HTTPException(status_code=400, detail="Approval already processed")

    approval.status = data.decision
    approval.response_notes = data.response_notes
    approval.responded_at = datetime.utcnow()

    # If this is an offer approval and approved, update offer status
    if approval.offer_id and data.decision == "approved":
        offer = db.query(JobOffer).filter(JobOffer.id == approval.offer_id).first()
        if offer:
            from modules.employee.models.employee import Employee
            employee = db.query(Employee).filter(
                Employee.user_id == current_user.id,
                Employee.company_id == current_user.current_company_id,
            ).first()
            offer.status = "approved"
            offer.approved_at = datetime.utcnow()
            offer.approved_by_id = employee.id if employee else None

    db.commit()
    db.refresh(approval)
    return approval


# =============================================================================
# Single Job Offer Endpoints (with {offer_id} - MUST be last)
# =============================================================================

@router.get("/{offer_id}", response_model=JobOfferResponse)
def get_job_offer(
    offer_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get job offer by ID."""
    offer = db.query(JobOffer).filter(
        JobOffer.id == offer_id,
        JobOffer.company_id == current_user.current_company_id,
        JobOffer.is_deleted == False,
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")
    return offer


@router.put("/{offer_id}", response_model=JobOfferResponse)
def update_job_offer(
    offer_id: int,
    data: JobOfferUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update a job offer."""
    offer = db.query(JobOffer).filter(
        JobOffer.id == offer_id,
        JobOffer.company_id == current_user.current_company_id,
        JobOffer.is_deleted == False,
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    if offer.status not in ["draft", "pending_approval"]:
        raise HTTPException(status_code=400, detail="Cannot update offer in current status")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(offer, key, value)

    offer.updated_by = current_user.id
    db.commit()
    db.refresh(offer)
    return offer


@router.delete("/{offer_id}", status_code=204)
def delete_job_offer(
    offer_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a job offer."""
    offer = db.query(JobOffer).filter(
        JobOffer.id == offer_id,
        JobOffer.company_id == current_user.current_company_id,
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    offer.is_deleted = True
    offer.deleted_by = current_user.id
    offer.deleted_at = datetime.utcnow()
    db.commit()
    return None


@router.post("/{offer_id}/submit-for-approval", response_model=JobOfferResponse)
def submit_offer_for_approval(
    offer_id: int,
    data: ApprovalCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Submit job offer for approval."""
    offer = db.query(JobOffer).filter(
        JobOffer.id == offer_id,
        JobOffer.company_id == current_user.current_company_id,
        JobOffer.is_deleted == False,
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    if offer.status != "draft":
        raise HTTPException(status_code=400, detail="Offer is not in draft status")

    # Get employee_id
    from modules.employee.models.employee import Employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.company_id == current_user.current_company_id,
    ).first()

    # Create approval request
    approval = HiringApproval(
        approval_type=data.approval_type or "offer",
        recruitment_id=offer.recruitment_id,
        candidate_id=data.candidate_id or offer.candidate_id,
        offer_id=offer_id,
        requested_by_id=employee.id if employee else None,
        assigned_to_id=data.assigned_to_id,
        request_notes=data.request_notes,
        due_date=data.due_date,
        status="pending",
        company_id=current_user.current_company_id,
        created_by=current_user.id,
    )
    db.add(approval)

    offer.status = "pending_approval"
    offer.updated_by = current_user.id

    db.commit()
    db.refresh(offer)
    return offer


@router.post("/{offer_id}/send", response_model=JobOfferResponse)
def send_job_offer(
    offer_id: int,
    data: SendOfferRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Send job offer to candidate."""
    offer = db.query(JobOffer).filter(
        JobOffer.id == offer_id,
        JobOffer.company_id == current_user.current_company_id,
        JobOffer.is_deleted == False,
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    if offer.status != "approved":
        raise HTTPException(status_code=400, detail="Offer must be approved before sending")

    offer.status = "sent"
    offer.sent_at = datetime.utcnow()
    if data.offer_letter_file:
        offer.offer_letter_file = data.offer_letter_file
    offer.updated_by = current_user.id

    db.commit()
    db.refresh(offer)
    return offer


@router.post("/{offer_id}/respond", response_model=JobOfferResponse)
def respond_to_offer(
    offer_id: int,
    data: RespondOfferRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Candidate response to job offer."""
    offer = db.query(JobOffer).filter(
        JobOffer.id == offer_id,
        JobOffer.company_id == current_user.current_company_id,
        JobOffer.is_deleted == False,
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    if offer.status != "sent":
        raise HTTPException(status_code=400, detail="Offer has not been sent")

    offer.status = data.response
    offer.responded_at = datetime.utcnow()
    offer.candidate_response = data.response_text
    offer.updated_by = current_user.id

    # If accepted, update candidate status
    if data.response == "accepted":
        from ..models.recruitment import Candidate
        candidate = db.query(Candidate).filter(
            Candidate.id == offer.candidate_id
        ).first()
        if candidate:
            candidate.hired = True
            candidate.hired_date = date.today()
            candidate.offer_letter_status = "accepted"

    db.commit()
    db.refresh(offer)
    return offer


@router.post("/{offer_id}/withdraw", response_model=JobOfferResponse)
def withdraw_job_offer(
    offer_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Withdraw a job offer."""
    offer = db.query(JobOffer).filter(
        JobOffer.id == offer_id,
        JobOffer.company_id == current_user.current_company_id,
        JobOffer.is_deleted == False,
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    if offer.status in ["accepted", "declined", "withdrawn"]:
        raise HTTPException(status_code=400, detail="Cannot withdraw offer in current status")

    offer.status = "withdrawn"
    if reason:
        offer.special_conditions = f"Withdrawn: {reason}"
    offer.updated_by = current_user.id

    db.commit()
    db.refresh(offer)
    return offer


# =============================================================================
# Negotiation Endpoints
# =============================================================================

@router.get("/{offer_id}/negotiations", response_model=List[NegotiationResponse])
def list_negotiations(
    offer_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List negotiations for a job offer."""
    offer = db.query(JobOffer).filter(
        JobOffer.id == offer_id,
        JobOffer.company_id == current_user.current_company_id,
        JobOffer.is_deleted == False,
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    return db.query(OfferNegotiation).filter(
        OfferNegotiation.offer_id == offer_id,
        OfferNegotiation.is_deleted == False,
    ).order_by(OfferNegotiation.created_at).all()


@router.post("/{offer_id}/negotiations", response_model=NegotiationResponse, status_code=201)
def create_negotiation(
    offer_id: int,
    data: NegotiationCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Start a negotiation on a job offer."""
    offer = db.query(JobOffer).filter(
        JobOffer.id == offer_id,
        JobOffer.company_id == current_user.current_company_id,
        JobOffer.is_deleted == False,
    ).first()

    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    if offer.status not in ["sent", "negotiating"]:
        raise HTTPException(status_code=400, detail="Cannot negotiate offer in current status")

    negotiation = OfferNegotiation(
        offer_id=offer_id,
        initiated_by=data.initiated_by,
        original_value=data.original_value,
        proposed_value=data.proposed_value,
        negotiation_notes=data.negotiation_notes,
        company_id=current_user.current_company_id,
        created_by=current_user.id,
    )
    db.add(negotiation)

    offer.status = "negotiating"
    offer.updated_by = current_user.id

    db.commit()
    db.refresh(negotiation)
    return negotiation


@router.post("/{offer_id}/negotiations/{negotiation_id}/respond", response_model=NegotiationResponse)
def respond_to_negotiation(
    offer_id: int,
    negotiation_id: int,
    data: NegotiationRespondRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Respond to a negotiation."""
    negotiation = db.query(OfferNegotiation).filter(
        OfferNegotiation.id == negotiation_id,
        OfferNegotiation.offer_id == offer_id,
        OfferNegotiation.company_id == current_user.current_company_id,
        OfferNegotiation.is_deleted == False,
    ).first()

    if not negotiation:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    if negotiation.is_accepted is not None:
        raise HTTPException(status_code=400, detail="Negotiation already responded")

    from modules.employee.models.employee import Employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.company_id == current_user.current_company_id,
    ).first()

    negotiation.is_accepted = data.is_accepted
    if data.response_notes:
        negotiation.negotiation_notes = (negotiation.negotiation_notes or "") + f"\n\nResponse: {data.response_notes}"
    negotiation.responded_by_id = employee.id if employee else None
    negotiation.responded_at = datetime.utcnow()

    # If accepted, update offer with new values
    if data.is_accepted:
        offer = db.query(JobOffer).filter(JobOffer.id == offer_id).first()
        if offer and negotiation.proposed_value:
            for key, value in negotiation.proposed_value.items():
                if hasattr(offer, key):
                    setattr(offer, key, value)
            offer.status = "sent"  # Reset to sent after successful negotiation

    db.commit()
    db.refresh(negotiation)
    return negotiation
