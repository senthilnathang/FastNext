from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.auth.deps import get_current_active_user
from app.auth.permissions import require_admin
from app.core import security
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema, UserCreate, AdminUserCreate, UserUpdate, UserResponse
from app.schemas.common import ListResponse

router = APIRouter()


@router.get("", response_model=ListResponse[UserResponse])
@router.get("/", response_model=ListResponse[UserResponse])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    is_active: bool = None,
    current_user: User = Depends(require_admin),
) -> Any:
    """Get all users with pagination (admin only)"""
    query = db.query(User)
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.username.ilike(search_term)) |
            (User.email.ilike(search_term)) |
            (User.full_name.ilike(search_term))
        )
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    users = query.offset(skip).limit(limit).all()
    
    return ListResponse.paginate(
        items=users,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("", response_model=UserResponse)
@router.post("/", response_model=UserResponse)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: AdminUserCreate,
    current_user: User = Depends(require_admin),
) -> Any:
    """Create new user (admin only)"""
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user = db.query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    user_data = user_in.dict(exclude={'password', 'send_invitation'})
    user = User(
        **user_data,
        hashed_password=security.get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # TODO: Implement invitation email sending if send_invitation is True
    if user_in.send_invitation:
        # Send invitation email logic here
        pass
    
    return user


@router.get("/me", response_model=UserResponse)
def read_user_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get current user profile"""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Update current user profile"""
    current_user_data = user_in.dict(exclude_unset=True)
    if 'password' in current_user_data:
        hashed_password = security.get_password_hash(current_user_data.pop('password'))
        current_user_data["hashed_password"] = hashed_password
    
    for field, value in current_user_data.items():
        setattr(current_user, field, value)
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """Get user by ID (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(require_admin),
) -> Any:
    """Update user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = user_in.dict(exclude_unset=True)
    if 'password' in user_data:
        hashed_password = security.get_password_hash(user_data.pop('password'))
        user_data["hashed_password"] = hashed_password
    
    for field, value in user_data.items():
        setattr(user, field, value)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """Delete user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_superuser:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete superuser"
        )
    
    user.is_active = False
    db.add(user)
    db.commit()
    return {"message": "User deleted successfully"}


@router.patch("/{user_id}/toggle-status", response_model=UserResponse)
def toggle_user_status(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(require_admin),
) -> Any:
    """Toggle user active status (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_superuser:
        raise HTTPException(
            status_code=400,
            detail="Cannot modify superuser status"
        )
    
    user.is_active = not user.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user