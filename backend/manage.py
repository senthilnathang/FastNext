#!/usr/bin/env python3
"""
FastVue Management CLI

Similar to Django's manage.py, provides commands for:
- createsuperuser: Create a superuser account
- runserver: Start the development server
- shell: Interactive Python shell with app context
- initdb: Initialize database with default data
- migrate: Run database migrations
- makemigrations: Create new migration
- showmigrations: Show migration status
- dbshell: Open database shell
"""

import getpass
import os
import re
import subprocess
import sys
from typing import Optional

import typer
from rich import print as rprint
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = typer.Typer(
    name="manage",
    help="FastVue Management CLI - Django-like management commands for FastAPI",
    add_completion=False,
)
console = Console()


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None


def validate_username(username: str) -> bool:
    """Validate username format"""
    pattern = r"^[a-zA-Z0-9_]{3,50}$"
    return re.match(pattern, username) is not None


@app.command()
def createsuperuser(
    username: Optional[str] = typer.Option(None, "--username", "-u", help="Username for superuser"),
    email: Optional[str] = typer.Option(None, "--email", "-e", help="Email for superuser"),
    password: Optional[str] = typer.Option(None, "--password", "-p", help="Password (not recommended, use interactive mode)"),
    no_input: bool = typer.Option(False, "--no-input", help="Use provided options without prompting"),
):
    """
    Create a superuser account.

    Similar to Django's createsuperuser command.

    Examples:
        python manage.py createsuperuser
        python manage.py createsuperuser --username admin --email admin@example.com
        python manage.py createsuperuser -u admin -e admin@example.com --no-input -p secretpass
    """
    from sqlalchemy import select

    from app.core.security import get_password_hash
    from app.db.base import SessionLocal
    from app.models.user import User

    rprint(Panel.fit("[bold blue]FastVue Superuser Creation[/bold blue]"))

    # Get username
    if not username:
        if no_input:
            rprint("[red]Error: --username is required with --no-input[/red]")
            raise typer.Exit(1)
        while True:
            username = Prompt.ask("[cyan]Username[/cyan]")
            if not username:
                rprint("[yellow]Username cannot be empty[/yellow]")
                continue
            if not validate_username(username):
                rprint("[yellow]Username must be 3-50 characters, alphanumeric and underscores only[/yellow]")
                continue
            break

    # Get email
    if not email:
        if no_input:
            rprint("[red]Error: --email is required with --no-input[/red]")
            raise typer.Exit(1)
        while True:
            email = Prompt.ask("[cyan]Email[/cyan]")
            if not email:
                rprint("[yellow]Email cannot be empty[/yellow]")
                continue
            if not validate_email(email):
                rprint("[yellow]Please enter a valid email address[/yellow]")
                continue
            break

    # Get password
    if not password:
        if no_input:
            rprint("[red]Error: --password is required with --no-input[/red]")
            raise typer.Exit(1)
        while True:
            password = getpass.getpass("Password: ")
            if not password:
                rprint("[yellow]Password cannot be empty[/yellow]")
                continue
            if len(password) < 8:
                rprint("[yellow]Password must be at least 8 characters[/yellow]")
                continue

            password_confirm = getpass.getpass("Password (again): ")
            if password != password_confirm:
                rprint("[yellow]Passwords do not match[/yellow]")
                continue
            break

    # Create user in database
    db = SessionLocal()
    try:
        # Check if username exists
        existing_user = db.execute(
            select(User).where(User.username == username)
        ).scalar_one_or_none()

        if existing_user:
            rprint(f"[red]Error: Username '{username}' already exists[/red]")
            raise typer.Exit(1)

        # Check if email exists
        existing_email = db.execute(
            select(User).where(User.email == email)
        ).scalar_one_or_none()

        if existing_email:
            rprint(f"[red]Error: Email '{email}' already exists[/red]")
            raise typer.Exit(1)

        # Create superuser
        user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_verified=True,
            is_superuser=True,
            full_name=username.title(),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        rprint(f"\n[green]Superuser created successfully![/green]")
        rprint(f"  [cyan]ID:[/cyan] {user.id}")
        rprint(f"  [cyan]Username:[/cyan] {user.username}")
        rprint(f"  [cyan]Email:[/cyan] {user.email}")
        rprint(f"  [cyan]Superuser:[/cyan] Yes")

    except Exception as e:
        db.rollback()
        rprint(f"[red]Error creating superuser: {e}[/red]")
        raise typer.Exit(1)
    finally:
        db.close()


@app.command()
def runserver(
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind"),
    port: int = typer.Option(8000, "--port", "-p", help="Port to bind"),
    reload: bool = typer.Option(True, "--reload/--no-reload", help="Enable auto-reload"),
    workers: int = typer.Option(1, "--workers", "-w", help="Number of workers (ignored if reload is enabled)"),
):
    """
    Start the development server.

    Examples:
        python manage.py runserver
        python manage.py runserver --port 8080
        python manage.py runserver --no-reload --workers 4
    """
    import uvicorn

    rprint(Panel.fit(f"[bold green]Starting FastVue server at http://{host}:{port}[/bold green]"))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        workers=1 if reload else workers,
    )


@app.command()
def shell():
    """
    Start an interactive Python shell with app context.

    Provides access to:
    - db: Database session
    - User, Company, Role, etc.: All models
    - settings: Application settings
    """
    try:
        from IPython import embed
        use_ipython = True
    except ImportError:
        use_ipython = False

    from app.core.config import settings
    from app.db.base import SessionLocal
    from app.models.audit import AuditLog
    from app.models.company import Company
    from app.models.group import Group, UserGroup
    from app.models.permission import Permission
    from app.models.role import Role, RolePermission
    from app.models.user import User
    from app.models.user_company_role import UserCompanyRole

    db = SessionLocal()

    banner = """
FastVue Interactive Shell
==========================
Available objects:
  - db: Database session (remember to db.commit() and db.close())
  - User, Company, Role, Permission, Group: Models
  - settings: Application settings

Examples:
  users = db.query(User).all()
  user = db.query(User).filter(User.username == 'admin').first()
  db.close()
"""

    namespace = {
        "db": db,
        "User": User,
        "Company": Company,
        "Role": Role,
        "Permission": Permission,
        "Group": Group,
        "UserGroup": UserGroup,
        "RolePermission": RolePermission,
        "UserCompanyRole": UserCompanyRole,
        "AuditLog": AuditLog,
        "settings": settings,
    }

    rprint(Panel.fit("[bold blue]FastVue Interactive Shell[/bold blue]"))

    if use_ipython:
        embed(user_ns=namespace, banner1=banner)
    else:
        import code
        code.interact(banner=banner, local=namespace)

    db.close()


@app.command()
def initdb(
    with_sample_data: bool = typer.Option(False, "--sample-data", help="Include sample data"),
    create_tables: bool = typer.Option(False, "--create-tables", help="Create tables using SQLAlchemy (skip if using Alembic)"),
    run_migrations: bool = typer.Option(True, "--migrate/--no-migrate", help="Run Alembic migrations first"),
):
    """
    Initialize the database with default data.

    Creates:
    - Default roles (Admin, Editor, Viewer, Member)
    - Default permissions
    - Default company (optional)

    By default, runs Alembic migrations first to ensure tables exist.

    Examples:
        python manage.py initdb
        python manage.py initdb --sample-data
        python manage.py initdb --create-tables --no-migrate  # Use SQLAlchemy instead of Alembic
    """
    from app.db.init_db import init_db
    from app.db.base import SessionLocal, engine, Base

    rprint(Panel.fit("[bold blue]Initializing Database[/bold blue]"))

    # Step 1: Ensure tables exist
    if create_tables:
        rprint("[cyan]Creating tables using SQLAlchemy...[/cyan]")
        # Import all models to register them with Base
        from app.models import (
            User, Company, Role, Permission, Group,
            UserCompanyRole, UserGroup, RolePermission, GroupPermission,
            SocialAccount, AuditLog
        )
        Base.metadata.create_all(bind=engine)
        rprint("[green]Tables created[/green]")
    elif run_migrations:
        rprint("[cyan]Running Alembic migrations...[/cyan]")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            rprint("[green]Migrations applied[/green]")
        else:
            rprint(f"[red]Migration failed: {result.stderr}[/red]")
            rprint("[yellow]Tip: Use --create-tables --no-migrate to create tables without Alembic[/yellow]")
            raise typer.Exit(1)

    # Step 2: Initialize data
    rprint("[cyan]Initializing default data...[/cyan]")
    db = SessionLocal()
    try:
        init_db(db, with_sample_data=with_sample_data)
        rprint("[green]Database initialized successfully![/green]")
        rprint("\n[bold]Created:[/bold]")
        rprint("  - Default permissions")
        rprint("  - Default roles (Super Admin, Admin, Editor, Viewer, Member)")
        rprint("  - Default company")
        rprint("  - Superuser: admin@fastvue.com (password: admin123)")
        if with_sample_data:
            rprint("  - Sample companies and users")
    except Exception as e:
        db.rollback()
        rprint(f"[red]Error initializing database: {e}[/red]")
        raise typer.Exit(1)
    finally:
        db.close()


@app.command()
def migrate(
    revision: str = typer.Option("head", "--revision", "-r", help="Revision to migrate to"),
):
    """
    Run database migrations.

    Examples:
        python manage.py migrate
        python manage.py migrate --revision head
        python manage.py migrate -r abc123
    """
    rprint(Panel.fit("[bold blue]Running Migrations[/bold blue]"))

    result = subprocess.run(
        ["alembic", "upgrade", revision],
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        rprint("[green]Migrations applied successfully![/green]")
        if result.stdout:
            rprint(result.stdout)
    else:
        rprint(f"[red]Migration failed:[/red]")
        rprint(result.stderr)
        raise typer.Exit(1)


@app.command()
def makemigrations(
    message: str = typer.Option(..., "--message", "-m", help="Migration message"),
    autogenerate: bool = typer.Option(True, "--autogenerate/--empty", help="Auto-detect model changes"),
):
    """
    Create a new migration.

    Examples:
        python manage.py makemigrations -m "add user table"
        python manage.py makemigrations -m "manual migration" --empty
    """
    rprint(Panel.fit("[bold blue]Creating Migration[/bold blue]"))

    cmd = ["alembic", "revision"]
    if autogenerate:
        cmd.append("--autogenerate")
    cmd.extend(["-m", message])

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        rprint("[green]Migration created successfully![/green]")
        if result.stdout:
            rprint(result.stdout)
    else:
        rprint(f"[red]Failed to create migration:[/red]")
        rprint(result.stderr)
        raise typer.Exit(1)


@app.command()
def showmigrations():
    """
    Show migration history and status.
    """
    rprint(Panel.fit("[bold blue]Migration History[/bold blue]"))

    result = subprocess.run(
        ["alembic", "history", "--verbose"],
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        rprint(result.stdout)

        # Show current revision
        rprint("\n[bold]Current revision:[/bold]")
        current = subprocess.run(
            ["alembic", "current"],
            capture_output=True,
            text=True,
        )
        rprint(current.stdout if current.stdout else "[yellow]No migrations applied[/yellow]")
    else:
        rprint(f"[red]Error:[/red] {result.stderr}")
        raise typer.Exit(1)


@app.command()
def dbshell():
    """
    Open database shell (psql for PostgreSQL).
    """
    from app.core.config import settings

    rprint(Panel.fit("[bold blue]Opening Database Shell[/bold blue]"))

    # Parse database URL
    db_url = settings.SQLALCHEMY_DATABASE_URI

    if "postgresql" in db_url:
        # Extract connection info
        # Format: postgresql://user:pass@host:port/dbname
        import urllib.parse
        parsed = urllib.parse.urlparse(db_url)

        env = os.environ.copy()
        env["PGPASSWORD"] = parsed.password or ""

        cmd = [
            "psql",
            "-h", parsed.hostname or "localhost",
            "-p", str(parsed.port or 5432),
            "-U", parsed.username or "postgres",
            "-d", parsed.path.lstrip("/"),
        ]

        subprocess.run(cmd, env=env)
    else:
        rprint("[yellow]Database shell only supported for PostgreSQL[/yellow]")
        raise typer.Exit(1)


@app.command()
def createdb(
    name: Optional[str] = typer.Option(None, "--name", "-n", help="Database name (defaults to config)"),
    owner: Optional[str] = typer.Option(None, "--owner", "-o", help="Database owner"),
    encoding: str = typer.Option("UTF8", "--encoding", "-E", help="Database encoding"),
    template: str = typer.Option("template0", "--template", "-T", help="Template database"),
):
    """
    Create the database from configuration.

    Similar to PostgreSQL's createdb command, but reads connection info from config.

    Examples:
        python manage.py createdb
        python manage.py createdb --name mydb
        python manage.py createdb --owner postgres --encoding UTF8
    """
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    from app.core.config import settings

    db_name = name or settings.POSTGRES_DB
    db_owner = owner or settings.POSTGRES_USER

    rprint(Panel.fit(f"[bold blue]Creating Database: {db_name}[/bold blue]"))

    try:
        # Connect to PostgreSQL server (to 'postgres' database)
        conn = psycopg2.connect(
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            database="postgres",  # Connect to default postgres database
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (db_name,)
        )
        exists = cursor.fetchone()

        if exists:
            rprint(f"[yellow]Database '{db_name}' already exists[/yellow]")
            cursor.close()
            conn.close()
            return

        # Create database
        # Note: Can't use parameterized queries for CREATE DATABASE
        create_sql = f'CREATE DATABASE "{db_name}" WITH OWNER = "{db_owner}" ENCODING = \'{encoding}\' TEMPLATE = {template}'
        cursor.execute(create_sql)

        rprint(f"[green]Database '{db_name}' created successfully![/green]")
        rprint(f"  [cyan]Owner:[/cyan] {db_owner}")
        rprint(f"  [cyan]Encoding:[/cyan] {encoding}")
        rprint(f"  [cyan]Host:[/cyan] {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        rprint(f"[red]Error creating database: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def dropdb(
    name: Optional[str] = typer.Option(None, "--name", "-n", help="Database name (defaults to config)"),
    force: bool = typer.Option(False, "--force", "-f", help="Force drop without confirmation"),
):
    """
    Drop the database.

    WARNING: This will permanently delete all data!

    Examples:
        python manage.py dropdb
        python manage.py dropdb --name mydb
        python manage.py dropdb --force
    """
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    from app.core.config import settings

    db_name = name or settings.POSTGRES_DB

    rprint(Panel.fit(f"[bold red]Drop Database: {db_name}[/bold red]"))

    if not force:
        rprint(f"[bold red]WARNING: This will permanently delete database '{db_name}' and ALL its data![/bold red]")
        if not Confirm.ask(f"Are you sure you want to drop '{db_name}'?"):
            rprint("[yellow]Cancelled[/yellow]")
            return

    try:
        # Connect to PostgreSQL server
        conn = psycopg2.connect(
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            database="postgres",
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (db_name,)
        )
        exists = cursor.fetchone()

        if not exists:
            rprint(f"[yellow]Database '{db_name}' does not exist[/yellow]")
            cursor.close()
            conn.close()
            return

        # Terminate all connections to the database
        cursor.execute(f"""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = %s
            AND pid <> pg_backend_pid()
        """, (db_name,))

        # Drop database
        cursor.execute(f'DROP DATABASE "{db_name}"')

        rprint(f"[green]Database '{db_name}' dropped successfully[/green]")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        rprint(f"[red]Error dropping database: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def resetdb(
    force: bool = typer.Option(False, "--force", "-f", help="Force reset without confirmation"),
    with_sample_data: bool = typer.Option(False, "--sample-data", help="Include sample data after reset"),
):
    """
    Reset the database (drop, create, migrate, and initialize).

    This is a convenience command that:
    1. Drops the existing database
    2. Creates a new database
    3. Runs all migrations
    4. Initializes default data

    Examples:
        python manage.py resetdb
        python manage.py resetdb --force --sample-data
    """
    from app.core.config import settings

    db_name = settings.POSTGRES_DB

    rprint(Panel.fit(f"[bold red]Reset Database: {db_name}[/bold red]"))

    if not force:
        rprint(f"[bold red]WARNING: This will delete and recreate database '{db_name}'![/bold red]")
        if not Confirm.ask(f"Are you sure you want to reset '{db_name}'?"):
            rprint("[yellow]Cancelled[/yellow]")
            return

    # Step 1: Drop database
    rprint("\n[bold]Step 1/4: Dropping database...[/bold]")
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

        conn = psycopg2.connect(
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            database="postgres",
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        # Terminate connections
        cursor.execute(f"""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = %s
            AND pid <> pg_backend_pid()
        """, (db_name,))

        # Drop if exists
        cursor.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
        rprint("[green]  Database dropped[/green]")

        # Step 2: Create database
        rprint("\n[bold]Step 2/4: Creating database...[/bold]")
        cursor.execute(f'CREATE DATABASE "{db_name}" WITH OWNER = "{settings.POSTGRES_USER}" ENCODING = \'UTF8\'')
        rprint("[green]  Database created[/green]")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        rprint(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)

    # Step 3: Run migrations
    rprint("\n[bold]Step 3/4: Running migrations...[/bold]")
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        rprint("[green]  Migrations applied[/green]")
    else:
        rprint(f"[red]  Migration failed: {result.stderr}[/red]")
        raise typer.Exit(1)

    # Step 4: Initialize data
    rprint("\n[bold]Step 4/4: Initializing data...[/bold]")
    from app.db.init_db import init_db
    from app.db.base import SessionLocal

    db = SessionLocal()
    try:
        init_db(db, with_sample_data=with_sample_data)
        rprint("[green]  Data initialized[/green]")
    finally:
        db.close()

    rprint(f"\n[bold green]Database '{db_name}' reset successfully![/bold green]")


@app.command()
def showusers(
    limit: int = typer.Option(20, "--limit", "-l", help="Number of users to show"),
    superusers_only: bool = typer.Option(False, "--superusers", "-s", help="Show only superusers"),
):
    """
    List users in the database.
    """
    from sqlalchemy import select

    from app.db.base import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    try:
        query = select(User)
        if superusers_only:
            query = query.where(User.is_superuser == True)
        query = query.limit(limit)

        users = db.execute(query).scalars().all()

        if not users:
            rprint("[yellow]No users found[/yellow]")
            return

        table = Table(title="Users")
        table.add_column("ID", style="cyan")
        table.add_column("Username", style="green")
        table.add_column("Email", style="blue")
        table.add_column("Active", style="yellow")
        table.add_column("Superuser", style="red")
        table.add_column("Created", style="magenta")

        for user in users:
            table.add_row(
                str(user.id),
                user.username,
                user.email,
                "Yes" if user.is_active else "No",
                "Yes" if user.is_superuser else "No",
                user.created_at.strftime("%Y-%m-%d %H:%M") if user.created_at else "-",
            )

        console.print(table)

    finally:
        db.close()


@app.command()
def changepassword(
    username: str = typer.Argument(..., help="Username of the user"),
):
    """
    Change a user's password.

    Example:
        python manage.py changepassword admin
    """
    from sqlalchemy import select

    from app.core.security import get_password_hash
    from app.db.base import SessionLocal
    from app.models.user import User

    rprint(Panel.fit(f"[bold blue]Change Password for '{username}'[/bold blue]"))

    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.username == username)
        ).scalar_one_or_none()

        if not user:
            rprint(f"[red]Error: User '{username}' not found[/red]")
            raise typer.Exit(1)

        while True:
            password = getpass.getpass("New password: ")
            if not password:
                rprint("[yellow]Password cannot be empty[/yellow]")
                continue
            if len(password) < 8:
                rprint("[yellow]Password must be at least 8 characters[/yellow]")
                continue

            password_confirm = getpass.getpass("New password (again): ")
            if password != password_confirm:
                rprint("[yellow]Passwords do not match[/yellow]")
                continue
            break

        user.hashed_password = get_password_hash(password)
        db.commit()

        rprint(f"[green]Password changed successfully for '{username}'[/green]")

    except Exception as e:
        db.rollback()
        rprint(f"[red]Error changing password: {e}[/red]")
        raise typer.Exit(1)
    finally:
        db.close()


@app.command()
def promoteuser(
    username: str = typer.Argument(..., help="Username to promote"),
):
    """
    Promote a user to superuser.

    Example:
        python manage.py promoteuser johndoe
    """
    from sqlalchemy import select

    from app.db.base import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.username == username)
        ).scalar_one_or_none()

        if not user:
            rprint(f"[red]Error: User '{username}' not found[/red]")
            raise typer.Exit(1)

        if user.is_superuser:
            rprint(f"[yellow]User '{username}' is already a superuser[/yellow]")
            return

        if not Confirm.ask(f"Promote '{username}' to superuser?"):
            rprint("[yellow]Cancelled[/yellow]")
            return

        user.is_superuser = True
        db.commit()

        rprint(f"[green]User '{username}' promoted to superuser[/green]")

    except Exception as e:
        db.rollback()
        rprint(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)
    finally:
        db.close()


@app.command()
def demoteuser(
    username: str = typer.Argument(..., help="Username to demote"),
):
    """
    Remove superuser status from a user.

    Example:
        python manage.py demoteuser johndoe
    """
    from sqlalchemy import select

    from app.db.base import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.username == username)
        ).scalar_one_or_none()

        if not user:
            rprint(f"[red]Error: User '{username}' not found[/red]")
            raise typer.Exit(1)

        if not user.is_superuser:
            rprint(f"[yellow]User '{username}' is not a superuser[/yellow]")
            return

        if not Confirm.ask(f"Remove superuser status from '{username}'?"):
            rprint("[yellow]Cancelled[/yellow]")
            return

        user.is_superuser = False
        db.commit()

        rprint(f"[green]Superuser status removed from '{username}'[/green]")

    except Exception as e:
        db.rollback()
        rprint(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)
    finally:
        db.close()


@app.command()
def load_data(
    file: str = typer.Option("data/demo.json", "--file", "-f", help="JSON file path"),
    clear: bool = typer.Option(False, "--clear", "-c", help="Clear existing data first"),
):
    """
    Load demo/seed data from JSON file.

    Examples:
        python manage.py load_data
        python manage.py load_data --file data/demo.json
        python manage.py load_data --file data/custom.json --clear
    """
    import json
    from pathlib import Path
    from sqlalchemy import text

    from app.core.security import get_password_hash
    from app.db.base import SessionLocal
    from app.models.user import User
    from app.models.company import Company
    from app.models.role import Role
    from app.models.permission import Permission
    from app.models.group import Group
    from app.models.user_company_role import UserCompanyRole
    from app.models.notification import Notification
    from app.models.activity_log import ActivityLog
    from app.models.message import Message

    rprint(Panel.fit(f"[bold blue]Loading Data from {file}[/bold blue]"))

    # Check file exists
    file_path = Path(file)
    if not file_path.exists():
        rprint(f"[red]Error: File '{file}' not found[/red]")
        raise typer.Exit(1)

    # Load JSON
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        rprint(f"[red]Error parsing JSON: {e}[/red]")
        raise typer.Exit(1)

    db = SessionLocal()
    stats = {}

    try:
        if clear:
            rprint("[yellow]Clearing existing data...[/yellow]")
            tables = [
                "messages", "activity_logs", "notifications",
                "user_company_roles", "user_groups", "group_permissions",
                "role_permissions", "groups", "users", "roles",
                "permissions", "companies"
            ]
            for table in tables:
                try:
                    db.execute(text(f"DELETE FROM {table}"))
                except Exception:
                    pass
            db.commit()

        # Load companies (two passes - first without parent refs, then update parents)
        if "companies" in data:
            rprint("[cyan]Loading companies...[/cyan]")
            count = 0
            parent_refs = {}  # code -> parent_code mapping

            # First pass: Create all companies without parent references
            for item in data["companies"]:
                item.pop("id", None)
                parent_code = item.pop("parent_company_code", None)
                item.pop("parent_company_id", None)  # Remove any existing ID ref

                code = item.get("code")
                if parent_code:
                    parent_refs[code] = parent_code

                existing = db.query(Company).filter(Company.code == code).first()
                if not existing:
                    company = Company(**item)
                    db.add(company)
                    count += 1
            db.flush()

            # Second pass: Update parent company references
            for child_code, parent_code in parent_refs.items():
                parent = db.query(Company).filter(Company.code == parent_code).first()
                child = db.query(Company).filter(Company.code == child_code).first()
                if parent and child:
                    child.parent_company_id = parent.id
            db.flush()

            stats["companies"] = count

        # Load permissions
        if "permissions" in data:
            rprint("[cyan]Loading permissions...[/cyan]")
            count = 0
            for item in data["permissions"]:
                item.pop("id", None)
                # Auto-generate codename from name if not provided
                if "codename" not in item or not item.get("codename"):
                    item["codename"] = item.get("name", "")
                existing = db.query(Permission).filter(Permission.name == item.get("name")).first()
                if not existing:
                    permission = Permission(**item)
                    db.add(permission)
                    count += 1
            db.flush()
            stats["permissions"] = count

        # Load roles
        if "roles" in data:
            rprint("[cyan]Loading roles...[/cyan]")
            count = 0
            for item in data["roles"]:
                item.pop("id", None)
                permission_names = item.pop("permissions", [])
                company_code = item.pop("company_code", None)

                # Auto-generate codename from name if not provided
                if "codename" not in item or not item.get("codename"):
                    item["codename"] = item.get("name", "").lower().replace(" ", "_")

                existing = db.query(Role).filter(Role.name == item.get("name")).first()
                if not existing:
                    if company_code:
                        company = db.query(Company).filter(Company.code == company_code).first()
                        if company:
                            item["company_id"] = company.id

                    role = Role(**item)
                    db.add(role)
                    db.flush()

                    for perm_name in permission_names:
                        perm = db.query(Permission).filter(Permission.name == perm_name).first()
                        if perm:
                            role.permissions.append(perm)
                    count += 1
            db.flush()
            stats["roles"] = count

        # Load users
        if "users" in data:
            rprint("[cyan]Loading users...[/cyan]")
            count = 0
            for item in data["users"]:
                item.pop("id", None)
                password = item.pop("password", None)
                company_code = item.pop("current_company_code", None)

                existing = db.query(User).filter(User.email == item.get("email")).first()
                if not existing:
                    if password:
                        item["hashed_password"] = get_password_hash(password)
                    if company_code:
                        company = db.query(Company).filter(Company.code == company_code).first()
                        if company:
                            item["current_company_id"] = company.id

                    user = User(**item)
                    db.add(user)
                    count += 1
            db.flush()
            stats["users"] = count

        # Load groups
        if "groups" in data:
            rprint("[cyan]Loading groups...[/cyan]")
            count = 0
            for item in data["groups"]:
                item.pop("id", None)
                company_code = item.pop("company_code", None)
                item.pop("company_id", None)  # Remove numeric ID to use code reference
                user_emails = item.pop("users", [])
                permission_names = item.pop("permissions", [])

                # Auto-generate codename from name if not provided
                if "codename" not in item or not item.get("codename"):
                    item["codename"] = item.get("name", "").lower().replace(" ", "_")

                existing = db.query(Group).filter(Group.name == item.get("name")).first()
                if not existing:
                    if company_code:
                        company = db.query(Company).filter(Company.code == company_code).first()
                        if company:
                            item["company_id"] = company.id

                    group = Group(**item)
                    db.add(group)
                    db.flush()

                    for email in user_emails:
                        user = db.query(User).filter(User.email == email).first()
                        if user:
                            group.users.append(user)

                    for perm_name in permission_names:
                        perm = db.query(Permission).filter(Permission.name == perm_name).first()
                        if perm:
                            group.permissions.append(perm)
                    count += 1
            db.flush()
            stats["groups"] = count

        # Load user_company_roles
        if "user_company_roles" in data:
            rprint("[cyan]Loading user company roles...[/cyan]")
            count = 0
            for item in data["user_company_roles"]:
                item.pop("id", None)
                user_email = item.pop("user_email", None)
                company_code = item.pop("company_code", None)
                role_name = item.pop("role_name", None)
                item.pop("assigned_by_email", None)

                user = db.query(User).filter(User.email == user_email).first() if user_email else None
                company = db.query(Company).filter(Company.code == company_code).first() if company_code else None
                role = db.query(Role).filter(Role.name == role_name).first() if role_name else None

                if user and company and role:
                    existing = db.query(UserCompanyRole).filter(
                        UserCompanyRole.user_id == user.id,
                        UserCompanyRole.company_id == company.id,
                        UserCompanyRole.role_id == role.id
                    ).first()
                    if not existing:
                        ucr = UserCompanyRole(
                            user_id=user.id,
                            company_id=company.id,
                            role_id=role.id,
                            is_default=item.get("is_default", False)
                        )
                        db.add(ucr)
                        count += 1
            db.flush()
            stats["user_company_roles"] = count

        # Load notifications
        if "notifications" in data:
            rprint("[cyan]Loading notifications...[/cyan]")
            count = 0
            for item in data["notifications"]:
                item.pop("id", None)
                user_email = item.pop("user_email", None)
                user = db.query(User).filter(User.email == user_email).first() if user_email else None
                if user:
                    item["user_id"] = user.id
                    notification = Notification(**item)
                    db.add(notification)
                    count += 1
            db.flush()
            stats["notifications"] = count

        # Load activity_logs
        if "activity_logs" in data:
            rprint("[cyan]Loading activity logs...[/cyan]")
            count = 0
            for item in data["activity_logs"]:
                item.pop("id", None)
                user_email = item.pop("user_email", None)
                company_code = item.pop("company_code", None)
                item.pop("user_id", None)  # Remove numeric IDs
                item.pop("company_id", None)
                item.pop("entity_id", None)  # Remove entity_id as entities are recreated

                user = db.query(User).filter(User.email == user_email).first() if user_email else None
                company = db.query(Company).filter(Company.code == company_code).first() if company_code else None

                if user:
                    item["user_id"] = user.id
                if company:
                    item["company_id"] = company.id

                log = ActivityLog(**item)
                db.add(log)
                count += 1
            db.flush()
            stats["activity_logs"] = count

        # Load messages
        if "messages" in data:
            rprint("[cyan]Loading messages...[/cyan]")
            count = 0
            for item in data["messages"]:
                item.pop("id", None)
                item.pop("parent_id", None)
                item.pop("user_id", None)  # Remove numeric ID
                item.pop("record_id", None)  # Remove record_id as entities are recreated
                user_email = item.pop("user_email", None)

                user = db.query(User).filter(User.email == user_email).first() if user_email else None
                if user:
                    item["user_id"] = user.id

                # Set default record_id if not present
                if "record_id" not in item:
                    item["record_id"] = 0

                message = Message(**item)
                db.add(message)
                count += 1
            db.flush()
            stats["messages"] = count

        db.commit()

        rprint("\n[green]Data loaded successfully![/green]")
        rprint("-" * 40)
        for model, count in stats.items():
            rprint(f"  {model}: {count} records")
        rprint("-" * 40)

    except Exception as e:
        db.rollback()
        rprint(f"[red]Error loading data: {e}[/red]")
        import traceback
        traceback.print_exc()
        raise typer.Exit(1)
    finally:
        db.close()


@app.command()
def export_data(
    file: str = typer.Option("data/export.json", "--file", "-f", help="Output JSON file path"),
    include_all: bool = typer.Option(False, "--all", "-a", help="Include logs and messages"),
):
    """
    Export data to JSON file.

    Examples:
        python manage.py export_data
        python manage.py export_data --file data/backup.json
        python manage.py export_data --all
    """
    import json
    from pathlib import Path
    from datetime import datetime

    from app.db.base import SessionLocal
    from app.models.user import User
    from app.models.company import Company
    from app.models.role import Role
    from app.models.permission import Permission
    from app.models.group import Group
    from app.models.user_company_role import UserCompanyRole

    rprint(Panel.fit(f"[bold blue]Exporting Data to {file}[/bold blue]"))

    db = SessionLocal()
    try:
        data = {
            "meta": {
                "exported_at": datetime.utcnow().isoformat(),
                "version": "1.0"
            }
        }

        # Export companies
        rprint("[cyan]Exporting companies...[/cyan]")
        companies = db.query(Company).all()
        data["companies"] = [{
            "name": c.name,
            "code": c.code,
            "address": c.address,
            "city": c.city,
            "state": c.state,
            "country": c.country,
            "zip_code": c.zip_code,
            "phone": c.phone,
            "email": c.email,
            "website": c.website,
            "is_active": c.is_active,
        } for c in companies]

        # Export permissions
        rprint("[cyan]Exporting permissions...[/cyan]")
        permissions = db.query(Permission).all()
        data["permissions"] = [{
            "name": p.name,
            "description": p.description,
            "category": p.category,
            "action": p.action,
            "resource": p.resource,
        } for p in permissions]

        # Export roles
        rprint("[cyan]Exporting roles...[/cyan]")
        roles = db.query(Role).all()
        data["roles"] = [{
            "name": r.name,
            "description": r.description,
            "is_system_role": r.is_system_role,
            "permissions": [p.name for p in r.permissions],
        } for r in roles]

        # Export users (without passwords)
        rprint("[cyan]Exporting users...[/cyan]")
        users = db.query(User).all()
        data["users"] = [{
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "is_superuser": u.is_superuser,
        } for u in users]

        # Export groups
        rprint("[cyan]Exporting groups...[/cyan]")
        groups = db.query(Group).all()
        data["groups"] = [{
            "name": g.name,
            "description": g.description,
            "is_active": g.is_active,
            "users": [u.email for u in g.users],
            "permissions": [p.name for p in g.permissions],
        } for g in groups]

        # Export user_company_roles
        rprint("[cyan]Exporting user company roles...[/cyan]")
        ucrs = db.query(UserCompanyRole).all()
        data["user_company_roles"] = [{
            "user_email": db.query(User).get(ucr.user_id).email if ucr.user_id else None,
            "company_code": db.query(Company).get(ucr.company_id).code if ucr.company_id else None,
            "role_name": db.query(Role).get(ucr.role_id).name if ucr.role_id else None,
            "is_default": ucr.is_default,
        } for ucr in ucrs]

        if include_all:
            from app.models.notification import Notification
            from app.models.activity_log import ActivityLog
            from app.models.message import Message

            # Export notifications
            notifications = db.query(Notification).limit(1000).all()
            data["notifications"] = [{
                "user_email": db.query(User).get(n.user_id).email if n.user_id else None,
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "is_read": n.is_read,
            } for n in notifications]

            # Export activity_logs
            logs = db.query(ActivityLog).limit(1000).all()
            data["activity_logs"] = [{
                "action": log.action,
                "category": log.category.value if log.category else None,
                "level": log.level.value if log.level else None,
                "entity_type": log.entity_type,
                "description": log.description,
            } for log in logs]

            # Export messages
            messages = db.query(Message).limit(1000).all()
            data["messages"] = [{
                "model_name": m.model_name,
                "record_id": m.record_id,
                "body": m.body,
                "message_type": m.message_type.value if m.message_type else None,
            } for m in messages]

        # Save to file
        file_path = Path(file)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

        rprint(f"\n[green]Data exported successfully to {file}[/green]")

    except Exception as e:
        rprint(f"[red]Error exporting data: {e}[/red]")
        raise typer.Exit(1)
    finally:
        db.close()


# ============================================================================
# Module Management Commands
# ============================================================================

module_app = typer.Typer(name="module", help="Module management commands")
app.add_typer(module_app, name="module")


@module_app.command("list")
def module_list(
    installed_only: bool = typer.Option(False, "--installed", "-i", help="Show only installed modules"),
    applications_only: bool = typer.Option(False, "--apps", "-a", help="Show only application modules"),
):
    """
    List all available modules.

    Examples:
        python manage.py module list
        python manage.py module list --installed
        python manage.py module list --apps
    """
    from app.db.base import SessionLocal
    from modules.base.services import ModuleService

    rprint(Panel.fit("[bold blue]Module List[/bold blue]"))

    db = SessionLocal()
    try:
        service = ModuleService(db)
        modules = service.get_all_modules(
            installed_only=installed_only,
            application_only=applications_only,
        )

        if not modules:
            rprint("[yellow]No modules found[/yellow]")
            return

        table = Table(title=f"Modules ({len(modules)} found)")
        table.add_column("Name", style="cyan")
        table.add_column("Version", style="green")
        table.add_column("Type", style="blue")
        table.add_column("State", style="yellow")
        table.add_column("Description")

        for m in modules:
            state_color = "green" if m.state == "installed" else "yellow"
            table.add_row(
                m.name,
                m.version,
                "App" if m.application else "Tech",
                f"[{state_color}]{m.state}[/{state_color}]",
                (m.summary or "")[:40] + "..." if m.summary and len(m.summary) > 40 else m.summary or "",
            )

        console.print(table)
    finally:
        db.close()


@module_app.command("install")
def module_install(
    name: str = typer.Argument(..., help="Module name to install"),
):
    """
    Install a module.

    Examples:
        python manage.py module install demo
        python manage.py module install hr
    """
    from app.db.base import SessionLocal
    from modules.base.services import ModuleService

    rprint(Panel.fit(f"[bold blue]Installing Module: {name}[/bold blue]"))

    db = SessionLocal()
    try:
        service = ModuleService(db)

        # Check if already installed
        if service.is_installed(name):
            rprint(f"[yellow]Module '{name}' is already installed[/yellow]")
            return

        rprint(f"[cyan]Installing {name}...[/cyan]")
        module = service.install_module(name)

        rprint(f"\n[green]Module '{name}' installed successfully![/green]")
        rprint(f"  [cyan]Version:[/cyan] {module.version}")
        rprint(f"  [cyan]Type:[/cyan] {'Application' if module.application else 'Technical'}")

    except Exception as e:
        rprint(f"[red]Error installing module: {e}[/red]")
        raise typer.Exit(1)
    finally:
        db.close()


@module_app.command("uninstall")
def module_uninstall(
    name: str = typer.Argument(..., help="Module name to uninstall"),
    drop_tables: bool = typer.Option(False, "--drop-tables", help="Drop database tables (DANGEROUS!)"),
    cascade: bool = typer.Option(False, "--cascade", help="Force uninstall even with dependents"),
    no_backup: bool = typer.Option(False, "--no-backup", help="Skip data backup before dropping tables"),
    force: bool = typer.Option(False, "--force", "-f", help="Skip confirmation"),
):
    """
    Uninstall a module.

    Examples:
        python manage.py module uninstall demo
        python manage.py module uninstall demo --drop-tables
        python manage.py module uninstall demo --drop-tables --cascade --force
    """
    from app.db.base import SessionLocal
    from modules.base.services import ModuleService

    rprint(Panel.fit(f"[bold red]Uninstalling Module: {name}[/bold red]"))

    if drop_tables and not force:
        rprint(f"[bold red]WARNING: This will drop all database tables for '{name}'![/bold red]")
        if not Confirm.ask("Are you sure you want to continue?"):
            rprint("[yellow]Cancelled[/yellow]")
            return

    db = SessionLocal()
    try:
        service = ModuleService(db)

        if not service.is_installed(name):
            rprint(f"[yellow]Module '{name}' is not installed[/yellow]")
            return

        # Check for dependents
        dependents = service.get_dependents(name)
        if dependents and not cascade:
            rprint(f"[red]Cannot uninstall: Module is required by: {dependents}[/red]")
            rprint("[yellow]Use --cascade to force uninstall[/yellow]")
            raise typer.Exit(1)

        rprint(f"[cyan]Uninstalling {name}...[/cyan]")
        service.uninstall_module(
            name,
            drop_tables=drop_tables,
            cascade=cascade,
            backup=not no_backup,
        )

        rprint(f"\n[green]Module '{name}' uninstalled successfully![/green]")
        if drop_tables:
            rprint("  [yellow]Database tables have been dropped[/yellow]")

    except Exception as e:
        rprint(f"[red]Error uninstalling module: {e}[/red]")
        raise typer.Exit(1)
    finally:
        db.close()


@module_app.command("upgrade")
def module_upgrade(
    name: str = typer.Argument(..., help="Module name to upgrade"),
):
    """
    Upgrade a module to the latest version on disk.

    Examples:
        python manage.py module upgrade demo
    """
    from app.db.base import SessionLocal
    from modules.base.services import ModuleService

    rprint(Panel.fit(f"[bold blue]Upgrading Module: {name}[/bold blue]"))

    db = SessionLocal()
    try:
        service = ModuleService(db)

        if not service.is_installed(name):
            rprint(f"[yellow]Module '{name}' is not installed[/yellow]")
            rprint("[cyan]Use 'module install' instead[/cyan]")
            return

        # Get current version
        current = service.get_module(name)
        old_version = current.version if current else "unknown"

        rprint(f"[cyan]Upgrading {name} from {old_version}...[/cyan]")
        module = service.upgrade_module(name)

        if module.version == old_version:
            rprint(f"[yellow]Module '{name}' is already at latest version ({module.version})[/yellow]")
        else:
            rprint(f"\n[green]Module '{name}' upgraded successfully![/green]")
            rprint(f"  [cyan]Old Version:[/cyan] {old_version}")
            rprint(f"  [cyan]New Version:[/cyan] {module.version}")

    except Exception as e:
        rprint(f"[red]Error upgrading module: {e}[/red]")
        raise typer.Exit(1)
    finally:
        db.close()


@module_app.command("check-schema")
def module_check_schema(
    name: Optional[str] = typer.Argument(None, help="Module name (optional, checks all if not provided)"),
):
    """
    Check schema status for module(s).

    Examples:
        python manage.py module check-schema
        python manage.py module check-schema demo
    """
    from app.db.base import SessionLocal
    from modules.base.services import ModuleService

    rprint(Panel.fit("[bold blue]Schema Check[/bold blue]"))

    db = SessionLocal()
    try:
        service = ModuleService(db)

        if name:
            # Check single module
            status = service.get_schema_status(name)

            table = Table(title=f"Schema Status: {name}")
            table.add_column("Property", style="cyan")
            table.add_column("Value", style="green")

            table.add_row("Has Models", "Yes" if status.get("has_models") else "No")
            table.add_row("Models", ", ".join(status.get("models", [])))
            table.add_row("Pending Changes", "Yes" if status.get("pending_changes") else "No")

            if status.get("validation"):
                valid = status["validation"].get("valid", True)
                table.add_row("Valid", "[green]Yes[/green]" if valid else "[red]No[/red]")
                if not valid:
                    for issue in status["validation"].get("issues", []):
                        table.add_row("Issue", f"[yellow]{issue}[/yellow]")

            console.print(table)

            if status.get("pending_operations"):
                rprint("\n[bold]Pending Operations:[/bold]")
                for op in status["pending_operations"]:
                    rprint(f"  - {op.get('operation_type')}: {op.get('table_name')}")

        else:
            # Check all modules
            installed = service.get_installed_modules()

            table = Table(title="All Modules Schema Status")
            table.add_column("Module", style="cyan")
            table.add_column("Has Models", style="blue")
            table.add_column("Valid", style="green")
            table.add_column("Pending Changes", style="yellow")

            for module in installed:
                try:
                    status = service.get_schema_status(module.name)
                    valid = status.get("validation", {}).get("valid", True)
                    table.add_row(
                        module.name,
                        "Yes" if status.get("has_models") else "No",
                        "[green]Yes[/green]" if valid else "[red]No[/red]",
                        "[yellow]Yes[/yellow]" if status.get("pending_changes") else "No",
                    )
                except Exception as e:
                    table.add_row(module.name, "-", f"[red]Error: {e}[/red]", "-")

            console.print(table)

    finally:
        db.close()


@module_app.command("sync-schema")
def module_sync_schema(
    name: str = typer.Argument(..., help="Module name"),
    dry_run: bool = typer.Option(True, "--dry-run/--apply", help="Preview changes without applying"),
):
    """
    Sync schema for a module (apply pending changes).

    Examples:
        python manage.py module sync-schema demo
        python manage.py module sync-schema demo --apply
    """
    from app.db.base import SessionLocal
    from modules.base.services import ModuleService

    mode = "Preview" if dry_run else "Apply"
    rprint(Panel.fit(f"[bold blue]Schema Sync ({mode}): {name}[/bold blue]"))

    db = SessionLocal()
    try:
        service = ModuleService(db)

        result = service.sync_schema(name, dry_run=dry_run)

        if result.get("message") == "No models to sync":
            rprint(f"[yellow]Module '{name}' has no models to sync[/yellow]")
            return

        operations = result.get("operations", [])

        if not operations:
            rprint(f"[green]No pending changes for '{name}'[/green]")
            return

        rprint(f"\n[bold]Operations ({len(operations)}):[/bold]")
        for op in operations:
            op_type = op.get("operation_type", "unknown")
            table_name = op.get("table_name", "")
            rprint(f"  - {op_type}: {table_name}")

        if dry_run:
            rprint("\n[yellow]This was a dry run. Use --apply to execute changes.[/yellow]")
        else:
            if result.get("success"):
                rprint(f"\n[green]Schema sync completed successfully![/green]")
            else:
                rprint(f"\n[red]Schema sync failed: {result.get('error')}[/red]")

    except Exception as e:
        rprint(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)
    finally:
        db.close()


@module_app.command("show-migrations")
def module_show_migrations(
    name: Optional[str] = typer.Argument(None, help="Module name (optional)"),
    limit: int = typer.Option(20, "--limit", "-l", help="Number of migrations to show"),
):
    """
    Show migration history.

    Examples:
        python manage.py module show-migrations
        python manage.py module show-migrations demo
        python manage.py module show-migrations --limit 50
    """
    from app.db.base import SessionLocal
    from modules.base.services import ModuleService

    title = f"Migrations for {name}" if name else "All Module Migrations"
    rprint(Panel.fit(f"[bold blue]{title}[/bold blue]"))

    db = SessionLocal()
    try:
        service = ModuleService(db)
        migrations = service.get_migration_history(name, limit)

        if not migrations:
            rprint("[yellow]No migrations found[/yellow]")
            return

        table = Table(title=f"Migration History ({len(migrations)} records)")
        table.add_column("Module", style="cyan")
        table.add_column("Migration", style="green")
        table.add_column("Type", style="blue")
        table.add_column("Status", style="yellow")
        table.add_column("Applied At")

        for m in migrations:
            status = m.get("status", "unknown")
            status_color = "green" if status == "applied" else "yellow" if status == "pending" else "red"
            table.add_row(
                m.get("module_name", ""),
                m.get("migration_name", "")[:30],
                m.get("migration_type", ""),
                f"[{status_color}]{status}[/{status_color}]",
                m.get("applied_at", "")[:19] if m.get("applied_at") else "-",
            )

        console.print(table)

    finally:
        db.close()


@module_app.command("backup")
def module_backup(
    name: str = typer.Argument(..., help="Module name"),
):
    """
    Backup module data to JSON file.

    Examples:
        python manage.py module backup demo
    """
    from app.db.base import SessionLocal
    from modules.base.services import ModuleService

    rprint(Panel.fit(f"[bold blue]Backup Module: {name}[/bold blue]"))

    db = SessionLocal()
    try:
        service = ModuleService(db)

        table_names = service._get_module_table_names(name)
        if not table_names:
            rprint(f"[yellow]Module '{name}' has no tables to backup[/yellow]")
            return

        rprint(f"[cyan]Backing up {len(table_names)} tables...[/cyan]")
        backup_file = service._backup_module_data(name, table_names)

        if backup_file:
            rprint(f"\n[green]Backup created successfully![/green]")
            rprint(f"  [cyan]File:[/cyan] {backup_file}")
            rprint(f"  [cyan]Tables:[/cyan] {', '.join(table_names)}")
        else:
            rprint("[red]Backup failed[/red]")
            raise typer.Exit(1)

    finally:
        db.close()


@app.command()
def check():
    """
    Check system status and configuration.
    """
    from app.core.config import settings

    rprint(Panel.fit("[bold blue]System Check[/bold blue]"))

    table = Table(title="Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")
    table.add_column("Status", style="yellow")

    # Check database
    try:
        from app.db.base import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "[green]OK[/green]"
    except Exception as e:
        db_status = f"[red]Error: {e}[/red]"

    table.add_row("Database", settings.DATABASE_HOST, db_status)

    # Check Redis
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        redis_status = "[green]OK[/green]"
    except Exception as e:
        redis_status = f"[yellow]Not available: {e}[/yellow]"

    table.add_row("Redis", settings.REDIS_URL, redis_status)

    # Other settings
    table.add_row("Debug Mode", str(settings.DEBUG), "[yellow]Warning[/yellow]" if settings.DEBUG else "[green]OK[/green]")
    table.add_row("Secret Key Set", "Yes" if settings.SECRET_KEY != "your-secret-key-here" else "No",
                  "[green]OK[/green]" if settings.SECRET_KEY != "your-secret-key-here" else "[red]Change this![/red]")

    console.print(table)


if __name__ == "__main__":
    app()
