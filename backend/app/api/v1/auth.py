"""Authentication endpoints"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    TwoFactorSetup,
    TwoFactorVerify,
    PasswordChange,
    SwitchCompanyRequest,
    CompanyInfo,
    UserInfo,
)
from app.schemas.token import Token
from app.services.auth import AuthService
from app.services.user import UserService

router = APIRouter()


def get_client_ip(request: Request) -> Optional[str]:
    """Get client IP address from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login with username/email and password.
    Returns JWT tokens and user info.
    """
    auth_service = AuthService(db)
    ip_address = get_client_ip(request)

    # Authenticate
    user, error = auth_service.authenticate(
        login_data.username,
        login_data.password,
        ip_address,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
        )

    # Check if 2FA is required but code not provided
    if user.two_factor_enabled and not login_data.two_factor_code:
        return LoginResponse(
            access_token="",
            refresh_token="",
            expires_in=0,
            user=UserInfo(
                id=user.id,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                is_superuser=user.is_superuser,
                two_factor_enabled=user.two_factor_enabled,
                current_company_id=user.current_company_id,
            ),
            requires_2fa=True,
        )

    # Complete login
    token_data, error = auth_service.login(
        user,
        login_data.two_factor_code,
        ip_address,
    )

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
        )

    db.commit()

    # Build response
    user_service = UserService(db)
    companies = [
        CompanyInfo(
            id=c.id,
            name=c.name,
            code=c.code,
            is_default=any(
                ucr.company_id == c.id and ucr.is_default
                for ucr in user.company_roles
            ),
        )
        for c in user_service.get_user_companies(user)
    ]

    permissions = list(user.get_permissions_for_company())

    return LoginResponse(
        access_token=token_data["access_token"],
        refresh_token=token_data["refresh_token"],
        token_type="bearer",
        expires_in=token_data["expires_in"],
        user=UserInfo(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            is_superuser=user.is_superuser,
            two_factor_enabled=user.two_factor_enabled,
            current_company_id=user.current_company_id,
        ),
        companies=companies,
        permissions=permissions,
    )


@router.post("/refresh", response_model=Token)
def refresh_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """Refresh access token using refresh token"""
    auth_service = AuthService(db)

    access_token, error = auth_service.refresh_access_token(data.refresh_token)

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
        )

    from app.core.config import settings
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Logout current user"""
    auth_service = AuthService(db)
    auth_service.logout(current_user, get_client_ip(request))
    db.commit()
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserInfo)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user info"""
    return UserInfo(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        is_superuser=current_user.is_superuser,
        two_factor_enabled=current_user.two_factor_enabled,
        current_company_id=current_user.current_company_id,
    )


@router.get("/permissions")
def get_current_permissions(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's permissions for current company"""
    permissions = list(current_user.get_permissions_for_company())
    role = current_user.get_role_for_company(current_user.current_company_id)

    return {
        "permissions": permissions,
        "role": role.codename if role else None,
        "is_superuser": current_user.is_superuser,
    }


@router.get("/me/permissions")
def get_my_permissions(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's permissions for current company (alias for /permissions)"""
    permissions = list(current_user.get_permissions_for_company())
    role = current_user.get_role_for_company(current_user.current_company_id)

    return {
        "permissions": permissions,
        "role": role.codename if role else None,
        "is_superuser": current_user.is_superuser,
    }


@router.post("/switch-company")
def switch_company(
    data: SwitchCompanyRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Switch to a different company"""
    user_service = UserService(db)

    if not user_service.switch_company(current_user, data.company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this company",
        )

    db.commit()

    # Return new permissions
    permissions = list(current_user.get_permissions_for_company())
    role = current_user.get_role_for_company(data.company_id)

    return {
        "message": "Company switched successfully",
        "company_id": data.company_id,
        "permissions": permissions,
        "role": role.codename if role else None,
    }


@router.post("/change-password")
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Change current user's password"""
    user_service = UserService(db)

    if not user_service.change_password(
        current_user,
        data.current_password,
        data.new_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    db.commit()
    return {"message": "Password changed successfully"}


# Two-Factor Authentication endpoints
@router.post("/2fa/setup", response_model=TwoFactorSetup)
def setup_2fa(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Set up two-factor authentication"""
    if current_user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled",
        )

    auth_service = AuthService(db)
    result = auth_service.setup_two_factor(current_user)
    db.commit()

    return TwoFactorSetup(
        secret=result["secret"],
        qr_code=result["qr_code"],
        backup_codes=result["backup_codes"],
    )


@router.post("/2fa/verify")
def verify_2fa(
    data: TwoFactorVerify,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Verify 2FA code and enable 2FA"""
    auth_service = AuthService(db)

    if not auth_service.verify_and_enable_2fa(current_user, data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    db.commit()
    return {"message": "2FA enabled successfully"}


@router.post("/2fa/disable")
def disable_2fa(
    data: TwoFactorVerify,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Disable two-factor authentication"""
    auth_service = AuthService(db)

    # Verify current 2FA code before disabling
    if not auth_service.verify_2fa(current_user, data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    auth_service.disable_2fa(current_user)
    db.commit()
    return {"message": "2FA disabled successfully"}
