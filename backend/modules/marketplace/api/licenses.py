"""
Marketplace License API Endpoints

License management, verification, and activation.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..services.license_service import LicenseService, get_license_service
from ..services.module_service import get_module_service


router = APIRouter(prefix="/licenses", tags=["Marketplace Licenses"])


# -------------------------------------------------------------------------
# Request/Response Models
# -------------------------------------------------------------------------


class LicenseResponse(BaseModel):
    """License response."""
    id: int
    license_key: str
    license_type: str
    status: str
    module_id: int
    module_name: Optional[str]
    module_display_name: Optional[str]
    issued_at: str
    activated_at: Optional[str]
    expires_at: Optional[str]
    is_trial: bool
    trial_ends_at: Optional[str]
    max_instances: int
    active_instances: int
    subscription_status: Optional[str]

    class Config:
        from_attributes = True


class ActivationResponse(BaseModel):
    """License activation response."""
    id: int
    instance_id: str
    instance_name: Optional[str]
    domain: Optional[str]
    status: str
    activated_at: str
    last_check: Optional[str]

    class Config:
        from_attributes = True


class LicenseDetailResponse(LicenseResponse):
    """Detailed license response with activations."""
    activations: List[ActivationResponse]


class VerifyLicenseRequest(BaseModel):
    """License verification request."""
    license_key: str = Field(..., min_length=19, max_length=19)
    instance_id: str = Field(..., min_length=8, max_length=64)
    domain: Optional[str] = None


class VerifyLicenseResponse(BaseModel):
    """License verification response."""
    valid: bool
    license_type: Optional[str] = None
    module_id: Optional[int] = None
    module_name: Optional[str] = None
    expires_at: Optional[str] = None
    is_trial: Optional[bool] = None
    trial_ends_at: Optional[str] = None
    error: Optional[str] = None
    message: Optional[str] = None


class ActivateLicenseRequest(BaseModel):
    """License activation request."""
    license_key: str = Field(..., min_length=19, max_length=19)
    instance_id: str = Field(..., min_length=8, max_length=64)
    domain: Optional[str] = None
    instance_name: Optional[str] = None
    ip_address: Optional[str] = None
    server_info: Optional[Dict[str, Any]] = None


class DeactivateLicenseRequest(BaseModel):
    """License deactivation request."""
    license_key: str = Field(..., min_length=19, max_length=19)
    instance_id: str = Field(..., min_length=8, max_length=64)


class CreateTrialRequest(BaseModel):
    """Create trial license request."""
    module_id: int


class CreateFreeLicenseRequest(BaseModel):
    """Create free license request."""
    module_id: int


# -------------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------------


def license_to_response(license) -> LicenseResponse:
    """Convert license to response model."""
    return LicenseResponse(
        id=license.id,
        license_key=license.license_key,
        license_type=license.license_type,
        status=license.status,
        module_id=license.module_id,
        module_name=license.module.technical_name if license.module else None,
        module_display_name=license.module.display_name if license.module else None,
        issued_at=license.issued_at.isoformat(),
        activated_at=license.activated_at.isoformat() if license.activated_at else None,
        expires_at=license.expires_at.isoformat() if license.expires_at else None,
        is_trial=license.is_trial,
        trial_ends_at=license.trial_ends_at.isoformat() if license.trial_ends_at else None,
        max_instances=license.max_instances,
        active_instances=license.active_instances,
        subscription_status=license.subscription_status,
    )


# -------------------------------------------------------------------------
# User License Endpoints
# -------------------------------------------------------------------------


@router.get("/", response_model=List[LicenseResponse])
def get_my_licenses(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all licenses for the current user."""
    service = get_license_service(db)
    licenses = service.get_user_licenses(
        user_id=current_user.id,
        status=status_filter,
    )
    return [license_to_response(lic) for lic in licenses]


@router.get("/{license_key}", response_model=LicenseDetailResponse)
def get_license(
    license_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get license details by key."""
    service = get_license_service(db)
    license = service.get_license_by_key(license_key)

    if not license or license.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found"
        )

    return LicenseDetailResponse(
        **license_to_response(license).model_dump(),
        activations=[
            ActivationResponse(
                id=a.id,
                instance_id=a.instance_id,
                instance_name=a.instance_name,
                domain=a.domain,
                status=a.status,
                activated_at=a.activated_at.isoformat(),
                last_check=a.last_check.isoformat() if a.last_check else None,
            )
            for a in license.activations
        ],
    )


@router.post("/free", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
def create_free_license(
    data: CreateFreeLicenseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a free license for a module."""
    # Verify module exists and is free
    module_service = get_module_service(db)
    module = module_service.get_module(data.module_id)

    if not module or module.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )

    if module.license_type != "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Module is not free"
        )

    license_service = get_license_service(db)
    license = license_service.create_free_license(current_user.id, data.module_id)
    return license_to_response(license)


@router.post("/trial", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
def create_trial_license(
    data: CreateTrialRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Start a trial for a module."""
    # Verify module exists and has trial
    module_service = get_module_service(db)
    module = module_service.get_module(data.module_id)

    if not module or module.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )

    if not module.has_trial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Module does not offer a trial"
        )

    license_service = get_license_service(db)

    try:
        license = license_service.create_trial_license(
            user_id=current_user.id,
            module_id=data.module_id,
            days=module.trial_days or 14,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return license_to_response(license)


# -------------------------------------------------------------------------
# License Verification (Public)
# -------------------------------------------------------------------------


@router.post("/verify", response_model=VerifyLicenseResponse)
def verify_license(
    data: VerifyLicenseRequest,
    db: Session = Depends(get_db),
):
    """
    Verify a license key.

    This endpoint is public and used by FastVue instances to verify licenses.
    """
    service = get_license_service(db)
    result = service.verify_license(
        license_key=data.license_key,
        instance_id=data.instance_id,
        domain=data.domain,
    )
    return VerifyLicenseResponse(**result)


@router.post("/activate", response_model=ActivationResponse)
def activate_license(
    data: ActivateLicenseRequest,
    db: Session = Depends(get_db),
):
    """
    Activate a license on an instance.

    This endpoint is public and used by FastVue instances.
    """
    service = get_license_service(db)

    try:
        activation = service.activate_license(
            license_key=data.license_key,
            instance_id=data.instance_id,
            domain=data.domain,
            instance_name=data.instance_name,
            ip_address=data.ip_address,
            server_info=data.server_info,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return ActivationResponse(
        id=activation.id,
        instance_id=activation.instance_id,
        instance_name=activation.instance_name,
        domain=activation.domain,
        status=activation.status,
        activated_at=activation.activated_at.isoformat(),
        last_check=activation.last_check.isoformat() if activation.last_check else None,
    )


@router.post("/deactivate")
def deactivate_license(
    data: DeactivateLicenseRequest,
    db: Session = Depends(get_db),
):
    """
    Deactivate a license from an instance.

    This endpoint is public and used by FastVue instances.
    """
    service = get_license_service(db)

    if not service.deactivate_license(data.license_key, data.instance_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License or activation not found"
        )

    return {"status": "deactivated"}


# -------------------------------------------------------------------------
# License Management (Authenticated)
# -------------------------------------------------------------------------


@router.post("/{license_key}/deactivate/{instance_id}")
def deactivate_my_license(
    license_key: str,
    instance_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Deactivate one of your license instances."""
    service = get_license_service(db)
    license = service.get_license_by_key(license_key)

    if not license or license.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found"
        )

    if not service.deactivate_license(license_key, instance_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activation not found"
        )

    return {"status": "deactivated"}


@router.delete("/{license_key}/cancel")
def cancel_my_license(
    license_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cancel a license (for subscriptions)."""
    service = get_license_service(db)
    license = service.get_license_by_key(license_key)

    if not license or license.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found"
        )

    if license.license_type not in ("subscription", "trial"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only subscription/trial licenses can be cancelled"
        )

    try:
        service.cancel_license(license.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"status": "cancelled"}
