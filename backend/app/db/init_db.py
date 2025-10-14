from app.db.base import Base, SessionLocal, engine
from app.db.seed_roles_permissions import seed_roles_permissions_if_empty
from app.models.asset import Asset
from app.models.component import Component, ComponentInstance
from app.models.page import Page
from app.models.permission import Permission
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.role import Role
from app.models.user import User
from app.models.user_role import RolePermission, UserRole


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

    # Seed default data
    db = SessionLocal()
    try:
        seed_roles_permissions_if_empty(db)
    finally:
        db.close()
