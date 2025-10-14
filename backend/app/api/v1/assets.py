from typing import Any, List

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.models.asset import Asset
from app.models.user import User
from app.schemas.asset import Asset as AssetSchema
from app.schemas.asset import AssetCreate, AssetUpdate
from app.services.permission_service import PermissionService
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("", response_model=List[AssetSchema])
@router.get("/", response_model=List[AssetSchema])
def read_assets(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get assets with permission check"""
    if not PermissionService.check_resource_permission(
        db, current_user.id, "read", "asset"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read assets",
        )

    query = db.query(Asset)

    if project_id:
        # Check project access
        if not PermissionService.check_project_permission(
            db, current_user.id, project_id, "read"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Project access denied"
            )
        query = query.filter(Asset.project_id == project_id)

    # Users can only see their own assets unless they have manage permission
    if not PermissionService.check_resource_permission(
        db, current_user.id, "manage", "asset"
    ):
        query = query.filter(Asset.user_id == current_user.id)

    assets = query.offset(skip).limit(limit).all()
    return assets


@router.post("", response_model=AssetSchema)
@router.post("/", response_model=AssetSchema)
def create_asset(
    *,
    db: Session = Depends(get_db),
    asset_in: AssetCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Create new asset"""
    if not PermissionService.check_resource_permission(
        db, current_user.id, "create", "asset"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create assets",
        )

    if asset_in.project_id:
        # Check project access
        if not PermissionService.check_project_permission(
            db, current_user.id, asset_in.project_id, "create"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Project access denied"
            )

    asset = Asset(**asset_in.dict(), user_id=current_user.id)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=AssetSchema)
def read_asset(
    *,
    db: Session = Depends(get_db),
    asset_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get asset by ID"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Check permission
    if not PermissionService.check_resource_permission(
        db, current_user.id, "read", "asset"
    ):
        # Allow users to read their own assets
        if asset.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Asset access denied"
            )

    return asset


@router.put("/{asset_id}", response_model=AssetSchema)
def update_asset(
    *,
    db: Session = Depends(get_db),
    asset_id: int,
    asset_in: AssetUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update asset"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Check permission
    if not PermissionService.check_resource_permission(
        db, current_user.id, "update", "asset"
    ):
        # Allow users to update their own assets
        if asset.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Asset update access denied",
            )

    asset_data = asset_in.dict(exclude_unset=True)
    for field, value in asset_data.items():
        setattr(asset, field, value)

    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}")
def delete_asset(
    *,
    db: Session = Depends(get_db),
    asset_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Delete asset"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Check permission
    if not PermissionService.check_resource_permission(
        db, current_user.id, "delete", "asset"
    ):
        # Allow users to delete their own assets
        if asset.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Asset delete access denied",
            )

    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted successfully"}
