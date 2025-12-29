#!/usr/bin/env python3
"""
FastNext Management CLI

Django-like management commands for FastNext backend.

Usage:
    python manage.py [command] [options]

Commands:
    initdb          - Initialize database and run migrations
    createsuperuser - Create a superuser account
    loaddata        - Load seed/demo data from JSON files
    exportdata      - Export data to JSON files
    shell           - Start interactive Python shell
    run             - Run development server
    test            - Run test suite
    dbshell         - Open database shell
    makemigrations  - Create new migration (alias for alembic revision)
    migrate         - Run database migrations
    downgrade       - Downgrade database to previous migration
    resetdb         - Reset database (WARNING: destroys all data)
    modules         - List installed modules
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import typer
from rich import print as rprint
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Initialize Typer app
app = typer.Typer(
    name="manage",
    help="FastNext Management CLI",
    add_completion=False,
)
console = Console()

# Sub-command groups
db_app = typer.Typer(help="Database management commands")
data_app = typer.Typer(help="Data import/export commands")
module_app = typer.Typer(help="Module management commands")

app.add_typer(db_app, name="db")
app.add_typer(data_app, name="data")
app.add_typer(module_app, name="module")


def get_db_session():
    """Get database session."""
    from app.db.session import SessionLocal
    return SessionLocal()


def get_settings():
    """Get application settings."""
    from app.core.config import settings
    return settings


# =============================================================================
# Database Commands
# =============================================================================

@app.command()
def initdb(
    seed: bool = typer.Option(True, "--seed/--no-seed", help="Load seed data after init"),
):
    """Initialize database with tables and seed data."""
    from app.db.base import Base
    from app.db.session import engine

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Creating database tables...", total=None)

        # Create all tables
        Base.metadata.create_all(bind=engine)
        progress.update(task, description="[green]Database tables created!")

        if seed:
            progress.update(task, description="Loading seed data...")
            _load_seed_data()
            progress.update(task, description="[green]Seed data loaded!")

    rprint("[bold green]✓[/] Database initialized successfully!")


@app.command()
def migrate(
    revision: str = typer.Argument("head", help="Target revision (default: head)"),
):
    """Run database migrations to latest version."""
    import subprocess

    rprint(f"[cyan]Running migrations to {revision}...[/]")
    result = subprocess.run(
        ["alembic", "upgrade", revision],
        cwd=Path(__file__).parent,
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        rprint("[bold green]✓[/] Migrations completed successfully!")
        if result.stdout:
            print(result.stdout)
    else:
        rprint("[bold red]✗[/] Migration failed!")
        if result.stderr:
            print(result.stderr)
        raise typer.Exit(1)


@app.command()
def makemigrations(
    message: str = typer.Option(..., "-m", "--message", help="Migration message"),
    autogenerate: bool = typer.Option(True, "--auto/--empty", help="Auto-generate migration"),
):
    """Create a new database migration."""
    import subprocess

    cmd = ["alembic", "revision"]
    if autogenerate:
        cmd.append("--autogenerate")
    cmd.extend(["-m", message])

    rprint(f"[cyan]Creating migration: {message}[/]")
    result = subprocess.run(
        cmd,
        cwd=Path(__file__).parent,
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        rprint("[bold green]✓[/] Migration created!")
        if result.stdout:
            print(result.stdout)
    else:
        rprint("[bold red]✗[/] Failed to create migration!")
        if result.stderr:
            print(result.stderr)
        raise typer.Exit(1)


@app.command()
def downgrade(
    revision: str = typer.Argument("-1", help="Target revision (default: -1)"),
):
    """Downgrade database to a previous migration."""
    import subprocess

    if not typer.confirm(f"Are you sure you want to downgrade to '{revision}'?"):
        raise typer.Abort()

    rprint(f"[yellow]Downgrading to {revision}...[/]")
    result = subprocess.run(
        ["alembic", "downgrade", revision],
        cwd=Path(__file__).parent,
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        rprint("[bold green]✓[/] Downgrade completed!")
    else:
        rprint("[bold red]✗[/] Downgrade failed!")
        if result.stderr:
            print(result.stderr)
        raise typer.Exit(1)


@app.command()
def resetdb(
    force: bool = typer.Option(False, "--force", "-f", help="Skip confirmation"),
):
    """Reset database by dropping and recreating all tables."""
    from app.db.base import Base
    from app.db.session import engine

    if not force:
        if not typer.confirm(
            "[bold red]WARNING:[/] This will destroy ALL data. Continue?",
            default=False,
        ):
            raise typer.Abort()

    rprint("[yellow]Dropping all tables...[/]")
    Base.metadata.drop_all(bind=engine)

    rprint("[cyan]Creating tables...[/]")
    Base.metadata.create_all(bind=engine)

    rprint("[bold green]✓[/] Database reset complete!")


@app.command()
def dbshell():
    """Open database shell (psql/sqlite3)."""
    import subprocess
    settings = get_settings()

    db_url = settings.SQLALCHEMY_DATABASE_URL

    if "postgresql" in db_url:
        subprocess.run(["psql", db_url])
    elif "sqlite" in db_url:
        db_path = db_url.replace("sqlite:///", "")
        subprocess.run(["sqlite3", db_path])
    else:
        rprint("[red]Unsupported database type[/]")


# =============================================================================
# User Commands
# =============================================================================

@app.command()
def createsuperuser(
    email: str = typer.Option(..., prompt=True, help="Admin email"),
    username: str = typer.Option(..., prompt=True, help="Admin username"),
    password: str = typer.Option(
        ...,
        prompt=True,
        hide_input=True,
        confirmation_prompt=True,
        help="Admin password"
    ),
):
    """Create a superuser account."""
    from app.core.security import get_password_hash
    from app.models.user import User

    db = get_db_session()

    try:
        # Check if user exists
        existing = db.query(User).filter(
            (User.email == email) | (User.username == username)
        ).first()

        if existing:
            rprint("[red]User with this email or username already exists![/]")
            raise typer.Exit(1)

        # Create user
        user = User(
            email=email,
            username=username,
            full_name="System Administrator",
            hashed_password=get_password_hash(password),
            is_active=True,
            is_verified=True,
            is_superuser=True,
        )

        db.add(user)
        db.commit()

        rprint(f"[bold green]✓[/] Superuser '{username}' created successfully!")

    finally:
        db.close()


# =============================================================================
# Data Commands
# =============================================================================

@app.command()
def loaddata(
    file: Path = typer.Argument(
        Path("data/seed.json"),
        help="JSON file to load",
    ),
    clear: bool = typer.Option(False, "--clear", help="Clear existing data first"),
):
    """Load data from JSON file."""
    if not file.exists():
        rprint(f"[red]File not found: {file}[/]")
        raise typer.Exit(1)

    if clear:
        if not typer.confirm("Clear existing data before loading?"):
            raise typer.Abort()

    rprint(f"[cyan]Loading data from {file}...[/]")

    with open(file) as f:
        data = json.load(f)

    _load_data_from_dict(data, clear=clear)

    rprint("[bold green]✓[/] Data loaded successfully!")


def _load_seed_data():
    """Load seed data from default location."""
    seed_file = Path(__file__).parent / "data" / "seed.json"
    if seed_file.exists():
        with open(seed_file) as f:
            data = json.load(f)
        _load_data_from_dict(data)


def _load_data_from_dict(data: dict, clear: bool = False):
    """Load data from dictionary into database."""
    from app.core.security import get_password_hash
    from app.models.role import Role
    from app.models.permission import Permission
    from app.models.user_role import RolePermission
    from app.models.user import User
    from app.models.workflow import WorkflowState
    from app.models.label import Label

    db = get_db_session()

    try:
        # Load roles
        if "roles" in data:
            for role_data in data["roles"]:
                existing = db.query(Role).filter(Role.name == role_data["name"]).first()
                if not existing:
                    role = Role(**role_data)
                    db.add(role)
            db.commit()
            rprint(f"  [green]✓[/] Loaded {len(data['roles'])} roles")

        # Load permissions
        if "permissions" in data:
            for perm_data in data["permissions"]:
                existing = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
                if not existing:
                    perm = Permission(**perm_data)
                    db.add(perm)
            db.commit()
            rprint(f"  [green]✓[/] Loaded {len(data['permissions'])} permissions")

        # Load role-permission associations
        if "role_permissions" in data:
            for role_name, perms in data["role_permissions"].items():
                role = db.query(Role).filter(Role.name == role_name).first()
                if role:
                    if perms == ["*"]:
                        # All permissions for admin
                        all_perms = db.query(Permission).all()
                        for perm in all_perms:
                            existing = db.query(RolePermission).filter(
                                RolePermission.role_id == role.id,
                                RolePermission.permission_id == perm.id
                            ).first()
                            if not existing:
                                rp = RolePermission(role_id=role.id, permission_id=perm.id)
                                db.add(rp)
                    else:
                        for perm_name in perms:
                            perm = db.query(Permission).filter(Permission.name == perm_name).first()
                            if perm:
                                existing = db.query(RolePermission).filter(
                                    RolePermission.role_id == role.id,
                                    RolePermission.permission_id == perm.id
                                ).first()
                                if not existing:
                                    rp = RolePermission(role_id=role.id, permission_id=perm.id)
                                    db.add(rp)
            db.commit()
            rprint(f"  [green]✓[/] Loaded role-permission associations")

        # Load workflow states
        if "workflow_states" in data:
            for state_data in data["workflow_states"]:
                existing = db.query(WorkflowState).filter(
                    WorkflowState.name == state_data["name"]
                ).first()
                if not existing:
                    state = WorkflowState(**state_data)
                    db.add(state)
            db.commit()
            rprint(f"  [green]✓[/] Loaded {len(data['workflow_states'])} workflow states")

        # Load labels
        if "labels" in data:
            for label_data in data["labels"]:
                existing = db.query(Label).filter(Label.name == label_data["name"]).first()
                if not existing:
                    label = Label(**label_data)
                    db.add(label)
            db.commit()
            rprint(f"  [green]✓[/] Loaded {len(data['labels'])} labels")

        # Load demo users
        if "users" in data:
            for user_data in data["users"]:
                existing = db.query(User).filter(User.email == user_data["email"]).first()
                if not existing:
                    password = user_data.pop("password", "password123")
                    role_name = user_data.pop("role", None)

                    user = User(
                        **user_data,
                        hashed_password=get_password_hash(password),
                    )
                    db.add(user)
                    db.flush()

                    # Assign role if specified
                    if role_name:
                        from app.models.user_role import UserRole
                        role = db.query(Role).filter(Role.name == role_name).first()
                        if role:
                            user_role = UserRole(user_id=user.id, role_id=role.id)
                            db.add(user_role)

            db.commit()
            rprint(f"  [green]✓[/] Loaded {len(data['users'])} users")

    finally:
        db.close()


@app.command()
def exportdata(
    output: Path = typer.Argument(
        Path("data/export.json"),
        help="Output JSON file",
    ),
    models: Optional[str] = typer.Option(
        None,
        "--models", "-m",
        help="Comma-separated list of models to export",
    ),
):
    """Export data to JSON file."""
    from app.models.role import Role
    from app.models.permission import Permission
    from app.models.user import User
    from app.models.workflow import WorkflowState
    from app.models.label import Label

    db = get_db_session()

    export = {
        "_meta": {
            "exported_at": datetime.utcnow().isoformat(),
            "version": "1.0.0",
        }
    }

    try:
        # Export roles
        if not models or "roles" in models:
            roles = db.query(Role).all()
            export["roles"] = [
                {
                    "name": r.name,
                    "description": r.description,
                    "is_system_role": r.is_system_role,
                    "is_active": r.is_active,
                }
                for r in roles
            ]

        # Export permissions
        if not models or "permissions" in models:
            perms = db.query(Permission).all()
            export["permissions"] = [
                {
                    "name": p.name,
                    "description": p.description,
                    "action": p.action,
                    "resource": p.resource,
                    "category": p.category,
                    "is_system_permission": p.is_system_permission,
                }
                for p in perms
            ]

        # Export workflow states
        if not models or "workflow_states" in models:
            states = db.query(WorkflowState).all()
            export["workflow_states"] = [
                {
                    "name": s.name,
                    "label": s.label,
                    "description": s.description,
                    "color": s.color,
                    "bg_color": s.bg_color,
                    "icon": s.icon,
                    "is_initial": s.is_initial,
                    "is_final": s.is_final,
                }
                for s in states
            ]

        # Export labels
        if not models or "labels" in models:
            labels = db.query(Label).all()
            export["labels"] = [
                {
                    "name": l.name,
                    "color": l.color,
                    "description": l.description,
                }
                for l in labels
            ]

        # Write to file
        output.parent.mkdir(parents=True, exist_ok=True)
        with open(output, "w") as f:
            json.dump(export, f, indent=2)

        rprint(f"[bold green]✓[/] Data exported to {output}")

    finally:
        db.close()


# =============================================================================
# Development Commands
# =============================================================================

@app.command()
def run(
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind"),
    port: int = typer.Option(8000, "--port", "-p", help="Port to bind"),
    reload: bool = typer.Option(True, "--reload/--no-reload", help="Enable auto-reload"),
):
    """Run development server."""
    import uvicorn

    rprint(f"[cyan]Starting server at http://{host}:{port}[/]")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
    )


@app.command()
def shell():
    """Start interactive Python shell with app context."""
    import code

    # Import common models
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.models.role import Role
    from app.models.permission import Permission
    from app.models.project import Project
    from app.models.message import Message
    from app.models.inbox import InboxItem
    from app.core.config import settings

    db = SessionLocal()

    banner = """
FastNext Shell
==============
Available:
  - db: Database session
  - User, Role, Permission, Project, Message, InboxItem: Models
  - settings: App settings

Example:
  >>> users = db.query(User).all()
  >>> print(len(users))
"""

    local_vars = {
        "db": db,
        "User": User,
        "Role": Role,
        "Permission": Permission,
        "Project": Project,
        "Message": Message,
        "InboxItem": InboxItem,
        "settings": settings,
    }

    code.interact(banner=banner, local=local_vars)
    db.close()


@app.command()
def test(
    path: Optional[str] = typer.Argument(None, help="Test path or pattern"),
    verbose: bool = typer.Option(False, "-v", "--verbose", help="Verbose output"),
    coverage: bool = typer.Option(False, "--cov", help="Run with coverage"),
    markers: Optional[str] = typer.Option(None, "-m", "--markers", help="Run tests with markers"),
):
    """Run test suite."""
    import subprocess

    cmd = ["pytest"]

    if verbose:
        cmd.append("-v")

    if coverage:
        cmd.extend(["--cov=app", "--cov-report=term-missing"])

    if markers:
        cmd.extend(["-m", markers])

    if path:
        cmd.append(path)

    rprint(f"[cyan]Running: {' '.join(cmd)}[/]")
    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    raise typer.Exit(result.returncode)


# =============================================================================
# Module Commands
# =============================================================================

@module_app.command("list")
def list_modules():
    """List all installed modules."""
    try:
        from modules.base.models.module import InstalledModule

        db = get_db_session()
        modules = db.query(InstalledModule).all()

        if not modules:
            rprint("[yellow]No modules installed[/]")
            return

        table = Table(title="Installed Modules")
        table.add_column("Name", style="cyan")
        table.add_column("Version", style="green")
        table.add_column("State", style="yellow")
        table.add_column("Auto Install", style="blue")

        for mod in modules:
            table.add_row(
                mod.name,
                mod.version or "N/A",
                mod.state,
                "Yes" if mod.auto_install else "No",
            )

        console.print(table)
        db.close()

    except ImportError:
        rprint("[yellow]Module system not available. Run migrations first.[/]")


@module_app.command("install")
def install_module(
    name: str = typer.Argument(..., help="Module name to install"),
):
    """Install a module by name."""
    rprint(f"[cyan]Installing module: {name}[/]")

    try:
        from app.core.modules.loader import ModuleLoader

        loader = ModuleLoader()
        loader.install_module(name)

        rprint(f"[bold green]✓[/] Module '{name}' installed successfully!")

    except ImportError:
        rprint("[red]Module system not available[/]")
    except Exception as e:
        rprint(f"[red]Failed to install module: {e}[/]")
        raise typer.Exit(1)


@module_app.command("upgrade")
def upgrade_module(
    name: str = typer.Argument(..., help="Module name to upgrade"),
):
    """Upgrade a module to latest version."""
    rprint(f"[cyan]Upgrading module: {name}[/]")

    try:
        from app.core.modules.loader import ModuleLoader

        loader = ModuleLoader()
        loader.upgrade_module(name)

        rprint(f"[bold green]✓[/] Module '{name}' upgraded successfully!")

    except Exception as e:
        rprint(f"[red]Failed to upgrade module: {e}[/]")
        raise typer.Exit(1)


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    app()
