"""
Marketplace Security API Endpoints

Code signing, security scanning, and trusted publisher management.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps.database import get_db
from app.api.deps.auth import get_current_active_user
from app.models.user import User

from ..services.security_service import SecurityService, get_security_service


router = APIRouter(prefix="/security", tags=["Marketplace Security"])


# -------------------------------------------------------------------------
# Request/Response Models
# -------------------------------------------------------------------------


class SigningKeyResponse(BaseModel):
    """Signing key response."""
    id: int
    key_id: str
    name: Optional[str]
    algorithm: str
    key_size: Optional[int]
    public_key: str
    status: str
    is_primary: bool
    issued_at: str
    expires_at: Optional[str]
    last_used_at: Optional[str]
    signature_count: int

    class Config:
        from_attributes = True


class GenerateKeyRequest(BaseModel):
    """Request to generate a signing key."""
    publisher_id: int
    name: Optional[str] = None
    algorithm: str = Field(default="ed25519", pattern="^(ed25519|rsa)$")
    set_as_primary: bool = False


class GenerateKeyResponse(BaseModel):
    """Response with new signing key and private key."""
    key: SigningKeyResponse
    private_key: str


class RevokeKeyRequest(BaseModel):
    """Request to revoke a signing key."""
    reason: Optional[str] = None


class SignModuleRequest(BaseModel):
    """Request to sign a module version."""
    version_id: int
    signing_key_id: str
    private_key: str


class ModuleSignatureResponse(BaseModel):
    """Module signature response."""
    id: int
    version_id: int
    signature: str
    signature_algorithm: str
    signed_content_hash: str
    signed_manifest_hash: Optional[str]
    verified: bool
    verified_at: Optional[str]
    signed_at: str

    class Config:
        from_attributes = True


class VerifySignatureResponse(BaseModel):
    """Signature verification response."""
    valid: bool
    error: Optional[str] = None


class SecurityScanResponse(BaseModel):
    """Security scan response."""
    id: int
    scan_id: str
    version_id: int
    scan_type: str
    status: str
    started_at: Optional[str]
    completed_at: Optional[str]
    result: Optional[str]
    risk_score: Optional[int]
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    findings: List[Dict[str, Any]]
    error_message: Optional[str]

    class Config:
        from_attributes = True


class CreateScanRequest(BaseModel):
    """Request to create a security scan."""
    version_id: int
    scan_type: str = "full"


class SecurityPolicyResponse(BaseModel):
    """Security policy response."""
    id: int
    code: str
    name: str
    description: Optional[str]
    policy_type: str
    severity: str
    is_active: bool
    is_blocking: bool
    violation_message: Optional[str]
    recommendation: Optional[str]

    class Config:
        from_attributes = True


class CreatePolicyRequest(BaseModel):
    """Request to create a security policy."""
    code: str
    name: str
    policy_type: str
    rule: Dict[str, Any]
    severity: str = "medium"
    is_blocking: bool = False
    description: Optional[str] = None
    violation_message: Optional[str] = None
    recommendation: Optional[str] = None


class TrustedPublisherResponse(BaseModel):
    """Trusted publisher response."""
    id: int
    publisher_id: int
    trust_level: str
    status: str
    skip_code_review: bool
    skip_security_scan: bool
    auto_publish: bool
    extended_api_limits: bool
    verified_at: Optional[str]
    verification_method: Optional[str]

    class Config:
        from_attributes = True


class GrantTrustedStatusRequest(BaseModel):
    """Request to grant trusted status."""
    publisher_id: int
    trust_level: str = "basic"
    verification_method: str
    privileges: Optional[Dict[str, bool]] = None


# -------------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------------


def key_to_response(key) -> SigningKeyResponse:
    """Convert signing key to response."""
    return SigningKeyResponse(
        id=key.id,
        key_id=key.key_id,
        name=key.name,
        algorithm=key.algorithm,
        key_size=key.key_size,
        public_key=key.public_key,
        status=key.status,
        is_primary=key.is_primary,
        issued_at=key.issued_at.isoformat(),
        expires_at=key.expires_at.isoformat() if key.expires_at else None,
        last_used_at=key.last_used_at.isoformat() if key.last_used_at else None,
        signature_count=key.signature_count,
    )


def scan_to_response(scan) -> SecurityScanResponse:
    """Convert security scan to response."""
    return SecurityScanResponse(
        id=scan.id,
        scan_id=scan.scan_id,
        version_id=scan.version_id,
        scan_type=scan.scan_type,
        status=scan.status,
        started_at=scan.started_at.isoformat() if scan.started_at else None,
        completed_at=scan.completed_at.isoformat() if scan.completed_at else None,
        result=scan.result,
        risk_score=scan.risk_score,
        critical_count=scan.critical_count,
        high_count=scan.high_count,
        medium_count=scan.medium_count,
        low_count=scan.low_count,
        info_count=scan.info_count,
        findings=scan.findings or [],
        error_message=scan.error_message,
    )


# -------------------------------------------------------------------------
# Signing Key Endpoints
# -------------------------------------------------------------------------


@router.post("/keys/generate", response_model=GenerateKeyResponse, status_code=status.HTTP_201_CREATED)
def generate_signing_key(
    data: GenerateKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Generate a new signing key pair for a publisher.

    The private key is only returned once and must be stored securely.
    """
    service = get_security_service(db)

    try:
        key, private_key = service.generate_signing_key(
            publisher_id=data.publisher_id,
            name=data.name,
            algorithm=data.algorithm,
            set_as_primary=data.set_as_primary,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return GenerateKeyResponse(
        key=key_to_response(key),
        private_key=private_key,
    )


@router.get("/keys/{publisher_id}", response_model=List[SigningKeyResponse])
def get_publisher_keys(
    publisher_id: int,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all signing keys for a publisher."""
    service = get_security_service(db)
    keys = service.get_publisher_keys(publisher_id, status=status_filter)
    return [key_to_response(k) for k in keys]


@router.get("/keys/{publisher_id}/primary", response_model=SigningKeyResponse)
def get_primary_key(
    publisher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get the primary signing key for a publisher."""
    service = get_security_service(db)
    key = service.get_primary_key(publisher_id)

    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No primary key found"
        )

    return key_to_response(key)


@router.post("/keys/{key_id}/revoke", response_model=SigningKeyResponse)
def revoke_key(
    key_id: str,
    data: RevokeKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Revoke a signing key."""
    service = get_security_service(db)

    try:
        key = service.revoke_key(key_id, reason=data.reason)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    return key_to_response(key)


# -------------------------------------------------------------------------
# Signing Endpoints
# -------------------------------------------------------------------------


@router.post("/sign", response_model=ModuleSignatureResponse)
def sign_module(
    data: SignModuleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Sign a module version with a private key."""
    service = get_security_service(db)

    try:
        signature = service.sign_module_version(
            version_id=data.version_id,
            private_key_pem=data.private_key,
            signing_key_id=data.signing_key_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return ModuleSignatureResponse(
        id=signature.id,
        version_id=signature.version_id,
        signature=signature.signature,
        signature_algorithm=signature.signature_algorithm,
        signed_content_hash=signature.signed_content_hash,
        signed_manifest_hash=signature.signed_manifest_hash,
        verified=signature.verified,
        verified_at=signature.verified_at.isoformat() if signature.verified_at else None,
        signed_at=signature.signed_at.isoformat(),
    )


@router.post("/verify/{version_id}", response_model=VerifySignatureResponse)
def verify_signature(
    version_id: int,
    db: Session = Depends(get_db),
):
    """Verify a module version's signature."""
    service = get_security_service(db)
    valid, error = service.verify_signature(version_id)

    return VerifySignatureResponse(valid=valid, error=error)


# -------------------------------------------------------------------------
# Security Scan Endpoints
# -------------------------------------------------------------------------


@router.post("/scans", response_model=SecurityScanResponse, status_code=status.HTTP_201_CREATED)
def create_scan(
    data: CreateScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new security scan for a module version."""
    service = get_security_service(db)
    scan = service.create_security_scan(data.version_id, data.scan_type)
    return scan_to_response(scan)


@router.post("/scans/{scan_id}/run", response_model=SecurityScanResponse)
async def run_scan(
    scan_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Run a security scan on uploaded module content.

    The file should be a ZIP archive of the module.
    """
    service = get_security_service(db)

    try:
        content = await file.read()
        scan = service.run_security_scan(scan_id, content)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    return scan_to_response(scan)


@router.get("/scans/version/{version_id}", response_model=List[SecurityScanResponse])
def get_version_scans(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all security scans for a module version."""
    service = get_security_service(db)
    scans = service.get_scan_results(version_id)
    return [scan_to_response(s) for s in scans]


@router.get("/scans/version/{version_id}/latest", response_model=SecurityScanResponse)
def get_latest_scan(
    version_id: int,
    db: Session = Depends(get_db),
):
    """Get the latest completed security scan for a module version."""
    service = get_security_service(db)
    scan = service.get_latest_scan(version_id)

    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed scan found"
        )

    return scan_to_response(scan)


# -------------------------------------------------------------------------
# Security Policy Endpoints
# -------------------------------------------------------------------------


@router.get("/policies", response_model=List[SecurityPolicyResponse])
def list_policies(
    policy_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List active security policies."""
    service = get_security_service(db)
    policies = service.get_active_policies(policy_type)
    return [
        SecurityPolicyResponse(
            id=p.id,
            code=p.code,
            name=p.name,
            description=p.description,
            policy_type=p.policy_type,
            severity=p.severity,
            is_active=p.is_active,
            is_blocking=p.is_blocking,
            violation_message=p.violation_message,
            recommendation=p.recommendation,
        )
        for p in policies
    ]


@router.post("/policies", response_model=SecurityPolicyResponse, status_code=status.HTTP_201_CREATED)
def create_policy(
    data: CreatePolicyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new security policy."""
    service = get_security_service(db)

    try:
        policy = service.create_policy(
            code=data.code,
            name=data.name,
            policy_type=data.policy_type,
            rule=data.rule,
            severity=data.severity,
            is_blocking=data.is_blocking,
            description=data.description,
            violation_message=data.violation_message,
            recommendation=data.recommendation,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return SecurityPolicyResponse(
        id=policy.id,
        code=policy.code,
        name=policy.name,
        description=policy.description,
        policy_type=policy.policy_type,
        severity=policy.severity,
        is_active=policy.is_active,
        is_blocking=policy.is_blocking,
        violation_message=policy.violation_message,
        recommendation=policy.recommendation,
    )


# -------------------------------------------------------------------------
# Trusted Publisher Endpoints
# -------------------------------------------------------------------------


@router.post("/trusted", response_model=TrustedPublisherResponse, status_code=status.HTTP_201_CREATED)
def grant_trusted_status(
    data: GrantTrustedStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Grant trusted publisher status."""
    service = get_security_service(db)

    trusted = service.grant_trusted_status(
        publisher_id=data.publisher_id,
        trust_level=data.trust_level,
        verified_by=current_user.id,
        verification_method=data.verification_method,
        privileges=data.privileges,
    )

    return TrustedPublisherResponse(
        id=trusted.id,
        publisher_id=trusted.publisher_id,
        trust_level=trusted.trust_level,
        status=trusted.status,
        skip_code_review=trusted.skip_code_review,
        skip_security_scan=trusted.skip_security_scan,
        auto_publish=trusted.auto_publish,
        extended_api_limits=trusted.extended_api_limits,
        verified_at=trusted.verified_at.isoformat() if trusted.verified_at else None,
        verification_method=trusted.verification_method,
    )


@router.get("/trusted/{publisher_id}", response_model=TrustedPublisherResponse)
def get_trusted_status(
    publisher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get trusted status for a publisher."""
    service = get_security_service(db)
    trusted = service.get_trusted_status(publisher_id)

    if not trusted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publisher not found or not trusted"
        )

    return TrustedPublisherResponse(
        id=trusted.id,
        publisher_id=trusted.publisher_id,
        trust_level=trusted.trust_level,
        status=trusted.status,
        skip_code_review=trusted.skip_code_review,
        skip_security_scan=trusted.skip_security_scan,
        auto_publish=trusted.auto_publish,
        extended_api_limits=trusted.extended_api_limits,
        verified_at=trusted.verified_at.isoformat() if trusted.verified_at else None,
        verification_method=trusted.verification_method,
    )


@router.get("/trusted/{publisher_id}/check")
def check_trusted_status(
    publisher_id: int,
    db: Session = Depends(get_db),
):
    """Check if a publisher is trusted (public endpoint)."""
    service = get_security_service(db)
    is_trusted = service.is_trusted_publisher(publisher_id)

    return {"publisher_id": publisher_id, "is_trusted": is_trusted}
