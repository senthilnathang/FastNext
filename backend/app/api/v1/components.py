from typing import Any, List

from app.auth.deps import get_current_active_user
from app.db.session import get_db
from app.models.component import Component, ComponentInstance
from app.models.page import Page
from app.models.project import Project
from app.models.user import User
from app.schemas.component import Component as ComponentSchema
from app.schemas.component import ComponentCreate
from app.schemas.component import ComponentInstance as ComponentInstanceSchema
from app.schemas.component import (
    ComponentInstanceCreate,
    ComponentInstanceUpdate,
    ComponentUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


# Component CRUD
@router.get("", response_model=List[ComponentSchema])
@router.get("/", response_model=List[ComponentSchema])
def read_components(
    *,
    db: Session = Depends(get_db),
    project_id: int = None,
    is_global: bool = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    query = db.query(Component)

    if project_id is not None:
        # Verify user owns the project
        project = (
            db.query(Project)
            .filter(Project.id == project_id, Project.user_id == current_user.id)
            .first()
        )
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        query = query.filter(Component.project_id == project_id)

    if is_global is not None:
        query = query.filter(Component.is_global == is_global)

    # Show global components or user's components
    query = query.filter(
        (Component.is_global == True)
        | (
            Component.project_id.in_(
                db.query(Project.id).filter(Project.user_id == current_user.id)
            )
        )
    )

    components = query.all()
    return components


@router.post("", response_model=ComponentSchema)
@router.post("/", response_model=ComponentSchema)
def create_component(
    *,
    db: Session = Depends(get_db),
    component_in: ComponentCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    if component_in.project_id:
        project = (
            db.query(Project)
            .filter(
                Project.id == component_in.project_id,
                Project.user_id == current_user.id,
            )
            .first()
        )
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    component = Component(**component_in.dict())
    db.add(component)
    db.commit()
    db.refresh(component)
    return component


@router.get("/{component_id}", response_model=ComponentSchema)
def read_component(
    *,
    db: Session = Depends(get_db),
    component_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    # Check if user has access (global or owns the project)
    if not component.is_global and component.project_id:
        project = (
            db.query(Project)
            .filter(
                Project.id == component.project_id, Project.user_id == current_user.id
            )
            .first()
        )
        if not project:
            raise HTTPException(status_code=403, detail="Access denied")

    return component


@router.put("/{component_id}", response_model=ComponentSchema)
def update_component(
    *,
    db: Session = Depends(get_db),
    component_id: int,
    component_in: ComponentUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    component = db.query(Component).filter(Component.id == component_id).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    # Check if user owns the project (can't edit global components)
    if component.is_global or not component.project_id:
        raise HTTPException(status_code=403, detail="Cannot edit global components")

    project = (
        db.query(Project)
        .filter(Project.id == component.project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=403, detail="Access denied")

    component_data = component_in.dict(exclude_unset=True)
    for field, value in component_data.items():
        setattr(component, field, value)

    db.add(component)
    db.commit()
    db.refresh(component)
    return component


# Component Instance CRUD
@router.get("/instances/page/{page_id}", response_model=List[ComponentInstanceSchema])
def read_page_component_instances(
    *,
    db: Session = Depends(get_db),
    page_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    # Verify user owns the project
    page = (
        db.query(Page)
        .join(Project)
        .filter(Page.id == page_id, Project.user_id == current_user.id)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    instances = (
        db.query(ComponentInstance)
        .filter(ComponentInstance.page_id == page_id)
        .order_by(ComponentInstance.order_index)
        .all()
    )
    return instances


@router.post("/instances/", response_model=ComponentInstanceSchema)
def create_component_instance(
    *,
    db: Session = Depends(get_db),
    instance_in: ComponentInstanceCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    # Verify user owns the project
    page = (
        db.query(Page)
        .join(Project)
        .filter(Page.id == instance_in.page_id, Project.user_id == current_user.id)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Verify component exists and user has access
    component = (
        db.query(Component).filter(Component.id == instance_in.component_id).first()
    )
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    instance = ComponentInstance(**instance_in.dict())
    db.add(instance)
    db.commit()
    db.refresh(instance)
    return instance


@router.put("/instances/{instance_id}", response_model=ComponentInstanceSchema)
def update_component_instance(
    *,
    db: Session = Depends(get_db),
    instance_id: int,
    instance_in: ComponentInstanceUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    instance = (
        db.query(ComponentInstance)
        .join(Page)
        .join(Project)
        .filter(ComponentInstance.id == instance_id, Project.user_id == current_user.id)
        .first()
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Component instance not found")

    instance_data = instance_in.dict(exclude_unset=True)
    for field, value in instance_data.items():
        setattr(instance, field, value)

    db.add(instance)
    db.commit()
    db.refresh(instance)
    return instance


@router.delete("/instances/{instance_id}")
def delete_component_instance(
    *,
    db: Session = Depends(get_db),
    instance_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    instance = (
        db.query(ComponentInstance)
        .join(Page)
        .join(Project)
        .filter(ComponentInstance.id == instance_id, Project.user_id == current_user.id)
        .first()
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Component instance not found")

    db.delete(instance)
    db.commit()
    return {"message": "Component instance deleted successfully"}
