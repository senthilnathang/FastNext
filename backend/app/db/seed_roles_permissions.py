from app.models.permission import Permission, PermissionAction, PermissionCategory
from app.models.role import Role, SystemRole
from app.models.user_role import RolePermission
from sqlalchemy.orm import Session


def create_default_permissions(db: Session) -> None:
    """Create default permissions for the system"""

    default_permissions = [
        # System permissions
        {
            "name": "system_manage",
            "description": "Full system administration",
            "category": PermissionCategory.SYSTEM,
            "action": PermissionAction.MANAGE,
            "is_system_permission": True,
        },
        # Project permissions
        {
            "name": "project_create",
            "description": "Create new projects",
            "category": PermissionCategory.PROJECT,
            "action": PermissionAction.CREATE,
            "is_system_permission": True,
        },
        {
            "name": "project_read",
            "description": "View projects",
            "category": PermissionCategory.PROJECT,
            "action": PermissionAction.READ,
            "is_system_permission": True,
        },
        {
            "name": "project_update",
            "description": "Edit projects",
            "category": PermissionCategory.PROJECT,
            "action": PermissionAction.UPDATE,
            "is_system_permission": True,
        },
        {
            "name": "project_delete",
            "description": "Delete projects",
            "category": PermissionCategory.PROJECT,
            "action": PermissionAction.DELETE,
            "is_system_permission": True,
        },
        {
            "name": "project_manage",
            "description": "Full project management",
            "category": PermissionCategory.PROJECT,
            "action": PermissionAction.MANAGE,
            "is_system_permission": True,
        },
        {
            "name": "project_publish",
            "description": "Publish projects",
            "category": PermissionCategory.PROJECT,
            "action": PermissionAction.PUBLISH,
            "is_system_permission": True,
        },
        {
            "name": "project_deploy",
            "description": "Deploy projects",
            "category": PermissionCategory.PROJECT,
            "action": PermissionAction.DEPLOY,
            "is_system_permission": True,
        },
        # Page permissions
        {
            "name": "page_create",
            "description": "Create pages",
            "category": PermissionCategory.PAGE,
            "action": PermissionAction.CREATE,
            "is_system_permission": True,
        },
        {
            "name": "page_read",
            "description": "View pages",
            "category": PermissionCategory.PAGE,
            "action": PermissionAction.READ,
            "is_system_permission": True,
        },
        {
            "name": "page_update",
            "description": "Edit pages",
            "category": PermissionCategory.PAGE,
            "action": PermissionAction.UPDATE,
            "is_system_permission": True,
        },
        {
            "name": "page_delete",
            "description": "Delete pages",
            "category": PermissionCategory.PAGE,
            "action": PermissionAction.DELETE,
            "is_system_permission": True,
        },
        # Component permissions
        {
            "name": "component_create",
            "description": "Create components",
            "category": PermissionCategory.COMPONENT,
            "action": PermissionAction.CREATE,
            "is_system_permission": True,
        },
        {
            "name": "component_read",
            "description": "View components",
            "category": PermissionCategory.COMPONENT,
            "action": PermissionAction.READ,
            "is_system_permission": True,
        },
        {
            "name": "component_update",
            "description": "Edit components",
            "category": PermissionCategory.COMPONENT,
            "action": PermissionAction.UPDATE,
            "is_system_permission": True,
        },
        {
            "name": "component_delete",
            "description": "Delete components",
            "category": PermissionCategory.COMPONENT,
            "action": PermissionAction.DELETE,
            "is_system_permission": True,
        },
        # User permissions
        {
            "name": "user_create",
            "description": "Create users",
            "category": PermissionCategory.USER,
            "action": PermissionAction.CREATE,
            "is_system_permission": True,
        },
        {
            "name": "user_read",
            "description": "View users",
            "category": PermissionCategory.USER,
            "action": PermissionAction.READ,
            "is_system_permission": True,
        },
        {
            "name": "user_update",
            "description": "Edit users",
            "category": PermissionCategory.USER,
            "action": PermissionAction.UPDATE,
            "is_system_permission": True,
        },
        {
            "name": "user_delete",
            "description": "Delete users",
            "category": PermissionCategory.USER,
            "action": PermissionAction.DELETE,
            "is_system_permission": True,
        },
        {
            "name": "user_manage",
            "description": "Full user management",
            "category": PermissionCategory.USER,
            "action": PermissionAction.MANAGE,
            "is_system_permission": True,
        },
    ]

    for permission_data in default_permissions:
        existing_permission = (
            db.query(Permission)
            .filter(Permission.name == permission_data["name"])
            .first()
        )

        if not existing_permission:
            permission = Permission(**permission_data)
            db.add(permission)

    db.commit()


def create_default_roles(db: Session) -> None:
    """Create default system roles"""

    default_roles = [
        {
            "name": SystemRole.ADMIN,
            "description": "System administrator with full access",
            "is_system_role": True,
        },
        {
            "name": SystemRole.EDITOR,
            "description": "Can create and edit projects",
            "is_system_role": True,
        },
        {
            "name": SystemRole.VIEWER,
            "description": "Can view projects",
            "is_system_role": True,
        },
        {
            "name": SystemRole.MEMBER,
            "description": "Basic project member",
            "is_system_role": True,
        },
    ]

    for role_data in default_roles:
        existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()

        if not existing_role:
            role = Role(**role_data)
            db.add(role)

    db.commit()


def assign_role_permissions(db: Session) -> None:
    """Assign permissions to default roles"""

    # Get roles
    admin_role = db.query(Role).filter(Role.name == SystemRole.ADMIN).first()
    editor_role = db.query(Role).filter(Role.name == SystemRole.EDITOR).first()
    viewer_role = db.query(Role).filter(Role.name == SystemRole.VIEWER).first()
    member_role = db.query(Role).filter(Role.name == SystemRole.MEMBER).first()

    # Get permissions
    permissions = {p.name: p for p in db.query(Permission).all()}

    role_permission_mappings = [
        # Admin - all permissions
        (admin_role.id, permissions["system_manage"].id),
        (admin_role.id, permissions["project_manage"].id),
        (admin_role.id, permissions["user_manage"].id),
        # Editor - project creation and management
        (editor_role.id, permissions["project_create"].id),
        (editor_role.id, permissions["project_read"].id),
        (editor_role.id, permissions["project_update"].id),
        (editor_role.id, permissions["project_publish"].id),
        (editor_role.id, permissions["page_create"].id),
        (editor_role.id, permissions["page_read"].id),
        (editor_role.id, permissions["page_update"].id),
        (editor_role.id, permissions["page_delete"].id),
        (editor_role.id, permissions["component_create"].id),
        (editor_role.id, permissions["component_read"].id),
        (editor_role.id, permissions["component_update"].id),
        (editor_role.id, permissions["component_delete"].id),
        # Viewer - read-only access
        (viewer_role.id, permissions["project_read"].id),
        (viewer_role.id, permissions["page_read"].id),
        (viewer_role.id, permissions["component_read"].id),
        # Member - basic project access
        (member_role.id, permissions["project_read"].id),
        (member_role.id, permissions["page_read"].id),
        (member_role.id, permissions["page_update"].id),
        (member_role.id, permissions["component_read"].id),
        (member_role.id, permissions["component_update"].id),
    ]

    for role_id, permission_id in role_permission_mappings:
        existing = (
            db.query(RolePermission)
            .filter(
                RolePermission.role_id == role_id,
                RolePermission.permission_id == permission_id,
            )
            .first()
        )

        if not existing:
            role_permission = RolePermission(
                role_id=role_id, permission_id=permission_id
            )
            db.add(role_permission)

    db.commit()


def seed_roles_and_permissions(db: Session) -> None:
    """Seed all roles and permissions"""
    create_default_permissions(db)
    create_default_roles(db)
    assign_role_permissions(db)


def seed_roles_permissions_if_empty(db: Session) -> None:
    """Seed roles and permissions if none exist"""
    roles_count = db.query(Role).count()
    permissions_count = db.query(Permission).count()

    if roles_count == 0 or permissions_count == 0:
        seed_roles_and_permissions(db)
