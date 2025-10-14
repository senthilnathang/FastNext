from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.services.permission_service import PermissionService
from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.declarative import DeclarativeMeta
from sqlalchemy.orm import Session

ModelType = TypeVar("ModelType", bound=DeclarativeMeta)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseCRUDController(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Generic CRUD controller with built-in permission checking"""

    def __init__(
        self,
        model: Type[ModelType],
        resource_name: str,
        owner_field: str = "user_id",
        project_field: Optional[str] = None,
    ):
        self.model = model
        self.resource_name = resource_name
        self.owner_field = owner_field
        self.project_field = project_field

    def _check_permission(
        self,
        db: Session,
        user: User,
        action: str,
        resource_id: Optional[int] = None,
        project_id: Optional[int] = None,
    ) -> bool:
        """Check if user has permission for the action"""
        return PermissionService.check_resource_permission(
            db=db,
            user_id=user.id,
            action=action,
            resource_type=self.resource_name,
            resource_id=resource_id,
            project_id=project_id,
        )

    def _check_ownership_or_permission(
        self, db: Session, user: User, obj: ModelType, action: str
    ) -> bool:
        """Check if user owns the resource or has general permission"""
        # Check if user has general permission
        if self._check_permission(db, user, action):
            return True

        # Check ownership if owner field exists
        if hasattr(obj, self.owner_field):
            owner_id = getattr(obj, self.owner_field)
            return owner_id == user.id

        return False

    def get_list(
        self,
        db: Session,
        current_user: User,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[ModelType]:
        """Get list of resources with permission filtering"""
        if not self._check_permission(db, current_user, "read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions to read {self.resource_name}",
            )

        query = db.query(self.model)

        # Apply filters
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.filter(getattr(self.model, field) == value)

        # If user doesn't have manage permission, filter to their own resources
        if not self._check_permission(db, current_user, "manage"):
            if hasattr(self.model, self.owner_field):
                query = query.filter(
                    getattr(self.model, self.owner_field) == current_user.id
                )

        return query.offset(skip).limit(limit).all()

    def get_by_id(self, db: Session, current_user: User, id: int) -> ModelType:
        """Get resource by ID with permission check"""
        obj = db.query(self.model).filter(self.model.id == id).first()
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{self.resource_name.title()} not found",
            )

        if not self._check_ownership_or_permission(db, current_user, obj, "read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{self.resource_name.title()} access denied",
            )

        return obj

    def create(
        self, db: Session, current_user: User, obj_in: CreateSchemaType
    ) -> ModelType:
        """Create new resource with permission check"""
        if not self._check_permission(db, current_user, "create"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions to create {self.resource_name}",
            )

        # Get data and add owner if field exists
        obj_data = obj_in.dict()
        if hasattr(self.model, self.owner_field):
            obj_data[self.owner_field] = current_user.id

        # Check project permission if project field exists
        if self.project_field and self.project_field in obj_data:
            project_id = obj_data[self.project_field]
            if project_id and not PermissionService.check_project_permission(
                db, current_user.id, project_id, "create"
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Project access denied",
                )

        obj = self.model(**obj_data)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(
        self, db: Session, current_user: User, id: int, obj_in: UpdateSchemaType
    ) -> ModelType:
        """Update resource with permission check"""
        obj = self.get_by_id(db, current_user, id)

        if not self._check_ownership_or_permission(db, current_user, obj, "update"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{self.resource_name.title()} update access denied",
            )

        obj_data = obj_in.dict(exclude_unset=True)
        for field, value in obj_data.items():
            setattr(obj, field, value)

        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, current_user: User, id: int) -> Dict[str, str]:
        """Delete resource with permission check"""
        obj = self.get_by_id(db, current_user, id)

        if not self._check_ownership_or_permission(db, current_user, obj, "delete"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{self.resource_name.title()} delete access denied",
            )

        db.delete(obj)
        db.commit()
        return {"message": f"{self.resource_name.title()} deleted successfully"}


def create_crud_routes(
    controller: BaseCRUDController,
    response_model: Type[BaseModel],
    list_response_model: Type[BaseModel] = None,
):
    """Factory function to create standard CRUD routes"""
    from fastapi import APIRouter

    router = APIRouter()

    if list_response_model is None:
        list_response_model = List[response_model]

    @router.get("/", response_model=list_response_model)
    def read_items(
        db: Session = Depends(get_db),
        skip: int = 0,
        limit: int = 100,
        current_user: User = Depends(get_current_active_user),
    ):
        return controller.get_list(db, current_user, skip, limit)

    @router.post("/", response_model=response_model)
    def create_item(
        *,
        db: Session = Depends(get_db),
        item_in: controller.__orig_bases__[0].__args__[1],
        current_user: User = Depends(get_current_active_user),
    ):
        return controller.create(db, current_user, item_in)

    @router.get("/{item_id}", response_model=response_model)
    def read_item(
        *,
        db: Session = Depends(get_db),
        item_id: int,
        current_user: User = Depends(get_current_active_user),
    ):
        return controller.get_by_id(db, current_user, item_id)

    @router.put("/{item_id}", response_model=response_model)
    def update_item(
        *,
        db: Session = Depends(get_db),
        item_id: int,
        item_in: controller.__orig_bases__[0].__args__[2],
        current_user: User = Depends(get_current_active_user),
    ):
        return controller.update(db, current_user, item_id, item_in)

    @router.delete("/{item_id}")
    def delete_item(
        *,
        db: Session = Depends(get_db),
        item_id: int,
        current_user: User = Depends(get_current_active_user),
    ):
        return controller.delete(db, current_user, item_id)

    return router
