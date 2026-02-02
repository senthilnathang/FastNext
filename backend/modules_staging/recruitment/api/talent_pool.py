"""
Talent Pool API Routes

CRUD operations for talent pool management.
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.api.deps import get_current_user, get_db
from app.models.user import User

from ..models.advanced import TalentPool, TalentPoolCandidate
from ..models.skill_zone import SkillZone, SkillZoneCandidate


router = APIRouter(tags=["Talent Pool"])


def get_db_session(db: Session = Depends(get_db)) -> Session:
    return db


# =============================================================================
# Pydantic Schemas
# =============================================================================

class TalentPoolBase(BaseModel):
    name: str
    description: Optional[str] = None
    pool_type: str = "general"
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    auto_add_criteria: Dict[str, Any] = Field(default_factory=dict)


class TalentPoolCreate(TalentPoolBase):
    owner_id: Optional[int] = None


class TalentPoolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    pool_type: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    auto_add_criteria: Optional[Dict[str, Any]] = None
    owner_id: Optional[int] = None
    is_active: Optional[bool] = None


class TalentPoolResponse(TalentPoolBase):
    id: int
    owner_id: Optional[int] = None
    is_active: bool = True
    candidate_count: int = 0

    class Config:
        from_attributes = True


class TalentPoolList(BaseModel):
    items: List[TalentPoolResponse]
    total: int
    page: int
    page_size: int


class TalentPoolCandidateBase(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: str = "active"


class TalentPoolCandidateCreate(TalentPoolCandidateBase):
    candidate_id: int
    source_recruitment_id: Optional[int] = None


class TalentPoolCandidateUpdate(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class TalentPoolCandidateResponse(TalentPoolCandidateBase):
    id: int
    pool_id: int
    candidate_id: int
    added_by_id: Optional[int] = None
    source_recruitment_id: Optional[int] = None
    last_contacted: Optional[datetime] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class TalentPoolCandidateList(BaseModel):
    items: List[TalentPoolCandidateResponse]
    total: int
    page: int
    page_size: int


class AddCandidatesToPoolRequest(BaseModel):
    candidate_ids: List[int]
    reason: Optional[str] = None
    source_recruitment_id: Optional[int] = None


class SkillZoneBase(BaseModel):
    title: str
    description: str


class SkillZoneCreate(SkillZoneBase):
    pass


class SkillZoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class SkillZoneResponse(SkillZoneBase):
    id: int
    is_active: bool = True
    candidate_count: int = 0

    class Config:
        from_attributes = True


class SkillZoneList(BaseModel):
    items: List[SkillZoneResponse]
    total: int
    page: int
    page_size: int


class SkillZoneCandidateCreate(BaseModel):
    candidate_id: int
    reason: str


class SkillZoneCandidateResponse(BaseModel):
    id: int
    skill_zone_id: int
    candidate_id: int
    reason: str
    added_on: Optional[date] = None
    is_active: bool = True

    class Config:
        from_attributes = True


# =============================================================================
# Talent Pool List Endpoints (MUST be first)
# =============================================================================

@router.get("/", response_model=TalentPoolList)
@router.get("/list", response_model=TalentPoolList)
def list_talent_pools(
    pool_type: Optional[str] = None,
    department_id: Optional[int] = None,
    job_position_id: Optional[int] = None,
    owner_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List talent pools with filters."""
    query = db.query(TalentPool).filter(
        TalentPool.company_id == current_user.current_company_id,
        TalentPool.is_deleted == False,
    )

    if pool_type:
        query = query.filter(TalentPool.pool_type == pool_type)
    if department_id:
        query = query.filter(TalentPool.department_id == department_id)
    if job_position_id:
        query = query.filter(TalentPool.job_position_id == job_position_id)
    if owner_id:
        query = query.filter(TalentPool.owner_id == owner_id)

    total = query.count()
    pools = query.order_by(TalentPool.name).offset(skip).limit(limit).all()

    # Add candidate count to each pool
    items = []
    for pool in pools:
        pool_dict = {
            "id": pool.id,
            "name": pool.name,
            "description": pool.description,
            "pool_type": pool.pool_type,
            "department_id": pool.department_id,
            "job_position_id": pool.job_position_id,
            "auto_add_criteria": pool.auto_add_criteria or {},
            "owner_id": pool.owner_id,
            "is_active": pool.is_active,
            "candidate_count": len(pool.pool_candidates) if pool.pool_candidates else 0
        }
        items.append(pool_dict)

    return TalentPoolList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/", response_model=TalentPoolResponse, status_code=201)
def create_talent_pool(
    data: TalentPoolCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new talent pool."""
    pool = TalentPool(
        name=data.name,
        description=data.description,
        pool_type=data.pool_type,
        department_id=data.department_id,
        job_position_id=data.job_position_id,
        auto_add_criteria=data.auto_add_criteria,
        owner_id=data.owner_id,
        company_id=current_user.current_company_id,
        created_by=current_user.id,
    )
    db.add(pool)
    db.commit()
    db.refresh(pool)
    return {
        **pool.__dict__,
        "candidate_count": 0
    }


# =============================================================================
# Skill Zone Endpoints
# =============================================================================

@router.get("/skill-zones", response_model=SkillZoneList)
def list_skill_zones(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List skill zones."""
    query = db.query(SkillZone).filter(
        SkillZone.company_id == current_user.current_company_id,
        SkillZone.is_deleted == False,
    )

    total = query.count()
    zones = query.order_by(SkillZone.title).offset(skip).limit(limit).all()

    items = []
    for zone in zones:
        zone_dict = {
            "id": zone.id,
            "title": zone.title,
            "description": zone.description,
            "is_active": zone.is_active,
            "candidate_count": len(zone.skill_zone_candidates) if zone.skill_zone_candidates else 0
        }
        items.append(zone_dict)

    return SkillZoneList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/skill-zones", response_model=SkillZoneResponse, status_code=201)
def create_skill_zone(
    data: SkillZoneCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new skill zone."""
    zone = SkillZone(
        title=data.title,
        description=data.description,
        company_id=current_user.current_company_id,
        created_by=current_user.id,
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return {
        **zone.__dict__,
        "candidate_count": 0
    }


@router.get("/skill-zones/{zone_id}", response_model=SkillZoneResponse)
def get_skill_zone(
    zone_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get skill zone by ID."""
    zone = db.query(SkillZone).filter(
        SkillZone.id == zone_id,
        SkillZone.company_id == current_user.current_company_id,
        SkillZone.is_deleted == False,
    ).first()

    if not zone:
        raise HTTPException(status_code=404, detail="Skill zone not found")

    return {
        **zone.__dict__,
        "candidate_count": len(zone.skill_zone_candidates) if zone.skill_zone_candidates else 0
    }


@router.put("/skill-zones/{zone_id}", response_model=SkillZoneResponse)
def update_skill_zone(
    zone_id: int,
    data: SkillZoneUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update a skill zone."""
    zone = db.query(SkillZone).filter(
        SkillZone.id == zone_id,
        SkillZone.company_id == current_user.current_company_id,
        SkillZone.is_deleted == False,
    ).first()

    if not zone:
        raise HTTPException(status_code=404, detail="Skill zone not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(zone, key, value)

    zone.updated_by = current_user.id
    db.commit()
    db.refresh(zone)

    return {
        **zone.__dict__,
        "candidate_count": len(zone.skill_zone_candidates) if zone.skill_zone_candidates else 0
    }


@router.delete("/skill-zones/{zone_id}", status_code=204)
def delete_skill_zone(
    zone_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a skill zone."""
    zone = db.query(SkillZone).filter(
        SkillZone.id == zone_id,
        SkillZone.company_id == current_user.current_company_id,
    ).first()

    if not zone:
        raise HTTPException(status_code=404, detail="Skill zone not found")

    zone.is_deleted = True
    zone.deleted_by = current_user.id
    zone.deleted_at = datetime.utcnow()
    db.commit()
    return None


@router.post("/skill-zones/{zone_id}/candidates", response_model=SkillZoneCandidateResponse, status_code=201)
def add_candidate_to_skill_zone(
    zone_id: int,
    data: SkillZoneCandidateCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Add a candidate to a skill zone."""
    zone = db.query(SkillZone).filter(
        SkillZone.id == zone_id,
        SkillZone.company_id == current_user.current_company_id,
        SkillZone.is_deleted == False,
    ).first()

    if not zone:
        raise HTTPException(status_code=404, detail="Skill zone not found")

    # Check if candidate already in zone
    existing = db.query(SkillZoneCandidate).filter(
        SkillZoneCandidate.skill_zone_id == zone_id,
        SkillZoneCandidate.candidate_id == data.candidate_id,
        SkillZoneCandidate.is_deleted == False,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Candidate already in this skill zone")

    zone_candidate = SkillZoneCandidate(
        skill_zone_id=zone_id,
        candidate_id=data.candidate_id,
        reason=data.reason,
        added_on=date.today(),
        company_id=current_user.current_company_id,
        created_by=current_user.id,
    )
    db.add(zone_candidate)
    db.commit()
    db.refresh(zone_candidate)
    return zone_candidate


@router.delete("/skill-zones/{zone_id}/candidates/{candidate_id}", status_code=204)
def remove_candidate_from_skill_zone(
    zone_id: int,
    candidate_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a candidate from a skill zone."""
    zone_candidate = db.query(SkillZoneCandidate).filter(
        SkillZoneCandidate.skill_zone_id == zone_id,
        SkillZoneCandidate.candidate_id == candidate_id,
        SkillZoneCandidate.company_id == current_user.current_company_id,
    ).first()

    if not zone_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found in skill zone")

    zone_candidate.is_deleted = True
    zone_candidate.deleted_by = current_user.id
    zone_candidate.deleted_at = datetime.utcnow()
    db.commit()
    return None


# =============================================================================
# Single Talent Pool Endpoints (with {pool_id} - MUST be last)
# =============================================================================

@router.get("/{pool_id}", response_model=TalentPoolResponse)
def get_talent_pool(
    pool_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Get talent pool by ID."""
    pool = db.query(TalentPool).filter(
        TalentPool.id == pool_id,
        TalentPool.company_id == current_user.current_company_id,
        TalentPool.is_deleted == False,
    ).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Talent pool not found")

    return {
        **pool.__dict__,
        "candidate_count": len(pool.pool_candidates) if pool.pool_candidates else 0
    }


@router.put("/{pool_id}", response_model=TalentPoolResponse)
def update_talent_pool(
    pool_id: int,
    data: TalentPoolUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update a talent pool."""
    pool = db.query(TalentPool).filter(
        TalentPool.id == pool_id,
        TalentPool.company_id == current_user.current_company_id,
        TalentPool.is_deleted == False,
    ).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Talent pool not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pool, key, value)

    pool.updated_by = current_user.id
    db.commit()
    db.refresh(pool)

    return {
        **pool.__dict__,
        "candidate_count": len(pool.pool_candidates) if pool.pool_candidates else 0
    }


@router.delete("/{pool_id}", status_code=204)
def delete_talent_pool(
    pool_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a talent pool."""
    pool = db.query(TalentPool).filter(
        TalentPool.id == pool_id,
        TalentPool.company_id == current_user.current_company_id,
    ).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Talent pool not found")

    pool.is_deleted = True
    pool.deleted_by = current_user.id
    pool.deleted_at = datetime.utcnow()
    db.commit()
    return None


# =============================================================================
# Talent Pool Candidates Endpoints
# =============================================================================

@router.get("/{pool_id}/candidates", response_model=TalentPoolCandidateList)
def list_pool_candidates(
    pool_id: int,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """List candidates in a talent pool."""
    query = db.query(TalentPoolCandidate).filter(
        TalentPoolCandidate.pool_id == pool_id,
        TalentPoolCandidate.company_id == current_user.current_company_id,
        TalentPoolCandidate.is_deleted == False,
    )

    if status:
        query = query.filter(TalentPoolCandidate.status == status)

    total = query.count()
    candidates = query.order_by(TalentPoolCandidate.created_at.desc()).offset(skip).limit(limit).all()

    return TalentPoolCandidateList(
        items=candidates,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/{pool_id}/candidates", response_model=TalentPoolCandidateResponse, status_code=201)
def add_candidate_to_pool(
    pool_id: int,
    data: TalentPoolCandidateCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Add a candidate to a talent pool."""
    pool = db.query(TalentPool).filter(
        TalentPool.id == pool_id,
        TalentPool.company_id == current_user.current_company_id,
        TalentPool.is_deleted == False,
    ).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Talent pool not found")

    # Check if candidate already in pool
    existing = db.query(TalentPoolCandidate).filter(
        TalentPoolCandidate.pool_id == pool_id,
        TalentPoolCandidate.candidate_id == data.candidate_id,
        TalentPoolCandidate.is_deleted == False,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Candidate already in this pool")

    # Get employee_id for added_by
    from modules.employee.models.employee import Employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.company_id == current_user.current_company_id,
    ).first()

    pool_candidate = TalentPoolCandidate(
        pool_id=pool_id,
        candidate_id=data.candidate_id,
        added_by_id=employee.id if employee else None,
        source_recruitment_id=data.source_recruitment_id,
        reason=data.reason,
        notes=data.notes,
        status=data.status,
        company_id=current_user.current_company_id,
        created_by=current_user.id,
    )
    db.add(pool_candidate)
    db.commit()
    db.refresh(pool_candidate)
    return pool_candidate


@router.post("/{pool_id}/candidates/bulk", status_code=201)
def add_candidates_to_pool_bulk(
    pool_id: int,
    data: AddCandidatesToPoolRequest,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Add multiple candidates to a talent pool."""
    pool = db.query(TalentPool).filter(
        TalentPool.id == pool_id,
        TalentPool.company_id == current_user.current_company_id,
        TalentPool.is_deleted == False,
    ).first()

    if not pool:
        raise HTTPException(status_code=404, detail="Talent pool not found")

    # Get employee_id for added_by
    from modules.employee.models.employee import Employee
    employee = db.query(Employee).filter(
        Employee.user_id == current_user.id,
        Employee.company_id == current_user.current_company_id,
    ).first()

    added_count = 0
    for candidate_id in data.candidate_ids:
        # Check if candidate already in pool
        existing = db.query(TalentPoolCandidate).filter(
            TalentPoolCandidate.pool_id == pool_id,
            TalentPoolCandidate.candidate_id == candidate_id,
            TalentPoolCandidate.is_deleted == False,
        ).first()

        if not existing:
            pool_candidate = TalentPoolCandidate(
                pool_id=pool_id,
                candidate_id=candidate_id,
                added_by_id=employee.id if employee else None,
                source_recruitment_id=data.source_recruitment_id,
                reason=data.reason,
                status="active",
                company_id=current_user.current_company_id,
                created_by=current_user.id,
            )
            db.add(pool_candidate)
            added_count += 1

    db.commit()
    return {"added_count": added_count}


@router.put("/{pool_id}/candidates/{candidate_id}", response_model=TalentPoolCandidateResponse)
def update_pool_candidate(
    pool_id: int,
    candidate_id: int,
    data: TalentPoolCandidateUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Update a candidate in a talent pool."""
    pool_candidate = db.query(TalentPoolCandidate).filter(
        TalentPoolCandidate.pool_id == pool_id,
        TalentPoolCandidate.candidate_id == candidate_id,
        TalentPoolCandidate.company_id == current_user.current_company_id,
        TalentPoolCandidate.is_deleted == False,
    ).first()

    if not pool_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found in pool")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pool_candidate, key, value)

    pool_candidate.updated_by = current_user.id
    db.commit()
    db.refresh(pool_candidate)
    return pool_candidate


@router.delete("/{pool_id}/candidates/{candidate_id}", status_code=204)
def remove_candidate_from_pool(
    pool_id: int,
    candidate_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a candidate from a talent pool."""
    pool_candidate = db.query(TalentPoolCandidate).filter(
        TalentPoolCandidate.pool_id == pool_id,
        TalentPoolCandidate.candidate_id == candidate_id,
        TalentPoolCandidate.company_id == current_user.current_company_id,
    ).first()

    if not pool_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found in pool")

    pool_candidate.is_deleted = True
    pool_candidate.deleted_by = current_user.id
    pool_candidate.deleted_at = datetime.utcnow()
    db.commit()
    return None


@router.post("/{pool_id}/candidates/{candidate_id}/contact")
def mark_candidate_contacted(
    pool_id: int,
    candidate_id: int,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """Mark a candidate as contacted."""
    pool_candidate = db.query(TalentPoolCandidate).filter(
        TalentPoolCandidate.pool_id == pool_id,
        TalentPoolCandidate.candidate_id == candidate_id,
        TalentPoolCandidate.company_id == current_user.current_company_id,
        TalentPoolCandidate.is_deleted == False,
    ).first()

    if not pool_candidate:
        raise HTTPException(status_code=404, detail="Candidate not found in pool")

    pool_candidate.last_contacted = datetime.utcnow()
    pool_candidate.status = "contacted"
    pool_candidate.updated_by = current_user.id
    db.commit()

    return {"status": "contacted", "last_contacted": pool_candidate.last_contacted}
