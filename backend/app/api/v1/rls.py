"""
Row Level Security (RLS) API Endpoints

Provides endpoints for managing RLS policies, contexts, and audit logs.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.auth.deps import get_current_active_user, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.row_level_security import (
    RowLevelSecurityPolicy, RLSRuleAssignment, RLSContext, RLSAuditLog,
    Organization, OrganizationMember, RLSPolicy, RLSAction, RLSEntityType
)
from app.services.rls_service import RLSService
from app.middleware.rls_middleware import require_rls_access, rls_context_required
from app.schemas.rls import (
    RLSPolicyCreate, RLSPolicyUpdate, RLSPolicyResponse,
    RLSRuleAssignmentCreate, RLSRuleAssignmentResponse,
    RLSContextResponse, RLSAuditLogResponse,
    OrganizationCreate, OrganizationResponse,
    RLSAccessCheckRequest, RLSAccessCheckResponse
)

router = APIRouter()


# RLS Policy Management

@router.post("/policies", response_model=RLSPolicyResponse, tags=["RLS Policies"])
@require_rls_access(RLSEntityType.PERMISSION, RLSAction.INSERT)
async def create_rls_policy(
    *,
    db: Session = Depends(get_db),
    policy_in: RLSPolicyCreate,
    current_user: User = Depends(get_current_active_user),
    request: Request
) -> Any:
    """Create a new RLS policy"""
    rls_service = RLSService(db)
    
    try:
        policy = rls_service.create_policy(
            name=policy_in.name,
            entity_type=policy_in.entity_type,
            table_name=policy_in.table_name,
            policy_type=policy_in.policy_type,
            action=policy_in.action,
            created_by=current_user.id,
            description=policy_in.description,
            condition_column=policy_in.condition_column,
            condition_value_source=policy_in.condition_value_source,
            custom_condition=policy_in.custom_condition,
            required_roles=policy_in.required_roles,
            required_permissions=policy_in.required_permissions,
            priority=policy_in.priority,
            organization_id=policy_in.organization_id
        )
        
        return RLSPolicyResponse.from_orm(policy)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create RLS policy: {str(e)}"
        )


@router.get("/policies", response_model=List[RLSPolicyResponse], tags=["RLS Policies"])
@require_rls_access(RLSEntityType.PERMISSION, RLSAction.SELECT)
async def list_rls_policies(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request,
    entity_type: Optional[RLSEntityType] = Query(None),
    action: Optional[RLSAction] = Query(None),
    is_active: Optional[bool] = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
) -> Any:
    """List RLS policies with optional filtering"""
    query = db.query(RowLevelSecurityPolicy)
    
    # Apply filters
    if entity_type:
        query = query.filter(RowLevelSecurityPolicy.entity_type == entity_type)
    
    if action:
        query = query.filter(RowLevelSecurityPolicy.action == action)
    
    if is_active is not None:
        query = query.filter(RowLevelSecurityPolicy.is_active == is_active)
    
    # Order by priority and created date
    query = query.order_by(
        RowLevelSecurityPolicy.priority.desc(),
        RowLevelSecurityPolicy.created_at.desc()
    )
    
    policies = query.offset(skip).limit(limit).all()
    
    return [RLSPolicyResponse.from_orm(policy) for policy in policies]


@router.get("/policies/{policy_id}", response_model=RLSPolicyResponse, tags=["RLS Policies"])
@require_rls_access(RLSEntityType.PERMISSION, RLSAction.SELECT)
async def get_rls_policy(
    *,
    db: Session = Depends(get_db),
    policy_id: int,
    current_user: User = Depends(get_current_active_user),
    request: Request
) -> Any:
    """Get RLS policy by ID"""
    policy = db.query(RowLevelSecurityPolicy).filter(
        RowLevelSecurityPolicy.id == policy_id
    ).first()
    
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RLS policy not found"
        )
    
    return RLSPolicyResponse.from_orm(policy)


@router.put("/policies/{policy_id}", response_model=RLSPolicyResponse, tags=["RLS Policies"])
@require_rls_access(RLSEntityType.PERMISSION, RLSAction.UPDATE)
async def update_rls_policy(
    *,
    db: Session = Depends(get_db),
    policy_id: int,
    policy_in: RLSPolicyUpdate,
    current_user: User = Depends(get_current_active_user),
    request: Request
) -> Any:
    """Update RLS policy"""
    policy = db.query(RowLevelSecurityPolicy).filter(
        RowLevelSecurityPolicy.id == policy_id
    ).first()
    
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RLS policy not found"
        )
    
    try:
        # Update policy fields
        update_data = policy_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(policy, field, value)
        
        db.commit()
        db.refresh(policy)
        
        return RLSPolicyResponse.from_orm(policy)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update RLS policy: {str(e)}"
        )


@router.delete("/policies/{policy_id}", tags=["RLS Policies"])
@require_rls_access(RLSEntityType.PERMISSION, RLSAction.DELETE)
async def delete_rls_policy(
    *,
    db: Session = Depends(get_db),
    policy_id: int,
    current_user: User = Depends(get_current_active_user),
    request: Request
) -> Any:
    """Delete RLS policy"""
    policy = db.query(RowLevelSecurityPolicy).filter(
        RowLevelSecurityPolicy.id == policy_id
    ).first()
    
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RLS policy not found"
        )
    
    try:
        # Soft delete by marking as inactive
        policy.is_active = False
        db.commit()
        
        return {"message": "RLS policy deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete RLS policy: {str(e)}"
        )


# RLS Rule Assignments

@router.post("/rule-assignments", response_model=RLSRuleAssignmentResponse, tags=["RLS Rules"])
@require_rls_access(RLSEntityType.PERMISSION, RLSAction.INSERT)
async def create_rule_assignment(
    *,
    db: Session = Depends(get_db),
    assignment_in: RLSRuleAssignmentCreate,
    current_user: User = Depends(get_current_active_user),
    request: Request
) -> Any:
    """Create RLS rule assignment"""
    try:
        assignment = RLSRuleAssignment(
            policy_id=assignment_in.policy_id,
            entity_type=assignment_in.entity_type,
            entity_id=assignment_in.entity_id,
            user_id=assignment_in.user_id,
            role_id=assignment_in.role_id,
            conditions=assignment_in.conditions,
            created_by=current_user.id
        )
        
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        
        return RLSRuleAssignmentResponse.from_orm(assignment)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create rule assignment: {str(e)}"
        )


@router.get("/rule-assignments", response_model=List[RLSRuleAssignmentResponse], tags=["RLS Rules"])
@require_rls_access(RLSEntityType.PERMISSION, RLSAction.SELECT)
async def list_rule_assignments(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request,
    policy_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    entity_type: Optional[RLSEntityType] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
) -> Any:
    """List RLS rule assignments"""
    query = db.query(RLSRuleAssignment).filter(
        RLSRuleAssignment.is_active == True
    )
    
    # Apply filters
    if policy_id:
        query = query.filter(RLSRuleAssignment.policy_id == policy_id)
    
    if user_id:
        query = query.filter(RLSRuleAssignment.user_id == user_id)
    
    if entity_type:
        query = query.filter(RLSRuleAssignment.entity_type == entity_type)
    
    assignments = query.offset(skip).limit(limit).all()
    
    return [RLSRuleAssignmentResponse.from_orm(assignment) for assignment in assignments]


# RLS Context Management

@router.get("/context", response_model=RLSContextResponse, tags=["RLS Context"])
@rls_context_required
async def get_current_context(
    *,
    current_user: User = Depends(get_current_active_user),
    request: Request
) -> Any:
    """Get current user's RLS context"""
    context = getattr(request.state, 'rls_context', None)
    
    if not context:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RLS context not found"
        )
    
    return RLSContextResponse.from_orm(context)


@router.post("/context/refresh", response_model=RLSContextResponse, tags=["RLS Context"])
async def refresh_context(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request
) -> Any:
    """Refresh current user's RLS context"""
    rls_service = RLSService(db)
    
    # Get current session ID
    session_id = getattr(request.state, 'rls_context', {}).get('session_id')
    if not session_id:
        session_id = f"refresh_{current_user.id}_{int(datetime.utcnow().timestamp())}"
    
    try:
        # Create new context
        context = rls_service.create_context(
            user=current_user,
            session_id=session_id,
            request=request
        )
        
        # Update request state
        request.state.rls_context = context
        
        return RLSContextResponse.from_orm(context)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to refresh context: {str(e)}"
        )


# Access Control Checks

@router.post("/check-access", response_model=RLSAccessCheckResponse, tags=["RLS Access"])
async def check_access(
    *,
    db: Session = Depends(get_db),
    access_check: RLSAccessCheckRequest,
    current_user: User = Depends(get_current_active_user),
    request: Request
) -> Any:
    """Check access for specific entity and action"""
    rls_service = RLSService(db)
    
    # Get current context
    context = getattr(request.state, 'rls_context', None)
    session_id = context.session_id if context else None
    
    try:
        access_granted, denial_reason = rls_service.check_access(
            user_id=current_user.id,
            entity_type=access_check.entity_type,
            action=access_check.action,
            entity_id=access_check.entity_id,
            table_name=access_check.table_name,
            session_id=session_id,
            request=request
        )
        
        return RLSAccessCheckResponse(
            access_granted=access_granted,
            denial_reason=denial_reason,
            entity_type=access_check.entity_type,
            action=access_check.action,
            entity_id=access_check.entity_id,
            checked_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Access check failed: {str(e)}"
        )


# Audit Logs

@router.get("/audit-logs", response_model=List[RLSAuditLogResponse], tags=["RLS Audit"])
@require_rls_access(RLSEntityType.PERMISSION, RLSAction.SELECT)
async def list_audit_logs(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request,
    user_id: Optional[int] = Query(None),
    entity_type: Optional[RLSEntityType] = Query(None),
    action: Optional[RLSAction] = Query(None),
    access_granted: Optional[bool] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
) -> Any:
    """List RLS audit logs with filtering"""
    query = db.query(RLSAuditLog)
    
    # Apply filters
    if user_id:
        query = query.filter(RLSAuditLog.user_id == user_id)
    
    if entity_type:
        query = query.filter(RLSAuditLog.entity_type == entity_type)
    
    if action:
        query = query.filter(RLSAuditLog.action == action)
    
    if access_granted is not None:
        query = query.filter(RLSAuditLog.access_granted == access_granted)
    
    if from_date:
        query = query.filter(RLSAuditLog.created_at >= from_date)
    
    if to_date:
        query = query.filter(RLSAuditLog.created_at <= to_date)
    
    # Order by most recent first
    query = query.order_by(RLSAuditLog.created_at.desc())
    
    logs = query.offset(skip).limit(limit).all()
    
    return [RLSAuditLogResponse.from_orm(log) for log in logs]


@router.get("/audit-logs/stats", tags=["RLS Audit"])
@require_rls_access(RLSEntityType.PERMISSION, RLSAction.SELECT)
async def get_audit_stats(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request,
    days: int = Query(7, ge=1, le=90)
) -> Any:
    """Get RLS audit statistics"""
    from_date = datetime.utcnow() - timedelta(days=days)
    
    # Total access attempts
    total_attempts = db.query(RLSAuditLog).filter(
        RLSAuditLog.created_at >= from_date
    ).count()
    
    # Granted vs denied
    granted_count = db.query(RLSAuditLog).filter(
        RLSAuditLog.created_at >= from_date,
        RLSAuditLog.access_granted == True
    ).count()
    
    denied_count = total_attempts - granted_count
    
    # Top denied reasons
    denied_reasons = db.query(
        RLSAuditLog.denial_reason,
        db.func.count(RLSAuditLog.id).label('count')
    ).filter(
        RLSAuditLog.created_at >= from_date,
        RLSAuditLog.access_granted == False,
        RLSAuditLog.denial_reason.isnot(None)
    ).group_by(RLSAuditLog.denial_reason).order_by(
        db.func.count(RLSAuditLog.id).desc()
    ).limit(10).all()
    
    # Entity type breakdown
    entity_stats = db.query(
        RLSAuditLog.entity_type,
        db.func.count(RLSAuditLog.id).label('count')
    ).filter(
        RLSAuditLog.created_at >= from_date
    ).group_by(RLSAuditLog.entity_type).all()
    
    return {
        "period_days": days,
        "total_attempts": total_attempts,
        "granted_count": granted_count,
        "denied_count": denied_count,
        "success_rate": (granted_count / total_attempts * 100) if total_attempts > 0 else 0,
        "top_denied_reasons": [
            {"reason": reason, "count": count} 
            for reason, count in denied_reasons
        ],
        "entity_type_stats": [
            {"entity_type": entity_type.value, "count": count}
            for entity_type, count in entity_stats
        ]
    }


# Organization Management

@router.post("/organizations", response_model=OrganizationResponse, tags=["Organizations"])
async def create_organization(
    *,
    db: Session = Depends(get_db),
    org_in: OrganizationCreate,
    current_user: User = Depends(get_current_active_user),
    request: Request
) -> Any:
    """Create organization"""
    try:
        organization = Organization(
            name=org_in.name,
            slug=org_in.slug,
            description=org_in.description,
            settings=org_in.settings,
            rls_enabled=org_in.rls_enabled,
            created_by=current_user.id
        )
        
        db.add(organization)
        db.commit()
        db.refresh(organization)
        
        # Add creator as organization admin
        member = OrganizationMember(
            organization_id=organization.id,
            user_id=current_user.id,
            role="admin",
            created_by=current_user.id
        )
        
        db.add(member)
        db.commit()
        
        return OrganizationResponse.from_orm(organization)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create organization: {str(e)}"
        )


@router.get("/organizations", response_model=List[OrganizationResponse], tags=["Organizations"])
async def list_organizations(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
) -> Any:
    """List organizations user has access to"""
    # Get organizations where user is a member
    query = db.query(Organization).join(OrganizationMember).filter(
        OrganizationMember.user_id == current_user.id,
        OrganizationMember.is_active == True,
        Organization.is_active == True
    ).order_by(Organization.name)
    
    organizations = query.offset(skip).limit(limit).all()
    
    return [OrganizationResponse.from_orm(org) for org in organizations]