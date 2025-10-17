import base64
import io
import json
from datetime import datetime, timedelta
from typing import Any, Optional

import pyotp
import qrcode
from app.auth.deps import get_current_active_user
from app.core import security
from app.db.session import get_db
from app.models.activity_log import ActivityAction, ActivityLevel
from app.models.security_setting import SecuritySetting
from app.models.user import User
from app.schemas.security_setting import (
    SecuritySettingCreate,
    SecuritySettingResponse,
    SecuritySettingsOverview,
    SecuritySettingUpdate,
    TwoFactorDisable,
    TwoFactorSetup,
    TwoFactorVerify,
)
from app.utils.activity_logger import log_activity, log_security_event
from app.utils.audit_logger import log_audit_trail
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/violations")
async def report_security_violation(
    request: Request,
    db: Session = Depends(get_db),
) -> Any:
    """Report security violations from frontend"""
    try:
        # Get client data
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        # Parse request body
        body = await request.json()
        violation_type = body.get("type", "unknown")
        details = body.get("details", {})
        timestamp = body.get("timestamp")
        reported_user_agent = body.get("userAgent", user_agent)
        url = body.get("url", "")

        # Log the security violation
        log_security_event(
            db=db,
            user_id=None,  # No authenticated user for violations
            event_type=f"frontend_{violation_type}",
            description=f"Security violation reported from frontend: {violation_type}",
            level=ActivityLevel.WARNING,
            extra_data={
                "violation_type": violation_type,
                "details": details,
                "client_ip": client_ip,
                "user_agent": reported_user_agent,
                "url": url,
                "timestamp": timestamp,
                "source": "frontend"
            },
        )

        # In production, you might want to:
        # - Send alerts to security team
        # - Store in dedicated security violations table
        # - Trigger automated responses

        return {"status": "reported", "message": "Security violation logged"}

    except Exception as e:
        # Log the error but don't expose it to frontend
        print(f"Error processing security violation: {str(e)}")
        # Still return success to avoid leaking information
        return {"status": "reported", "message": "Security violation logged"}


@router.get("/settings", response_model=SecuritySettingResponse)
def get_security_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get current user's security settings"""

    security_settings = (
        db.query(SecuritySetting)
        .filter(SecuritySetting.user_id == current_user.id)
        .first()
    )

    if not security_settings:
        # Create default security settings
        security_settings = SecuritySetting(
            user_id=current_user.id,
            two_factor_enabled=False,
            require_password_change=False,
            password_expiry_days=90,
            max_login_attempts=5,
            lockout_duration_minutes=30,
            max_session_duration_hours=24,
            allow_concurrent_sessions=True,
            max_concurrent_sessions=5,
            email_on_login=True,
            email_on_password_change=True,
            email_on_security_change=True,
            email_on_suspicious_activity=True,
            activity_logging_enabled=True,
            data_retention_days=90,
            api_access_enabled=True,
            api_rate_limit=100,
        )
        db.add(security_settings)
        db.commit()
        db.refresh(security_settings)

    return security_settings


@router.put("/settings", response_model=SecuritySettingResponse)
def update_security_settings(
    *,
    db: Session = Depends(get_db),
    settings_in: SecuritySettingUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update current user's security settings"""

    security_settings = (
        db.query(SecuritySetting)
        .filter(SecuritySetting.user_id == current_user.id)
        .first()
    )

    if not security_settings:
        # Create new settings if they don't exist
        settings_data = settings_in.dict(exclude_unset=True)
        settings_data["user_id"] = current_user.id
        security_settings = SecuritySetting(**settings_data)
        db.add(security_settings)
    else:
        # Update existing settings
        update_data = settings_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(security_settings, field, value)
        db.add(security_settings)

    try:
        db.commit()
        db.refresh(security_settings)

        # Log activity
        log_security_event(
            db=db,
            user_id=current_user.id,
            event_type="settings_update",
            description="Security settings updated",
            level=ActivityLevel.INFO,
            extra_data={
                "updated_fields": list(settings_in.dict(exclude_unset=True).keys())
            },
        )

        return security_settings

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update security settings: {str(e)}",
        )


@router.post("/2fa/setup", response_model=TwoFactorSetup)
def setup_two_factor_auth(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Setup two-factor authentication for the user"""

    # Check if 2FA is already enabled
    security_settings = (
        db.query(SecuritySetting)
        .filter(SecuritySetting.user_id == current_user.id)
        .first()
    )

    if security_settings and security_settings.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is already enabled",
        )

    try:
        # Generate a new secret
        secret = pyotp.random_base32()

        # Create TOTP URI for QR code
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=current_user.email, issuer_name="FastNext"
        )

        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        img_buffer = io.BytesIO()
        img.save(img_buffer, format="PNG")
        img_buffer.seek(0)

        # Convert to base64 for frontend
        qr_code_b64 = base64.b64encode(img_buffer.getvalue()).decode()
        qr_code_url = f"data:image/png;base64,{qr_code_b64}"

        # Generate backup codes
        backup_codes = [pyotp.random_base32()[:8] for _ in range(10)]

        # Store the secret temporarily (will be confirmed when user verifies)
        if not security_settings:
            security_settings = SecuritySetting(user_id=current_user.id)
            db.add(security_settings)

        # Store encrypted secret (in production, use proper encryption)
        security_settings.two_factor_secret = secret
        security_settings.backup_codes = json.dumps(backup_codes)

        db.commit()

        # Log activity
        log_security_event(
            db=db,
            user_id=current_user.id,
            event_type="2fa_setup_initiated",
            description="Two-factor authentication setup initiated",
            level=ActivityLevel.INFO,
        )

        return TwoFactorSetup(
            secret=secret, qr_code_url=qr_code_url, backup_codes=backup_codes
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup 2FA: {str(e)}",
        )


@router.post("/2fa/verify")
def verify_two_factor_auth(
    *,
    db: Session = Depends(get_db),
    verify_data: TwoFactorVerify,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Verify and enable two-factor authentication"""

    security_settings = (
        db.query(SecuritySetting)
        .filter(SecuritySetting.user_id == current_user.id)
        .first()
    )

    if not security_settings or not security_settings.two_factor_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication setup not initiated",
        )

    try:
        # Verify the TOTP token
        totp = pyotp.TOTP(security_settings.two_factor_secret)
        if not totp.verify(verify_data.token, valid_window=2):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code",
            )

        # Enable 2FA
        security_settings.two_factor_enabled = True
        db.add(security_settings)
        db.commit()

        # Log activity
        log_security_event(
            db=db,
            user_id=current_user.id,
            event_type="2fa_enabled",
            description="Two-factor authentication enabled successfully",
            level=ActivityLevel.WARNING,
        )

        return {"message": "Two-factor authentication enabled successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify 2FA: {str(e)}",
        )


@router.post("/2fa/disable")
def disable_two_factor_auth(
    *,
    db: Session = Depends(get_db),
    disable_data: TwoFactorDisable,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Disable two-factor authentication"""

    # Verify current password
    if not security.verify_password(
        disable_data.password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password"
        )

    security_settings = (
        db.query(SecuritySetting)
        .filter(SecuritySetting.user_id == current_user.id)
        .first()
    )

    if not security_settings or not security_settings.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is not enabled",
        )

    # If 2FA is enabled, verify the token
    if disable_data.token:
        totp = pyotp.TOTP(security_settings.two_factor_secret)
        backup_codes = json.loads(security_settings.backup_codes or "[]")

        # Check if token is valid TOTP or backup code
        if not (
            totp.verify(disable_data.token, valid_window=2)
            or disable_data.token in backup_codes
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code",
            )

    try:
        # Disable 2FA
        security_settings.two_factor_enabled = False
        security_settings.two_factor_secret = None
        security_settings.backup_codes = None

        db.add(security_settings)
        db.commit()

        # Log activity
        log_security_event(
            db=db,
            user_id=current_user.id,
            event_type="2fa_disabled",
            description="Two-factor authentication disabled",
            level=ActivityLevel.WARNING,
        )

        return {"message": "Two-factor authentication disabled successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disable 2FA: {str(e)}",
        )


@router.get("/overview", response_model=SecuritySettingsOverview)
def get_security_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get security settings overview with recommendations"""

    security_settings = (
        db.query(SecuritySetting)
        .filter(SecuritySetting.user_id == current_user.id)
        .first()
    )

    # Calculate password strength score (simplified)
    password_strength_score = 3  # Default score

    # Get security metrics
    active_sessions_count = 1  # Would need session tracking
    recent_login_attempts = current_user.failed_login_attempts or 0

    # Calculate security score
    security_score = 50  # Base score

    if security_settings:
        if security_settings.two_factor_enabled:
            security_score += 25
        if security_settings.max_login_attempts <= 5:
            security_score += 10
        if security_settings.max_session_duration_hours <= 24:
            security_score += 10
        if security_settings.email_on_suspicious_activity:
            security_score += 5

    # Generate recommendations
    recommendations = []
    if not security_settings or not security_settings.two_factor_enabled:
        recommendations.append("Enable two-factor authentication for better security")

    if current_user.password_changed_at:
        days_since_password_change = (
            datetime.utcnow() - current_user.password_changed_at.replace(tzinfo=None)
        ).days
        if days_since_password_change > 90:
            recommendations.append(
                "Consider changing your password (last changed over 90 days ago)"
            )
    else:
        recommendations.append(
            "Set a password change date for better security tracking"
        )

    if not current_user.is_verified:
        recommendations.append("Verify your email address")

    return SecuritySettingsOverview(
        user_id=current_user.id,
        two_factor_enabled=(
            security_settings.two_factor_enabled if security_settings else False
        ),
        password_strength_score=password_strength_score,
        last_password_change=(
            current_user.password_changed_at.isoformat()
            if current_user.password_changed_at
            else None
        ),
        active_sessions_count=active_sessions_count,
        recent_login_attempts=recent_login_attempts,
        security_score=min(security_score, 100),
        recommendations=recommendations,
    )
