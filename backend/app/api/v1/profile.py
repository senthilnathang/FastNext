from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_active_user
from app.core import security
from app.db.session import get_db
from app.models.user import User
from app.models.activity_log import ActivityLog, ActivityAction, ActivityLevel
from app.schemas.profile import (
    ProfileResponse, ProfileUpdate, EmailUpdate, PasswordChange, 
    UsernameUpdate, AccountDeactivation, ProfileStats, QuickAction
)
from app.services.user_service import UserService
from app.services.password_service import PasswordService, PasswordValidationError
from app.utils.activity_logger import log_activity
from app.utils.audit_logger import log_audit_trail
import json
from datetime import datetime

router = APIRouter()


@router.get("/me", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get current user's profile"""
    return current_user


@router.put("/me", response_model=ProfileResponse)
def update_profile(
    *,
    db: Session = Depends(get_db),
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update current user's profile"""
    try:
        # Store old values for audit trail
        old_values = {
            "full_name": current_user.full_name,
            "bio": current_user.bio,
            "location": current_user.location,
            "website": current_user.website,
            "avatar_url": current_user.avatar_url
        }
        
        # Update profile fields
        update_data = profile_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        
        # Log activity
        from app.models.activity_log import EventCategory
        log_activity(
            db=db,
            user_id=current_user.id,
            action=ActivityAction.UPDATE,
            entity_type="profile",
            entity_id=current_user.id,
            entity_name=current_user.full_name or current_user.username,
            description=f"Updated profile information",
            level=ActivityLevel.INFO,
            category=EventCategory.USER_MANAGEMENT
        )
        
        # Log audit trail
        new_values = {
            "full_name": current_user.full_name,
            "bio": current_user.bio,
            "location": current_user.location,
            "website": current_user.website,
            "avatar_url": current_user.avatar_url
        }
        
        changed_fields = [key for key in update_data.keys() if old_values.get(key) != new_values.get(key)]
        
        if changed_fields:
            log_audit_trail(
                db=db,
                user_id=current_user.id,
                entity_type="user",
                entity_id=current_user.id,
                entity_name=current_user.username,
                operation="UPDATE",
                old_values=json.dumps(old_values),
                new_values=json.dumps(new_values),
                changed_fields=json.dumps(changed_fields)
            )
        
        return current_user
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )


@router.put("/me/email", response_model=ProfileResponse)
def update_email(
    *,
    db: Session = Depends(get_db),
    email_update: EmailUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update user's email address"""
    # Verify current password
    if not security.verify_password(email_update.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == email_update.email).first()
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        old_email = current_user.email
        current_user.email = email_update.email
        current_user.is_verified = False  # Require re-verification for new email
        
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        
        # Log activity
        log_activity(
            db=db,
            user_id=current_user.id,
            action=ActivityAction.UPDATE,
            entity_type="profile",
            entity_id=current_user.id,
            entity_name=current_user.username,
            description=f"Changed email from {old_email} to {email_update.email}",
            level=ActivityLevel.WARNING,
            category=EventCategory.USER_MANAGEMENT
        )
        
        return current_user
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update email: {str(e)}"
        )


@router.put("/me/password")
def change_password(
    *,
    db: Session = Depends(get_db),
    password_change: PasswordChange,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Change user's password"""
    # Verify current password
    if not security.verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )

    # Check if new password is different from current
    if security.verify_password(password_change.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Validate new password against security policies
    password_service = PasswordService(db)
    try:
        password_service.validate_password_policy(password_change.new_password, current_user)
    except PasswordValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    try:
        # Hash the new password
        hashed_password = security.get_password_hash(password_change.new_password)

        # Update password
        current_user.hashed_password = hashed_password
        current_user.password_changed_at = datetime.utcnow()
        current_user.failed_login_attempts = 0  # Reset failed attempts
        current_user.locked_until = None  # Unlock account if locked

        db.add(current_user)
        db.commit()

        # Update password history
        password_service.update_password_history(current_user.id, hashed_password)

        # Clear password change requirement if it was set
        password_service.clear_password_change_requirement(current_user.id)

        # Log activity
        log_activity(
            db=db,
            user_id=current_user.id,
            action=ActivityAction.UPDATE,
            entity_type="security",
            entity_id=current_user.id,
            entity_name=current_user.username,
            description="Password changed successfully",
            level=ActivityLevel.WARNING,
            category=EventCategory.SECURITY
        )

        return {"message": "Password changed successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        )


@router.put("/me/username", response_model=ProfileResponse)
def update_username(
    *,
    db: Session = Depends(get_db),
    username_update: UsernameUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update user's username"""
    # Verify current password
    if not security.verify_password(username_update.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == username_update.username).first()
    if existing_user and existing_user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    try:
        old_username = current_user.username
        current_user.username = username_update.username
        
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        
        # Log activity
        log_activity(
            db=db,
            user_id=current_user.id,
            action=ActivityAction.UPDATE,
            entity_type="profile",
            entity_id=current_user.id,
            entity_name=current_user.username,
            description=f"Changed username from {old_username} to {username_update.username}",
            level=ActivityLevel.INFO,
            category=EventCategory.USER_MANAGEMENT
        )
        
        return current_user
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update username: {str(e)}"
        )


@router.get("/me/stats", response_model=ProfileStats)
def get_profile_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get user's profile statistics"""
    try:
        # Get user statistics (you'll need to implement these queries based on your models)
        projects_count = len(current_user.projects) if current_user.projects else 0
        
        # Get last activity from activity logs
        last_activity_log = db.query(ActivityLog).filter(
            ActivityLog.user_id == current_user.id
        ).order_by(ActivityLog.created_at.desc()).first()
        
        account_age_days = (datetime.utcnow() - current_user.created_at.replace(tzinfo=None)).days
        
        return ProfileStats(
            projects_count=projects_count,
            components_created=0,  # Implement based on your component model
            pages_created=0,      # Implement based on your page model
            last_activity=last_activity_log.created_at if last_activity_log else None,
            member_since=current_user.created_at,
            account_age_days=account_age_days
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get profile stats: {str(e)}"
        )


@router.get("/quick-actions", response_model=list[QuickAction])
def get_quick_actions(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get available quick actions for the user"""
    quick_actions = [
        QuickAction(
            id="update_profile",
            title="Update Profile",
            description="Update your profile information",
            icon="user",
            action_type="modal",
            endpoint="/api/v1/profile/me",
            method="PUT",
            category="profile"
        ),
        QuickAction(
            id="change_password",
            title="Change Password",
            description="Change your account password",
            icon="lock",
            action_type="modal",
            endpoint="/api/v1/profile/me/password",
            method="PUT",
            requires_confirmation=True,
            category="security"
        ),
        QuickAction(
            id="security_settings",
            title="Security Settings",
            description="Manage your security preferences",
            icon="shield",
            action_type="navigate",
            endpoint="/security",
            category="security"
        ),
        QuickAction(
            id="activity_log",
            title="Activity Log",
            description="View your account activity",
            icon="activity",
            action_type="navigate",
            endpoint="/activity",
            category="monitoring"
        ),
        QuickAction(
            id="create_project",
            title="Create Project",
            description="Start a new project",
            icon="plus",
            action_type="modal",
            endpoint="/api/v1/projects",
            method="POST",
            category="project"
        ),
        QuickAction(
            id="export_data",
            title="Export Data",
            description="Export your account data",
            icon="download",
            action_type="modal",
            endpoint="/api/v1/profile/me/export",
            method="POST",
            category="data"
        )
    ]
    
    return quick_actions


@router.post("/me/deactivate")
def deactivate_account(
    *,
    db: Session = Depends(get_db),
    deactivation: AccountDeactivation,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Deactivate user account"""
    # Verify current password
    if not security.verify_password(deactivation.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    
    try:
        current_user.is_active = False
        db.add(current_user)
        db.commit()
        
        # Log activity
        log_activity(
            db=db,
            user_id=current_user.id,
            action=ActivityAction.DELETE,
            entity_type="account",
            entity_id=current_user.id,
            entity_name=current_user.username,
            description=f"Account deactivated. Reason: {deactivation.reason or 'Not specified'}",
            level=ActivityLevel.CRITICAL,
            category=EventCategory.USER_MANAGEMENT,
            extra_data={
                "reason": deactivation.reason,
                "feedback": deactivation.feedback
            }
        )
        
        return {"message": "Account deactivated successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate account: {str(e)}"
        )