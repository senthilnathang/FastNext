"""Database initialization and seeding"""

import logging
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models import (
    User,
    Company,
    Role,
    Permission,
    UserCompanyRole,
    RolePermission,
)
from app.models.permission import DEFAULT_PERMISSIONS
from app.models.role import DEFAULT_ROLES, SystemRole

logger = logging.getLogger(__name__)


def init_db(db: Session, with_sample_data: bool = False) -> None:
    """Initialize database with required data

    Args:
        db: Database session
        with_sample_data: If True, also create sample data for testing
    """
    logger.info("Initializing database...")

    # Create permissions
    create_default_permissions(db)

    # Create system roles
    create_default_roles(db)

    # Create default company
    create_default_company(db)

    # Create superuser
    create_superuser(db)

    # Install base module
    install_base_module(db)

    if with_sample_data:
        create_sample_data(db)

    db.commit()
    logger.info("Database initialization complete")


def create_default_permissions(db: Session) -> None:
    """Create default system permissions"""
    logger.info("Creating default permissions...")

    for codename, name, category, action in DEFAULT_PERMISSIONS:
        existing = db.query(Permission).filter(Permission.codename == codename).first()
        if not existing:
            permission = Permission(
                name=name,
                codename=codename,
                category=category,
                action=action,
                is_system_permission=True,
                is_active=True,
            )
            db.add(permission)
            logger.debug(f"Created permission: {codename}")

    db.flush()


def create_default_roles(db: Session) -> None:
    """Create default system roles with permissions"""
    logger.info("Creating default roles...")

    for role_config in DEFAULT_ROLES:
        codename = role_config["codename"]
        existing = db.query(Role).filter(Role.codename == codename).first()

        if not existing:
            role = Role(
                name=role_config["name"],
                codename=codename,
                description=role_config["description"],
                is_system_role=True,
                is_active=True,
                company_id=None,  # Global role
            )
            db.add(role)
            db.flush()

            # Assign permissions to role
            permission_list = role_config.get("permissions", [])
            if "*" in permission_list:
                # Assign all permissions
                permissions = db.query(Permission).all()
            else:
                permissions = db.query(Permission).filter(
                    Permission.codename.in_(permission_list)
                ).all()

            for permission in permissions:
                rp = RolePermission(role_id=role.id, permission_id=permission.id)
                db.add(rp)

            logger.debug(f"Created role: {role.name} with {len(permissions)} permissions")

    db.flush()


def create_default_company(db: Session) -> None:
    """Create default company"""
    logger.info("Creating default company...")

    existing = db.query(Company).filter(Company.code == "DEFAULT").first()
    if not existing:
        company = Company(
            name="Default Company",
            code="DEFAULT",
            description="Default company for initial setup",
            is_active=True,
            is_headquarters=True,
        )
        db.add(company)
        db.flush()
        logger.debug("Created default company")


def create_superuser(db: Session) -> None:
    """Create superuser account"""
    logger.info("Creating superuser...")

    existing = db.query(User).filter(User.email == "admin@fastvue.com").first()
    if not existing:
        # Create superuser
        user = User(
            email="admin@fastvue.com",
            username="admin",
            full_name="System Administrator",
            hashed_password=get_password_hash("admin123"),
            is_active=True,
            is_verified=True,
            is_superuser=True,
        )
        db.add(user)
        db.flush()

        # Get default company
        company = db.query(Company).filter(Company.code == "DEFAULT").first()

        # Get super admin role
        role = db.query(Role).filter(Role.codename == SystemRole.SUPER_ADMIN).first()

        if company and role:
            # Assign user to company with super admin role
            ucr = UserCompanyRole(
                user_id=user.id,
                company_id=company.id,
                role_id=role.id,
                is_default=True,
                is_active=True,
            )
            db.add(ucr)

            # Set current company
            user.current_company_id = company.id

        db.flush()
        logger.info("Created superuser: admin@fastvue.com (password: admin123)")


def create_sample_data(db: Session) -> None:
    """Create sample data for testing and development"""
    logger.info("Creating sample data...")

    # Create sample companies
    sample_companies = [
        {"name": "Acme Corporation", "code": "ACME", "description": "Sample company 1"},
        {"name": "TechStart Inc", "code": "TECHSTART", "description": "Sample company 2"},
        {"name": "Global Services", "code": "GLOBAL", "description": "Sample company 3"},
    ]

    for company_data in sample_companies:
        existing = db.query(Company).filter(Company.code == company_data["code"]).first()
        if not existing:
            company = Company(
                name=company_data["name"],
                code=company_data["code"],
                description=company_data["description"],
                is_active=True,
            )
            db.add(company)
            logger.debug(f"Created sample company: {company_data['name']}")

    db.flush()

    # Create sample users
    sample_users = [
        {"username": "john", "email": "john@example.com", "full_name": "John Doe"},
        {"username": "jane", "email": "jane@example.com", "full_name": "Jane Smith"},
        {"username": "bob", "email": "bob@example.com", "full_name": "Bob Johnson"},
    ]

    editor_role = db.query(Role).filter(Role.codename == SystemRole.EDITOR).first()
    viewer_role = db.query(Role).filter(Role.codename == SystemRole.VIEWER).first()
    acme = db.query(Company).filter(Company.code == "ACME").first()

    for user_data in sample_users:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=get_password_hash("password123"),
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.flush()

            # Assign to ACME company with editor role
            if acme and editor_role:
                ucr = UserCompanyRole(
                    user_id=user.id,
                    company_id=acme.id,
                    role_id=editor_role.id,
                    is_default=True,
                    is_active=True,
                )
                db.add(ucr)
                user.current_company_id = acme.id

            logger.debug(f"Created sample user: {user_data['username']}")

    db.flush()
    logger.info("Sample data created successfully")


def install_base_module(db: Session) -> None:
    """Install the base module by default.

    The base module is required for the module system to function
    and cannot be uninstalled.
    """
    logger.info("Installing base module...")

    try:
        from modules.base.models.module import InstalledModule, serialize_manifest
        from app.core.modules import ModuleLoader, ModuleRegistry
        from app.core.config import settings
        from pathlib import Path

        # Check if already installed
        existing = db.query(InstalledModule).filter(
            InstalledModule.name == "base"
        ).first()

        if existing:
            logger.debug("Base module already installed")
            return

        # Load manifest
        registry = ModuleRegistry.get_registry()
        loader = ModuleLoader(settings.all_addon_paths, registry)
        loader.discover_modules()

        module_path = loader.get_module_path("base")
        if not module_path:
            logger.warning("Base module not found in addon paths")
            return

        manifest = loader.load_manifest(module_path)

        # Create installation record
        base_module = InstalledModule(
            name="base",
            display_name=manifest.get("name", "Base"),
            version=manifest.get("version", "1.0.0"),
            summary=manifest.get("summary", "FastVue Base Module"),
            description=manifest.get("description", ""),
            author=manifest.get("author", "FastVue Team"),
            website=manifest.get("website", ""),
            category=manifest.get("category", "Technical"),
            license=manifest.get("license", "MIT"),
            application=manifest.get("application", False),
            state="installed",
            depends=[],
            manifest_cache=serialize_manifest(manifest),
            module_path=str(module_path),
            auto_install=True,
        )

        db.add(base_module)
        db.flush()
        logger.info("Base module installed successfully")

    except Exception as e:
        logger.warning(f"Could not install base module: {e}")
        # Don't fail initialization if module system isn't ready
