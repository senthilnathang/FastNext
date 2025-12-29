"""
Module Export/Import API Endpoints

Provides module export and import functionality.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import tempfile
import shutil
from pathlib import Path

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..services.module_export_service import ModuleExportService
from ..models.module_export import ExportType, ImportStatus, ConflictResolution


router = APIRouter(prefix="/exports", tags=["Module Export/Import"])


# -------------------------------------------------------------------------
# Request/Response Models
# -------------------------------------------------------------------------


class ModuleExportResponse(BaseModel):
    """Module export response."""
    id: int
    module_name: str
    export_type: str
    file_path: Optional[str]
    file_size: Optional[int]
    includes_data: bool
    includes_code: bool
    module_version: Optional[str]
    fastvue_version: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class ModuleImportResponse(BaseModel):
    """Module import response."""
    id: int
    source_file: str
    source_size: Optional[int]
    status: str
    module_name: Optional[str]
    module_version: Optional[str]
    validation_errors: Optional[List[str]]
    validation_warnings: Optional[List[str]]
    dependency_check: Optional[Dict[str, Any]]
    imported_records: Optional[Dict[str, int]]
    skipped_records: Optional[Dict[str, int]]
    updated_records: Optional[Dict[str, int]]
    error_message: Optional[str]
    created_at: str
    completed_at: Optional[str]

    class Config:
        from_attributes = True


class DataExportTemplateResponse(BaseModel):
    """Data export template response."""
    id: int
    name: str
    code: str
    module_name: Optional[str]
    models: List[str]
    include_dependencies: bool
    filters: Optional[Dict[str, Any]]
    field_mapping: Optional[Dict[str, Any]]
    output_format: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class ExportModuleRequest(BaseModel):
    """Export module request."""
    include_data: bool = Field(default=False)
    include_static: bool = Field(default=True)
    data_models: Optional[List[str]] = None


class ExportDataRequest(BaseModel):
    """Export data request."""
    models: Optional[List[str]] = None
    include_related: bool = Field(default=True)
    format: str = Field(default="json")


class ValidateImportRequest(BaseModel):
    """Validate import request (for URL-based imports)."""
    source_url: Optional[str] = None


class ExecuteImportRequest(BaseModel):
    """Execute import request."""
    conflict_resolution: str = Field(default="skip")
    install_after: bool = Field(default=False)


class CreateTemplateRequest(BaseModel):
    """Create data export template request."""
    name: str = Field(..., min_length=2, max_length=200)
    code: str = Field(..., min_length=2, max_length=100)
    module_name: Optional[str] = None
    models: List[str] = Field(..., min_length=1)
    include_dependencies: bool = Field(default=True)
    filters: Optional[Dict[str, Any]] = None
    field_mapping: Optional[Dict[str, Any]] = None
    output_format: str = Field(default="json")


# -------------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------------


def get_export_service(db: Session) -> ModuleExportService:
    """Get export service instance."""
    return ModuleExportService(db)


def export_to_response(export) -> ModuleExportResponse:
    """Convert export to response model."""
    return ModuleExportResponse(
        id=export.id,
        module_name=export.module_name,
        export_type=export.export_type,
        file_path=export.file_path,
        file_size=export.file_size,
        includes_data=export.includes_data,
        includes_code=export.includes_code,
        module_version=export.module_version,
        fastvue_version=export.fastvue_version,
        created_at=export.created_at.isoformat(),
    )


def import_to_response(imp) -> ModuleImportResponse:
    """Convert import to response model."""
    return ModuleImportResponse(
        id=imp.id,
        source_file=imp.source_file,
        source_size=imp.source_size,
        status=imp.status,
        module_name=imp.module_name,
        module_version=imp.module_version,
        validation_errors=imp.validation_errors,
        validation_warnings=imp.validation_warnings,
        dependency_check=imp.dependency_check,
        imported_records=imp.imported_records,
        skipped_records=imp.skipped_records,
        updated_records=imp.updated_records,
        error_message=imp.error_message,
        created_at=imp.created_at.isoformat(),
        completed_at=imp.completed_at.isoformat() if imp.completed_at else None,
    )


def template_to_response(template) -> DataExportTemplateResponse:
    """Convert template to response model."""
    return DataExportTemplateResponse(
        id=template.id,
        name=template.name,
        code=template.code,
        module_name=template.module_name,
        models=template.models or [],
        include_dependencies=template.include_dependencies,
        filters=template.filters,
        field_mapping=template.field_mapping,
        output_format=template.output_format,
        is_active=template.is_active,
        created_at=template.created_at.isoformat(),
    )


# -------------------------------------------------------------------------
# Module Export Endpoints
# -------------------------------------------------------------------------


@router.post("/modules/{module_name}", response_model=ModuleExportResponse)
def export_module(
    module_name: str,
    data: ExportModuleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Export a module as a ZIP file.

    Returns export metadata. Use the download endpoint to get the file.
    """
    service = get_export_service(db)

    try:
        export = service.export_module_zip(
            module_name=module_name,
            include_data=data.include_data,
            include_static=data.include_static,
            data_models=data.data_models,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    return export_to_response(export)


@router.get("/modules/{module_name}/download")
def download_module_export(
    module_name: str,
    export_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Download an exported module ZIP file."""
    service = get_export_service(db)
    export = service.get_export(export_id)

    if not export:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export not found"
        )

    if export.module_name != module_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Export does not match module"
        )

    file_path = Path(export.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export file not found"
        )

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/zip"
    )


@router.post("/modules/{module_name}/data", response_model=ModuleExportResponse)
def export_module_data(
    module_name: str,
    data: ExportDataRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Export module data as JSON.

    Exports data from specified models or all module models.
    """
    service = get_export_service(db)

    try:
        export = service.export_module_data(
            module_name=module_name,
            models=data.models,
            include_related=data.include_related,
            format=data.format,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return export_to_response(export)


@router.get("/history", response_model=List[ModuleExportResponse])
def list_exports(
    module_name: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List export history."""
    service = get_export_service(db)
    exports = service.list_exports(module_name=module_name, limit=limit)
    return [export_to_response(e) for e in exports]


# -------------------------------------------------------------------------
# Module Import Endpoints
# -------------------------------------------------------------------------


@router.post("/import", response_model=ModuleImportResponse)
async def upload_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Upload a module ZIP for import.

    Validates the ZIP and returns import metadata.
    Use the execute endpoint to actually import.
    """
    service = get_export_service(db)

    # Save uploaded file
    temp_dir = Path(tempfile.mkdtemp())
    try:
        file_path = temp_dir / file.filename
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Validate import
        imp = service.validate_import(
            file_path=str(file_path),
            user_id=current_user.id,
        )

        return import_to_response(imp)

    except ValueError as e:
        # Clean up on error
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/import/{import_id}/execute", response_model=ModuleImportResponse)
def execute_import(
    import_id: int,
    data: ExecuteImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Execute a validated import.

    Imports the module code and optionally installs it.
    """
    service = get_export_service(db)

    try:
        # Validate conflict resolution
        try:
            conflict_res = ConflictResolution(data.conflict_resolution)
        except ValueError:
            raise ValueError(f"Invalid conflict resolution: {data.conflict_resolution}")

        imp = service.import_module(
            import_id=import_id,
            conflict_resolution=data.conflict_resolution,
            install_after=data.install_after,
        )

        return import_to_response(imp)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {e}"
        )


@router.post("/import/{import_id}/rollback", response_model=ModuleImportResponse)
def rollback_import(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Rollback a failed or completed import."""
    service = get_export_service(db)

    try:
        imp = service.rollback_import(import_id)
        return import_to_response(imp)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/import/{import_id}", response_model=ModuleImportResponse)
def get_import(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get import details."""
    service = get_export_service(db)
    imp = service.get_import(import_id)

    if not imp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import not found"
        )

    return import_to_response(imp)


@router.get("/imports", response_model=List[ModuleImportResponse])
def list_imports(
    status_filter: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List import history."""
    service = get_export_service(db)
    imports = service.list_imports(status=status_filter, limit=limit)
    return [import_to_response(i) for i in imports]


# -------------------------------------------------------------------------
# Data Import Endpoints
# -------------------------------------------------------------------------


@router.post("/data/import", response_model=Dict[str, Any])
async def import_data(
    file: UploadFile = File(...),
    conflict_resolution: str = Query(default="skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Import data from a JSON file.

    Imports records into the database with conflict resolution.
    """
    service = get_export_service(db)

    try:
        content = await file.read()
        import json
        data = json.loads(content.decode('utf-8'))

        result = service.import_data(
            data=data,
            conflict_resolution=conflict_resolution,
        )

        return result

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON: {e}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# -------------------------------------------------------------------------
# Export Template Endpoints
# -------------------------------------------------------------------------


@router.get("/templates", response_model=List[DataExportTemplateResponse])
def list_templates(
    module_name: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List data export templates."""
    service = get_export_service(db)
    templates = service.list_templates(
        module_name=module_name,
        is_active=active_only,
    )
    return [template_to_response(t) for t in templates]


@router.get("/templates/{template_code}", response_model=DataExportTemplateResponse)
def get_template(
    template_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a template by code."""
    service = get_export_service(db)
    template = service.get_template_by_code(template_code)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    return template_to_response(template)


@router.post("/templates", response_model=DataExportTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    data: CreateTemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a data export template."""
    service = get_export_service(db)

    try:
        template = service.create_template(**data.model_dump())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return template_to_response(template)


@router.post("/templates/{template_code}/execute", response_model=ModuleExportResponse)
def execute_template(
    template_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Execute a data export template."""
    service = get_export_service(db)

    try:
        export = service.execute_template(
            template_code=template_code,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return export_to_response(export)


@router.delete("/templates/{template_code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a data export template."""
    service = get_export_service(db)
    template = service.get_template_by_code(template_code)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    service.delete_template(template.id)
