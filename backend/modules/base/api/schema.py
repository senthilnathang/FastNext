"""
Module Schema API Endpoints

Provides REST API for module schema management operations.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from modules.base.services import ModuleService

router = APIRouter(prefix="/modules/schema", tags=["Module Schema"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class SchemaStatus(BaseModel):
    """Schema status response."""
    module_name: str
    has_models: bool
    models: List[str]
    validation: Optional[Dict[str, Any]] = None
    pending_changes: bool
    pending_operations: Optional[List[Dict[str, Any]]] = None


class MigrationRecord(BaseModel):
    """Migration history record."""
    id: int
    module_name: str
    version: str
    migration_name: str
    migration_type: str
    status: str
    is_applied: bool
    applied_at: Optional[str] = None
    operations: List[Dict[str, Any]]
    error_message: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[str] = None


class MigrationResult(BaseModel):
    """Migration execution result."""
    success: bool
    module_name: str
    version: str
    migration_name: str
    operations_count: int = 0
    executed_count: int = 0
    error: Optional[str] = None
    operations: List[Dict[str, Any]] = []
    duration_ms: float = 0


class SyncSchemaRequest(BaseModel):
    """Schema sync request."""
    dry_run: bool = False


class RollbackRequest(BaseModel):
    """Rollback request."""
    migration_name: str


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/{module_name}/status", response_model=SchemaStatus)
def get_schema_status(
    module_name: str,
    db: Session = Depends(get_db),
) -> SchemaStatus:
    """
    Get schema status for a module.

    Returns information about:
    - Whether the module has models
    - List of model names
    - Validation status (if tables exist and match)
    - Pending schema changes
    """
    service = ModuleService(db)

    # Check module exists
    module = service.get_module(module_name)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    status = service.get_schema_status(module_name)
    return SchemaStatus(**status)


@router.post("/{module_name}/sync", response_model=MigrationResult)
def sync_module_schema(
    module_name: str,
    request: SyncSchemaRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Sync schema for a module.

    Applies any pending schema changes (new columns, altered types, etc).

    Use dry_run=true to preview changes without applying them.
    """
    service = ModuleService(db)

    # Check module exists
    module = service.get_module(module_name)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    result = service.sync_schema(module_name, dry_run=request.dry_run)
    return result


@router.get("/{module_name}/migrations", response_model=List[MigrationRecord])
def get_migration_history(
    module_name: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Get migration history for a module.

    Returns list of applied migrations in reverse chronological order.
    """
    service = ModuleService(db)

    # Check module exists
    module = service.get_module(module_name)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    return service.get_migration_history(module_name, limit)


@router.get("/migrations/all", response_model=List[MigrationRecord])
def get_all_migrations(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Get migration history for all modules.

    Returns list of all migrations in reverse chronological order.
    """
    service = ModuleService(db)
    return service.get_migration_history(None, limit)


@router.post("/{module_name}/rollback")
def rollback_migration(
    module_name: str,
    request: RollbackRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Rollback a specific migration.

    Warning: This operation may cause data loss if the migration created tables
    or added columns that contain data.
    """
    service = ModuleService(db)

    # Check module exists
    module = service.get_module(module_name)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    result = service.migration_engine.rollback_migration(
        module_name,
        request.migration_name,
    )

    if not result.success:
        raise HTTPException(
            status_code=400,
            detail=f"Rollback failed: {result.error}",
        )

    return result.to_dict()


@router.get("/{module_name}/tables")
def get_module_tables(
    module_name: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get database tables for a module.

    Returns list of tables and their schemas.
    """
    service = ModuleService(db)

    # Check module exists
    module = service.get_module(module_name)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    table_names = service._get_module_table_names(module_name)
    tables = []

    for table_name in table_names:
        if service.schema_inspector.table_exists(table_name):
            schema = service.schema_inspector.get_table_schema(table_name)
            tables.append(schema)

    return {
        "module_name": module_name,
        "table_count": len(tables),
        "tables": tables,
    }


@router.get("/{module_name}/compare")
def compare_module_schema(
    module_name: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Compare model definitions with database schema.

    Shows differences between Python models and actual database tables.
    """
    service = ModuleService(db)

    # Check module exists
    module = service.get_module(module_name)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    models = service._get_module_models(module_name)
    comparisons = []

    for model in models:
        diff = service.schema_inspector.compare_schemas(model)
        comparisons.append(diff.to_dict())

    return {
        "module_name": module_name,
        "model_count": len(models),
        "has_differences": any(c["has_changes"] for c in comparisons),
        "comparisons": comparisons,
    }


@router.post("/{module_name}/backup")
def backup_module_data(
    module_name: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Backup module data to JSON file.

    Creates a timestamped backup file in the backups/modules directory.
    """
    service = ModuleService(db)

    # Check module exists
    module = service.get_module(module_name)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module '{module_name}' not found")

    table_names = service._get_module_table_names(module_name)
    if not table_names:
        return {
            "success": True,
            "message": "No tables to backup",
            "backup_file": None,
        }

    backup_file = service._backup_module_data(module_name, table_names)

    if backup_file:
        return {
            "success": True,
            "message": f"Backup created successfully",
            "backup_file": backup_file,
            "tables_backed_up": table_names,
        }
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to create backup",
        )


@router.get("/check-all")
def check_all_schemas(
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Check schema status for all installed modules.

    Returns a summary of which modules have pending schema changes.
    """
    service = ModuleService(db)
    installed = service.get_installed_modules()

    results = []
    modules_with_changes = 0

    for module in installed:
        try:
            status = service.get_schema_status(module.name)
            if status.get("pending_changes"):
                modules_with_changes += 1
            results.append({
                "module_name": module.name,
                "version": module.version,
                "has_models": status.get("has_models", False),
                "pending_changes": status.get("pending_changes", False),
            })
        except Exception as e:
            results.append({
                "module_name": module.name,
                "version": module.version,
                "error": str(e),
            })

    return {
        "total_modules": len(installed),
        "modules_with_changes": modules_with_changes,
        "modules": results,
    }


@router.post("/sync-all")
def sync_all_schemas(
    dry_run: bool = Query(True),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Sync schemas for all installed modules.

    Use dry_run=true (default) to preview changes.
    Set dry_run=false to apply changes.
    """
    service = ModuleService(db)
    installed = service.get_installed_modules()

    results = []
    total_operations = 0

    for module in installed:
        try:
            result = service.sync_schema(module.name, dry_run=dry_run)
            ops_count = len(result.get("operations", []))
            total_operations += ops_count
            results.append({
                "module_name": module.name,
                "success": result.get("success", True),
                "operations_count": ops_count,
            })
        except Exception as e:
            results.append({
                "module_name": module.name,
                "success": False,
                "error": str(e),
            })

    return {
        "dry_run": dry_run,
        "total_modules": len(installed),
        "total_operations": total_operations,
        "results": results,
    }
