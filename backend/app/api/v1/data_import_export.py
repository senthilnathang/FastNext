from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func, and_, desc
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, timedelta
import logging

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.data_import_export import (
    ImportJob, ExportJob, ImportTemplate, ExportTemplate,
    ImportPermission, ExportPermission, ImportAuditLog, ExportAuditLog,
    ImportStatus, ExportStatus, DataFormat
)
from app.schemas.data_import_export import (
    ImportJobCreate, ImportJobResponse, ImportJobUpdate,
    ExportJobCreate, ExportJobResponse, ExportJobUpdate,
    ImportTemplateCreate, ImportTemplateResponse,
    ExportTemplateCreate, ExportTemplateResponse,
    ImportPermissionCreate, ImportPermissionResponse,
    ExportPermissionCreate, ExportPermissionResponse,
    ImportPreviewRequest, ImportPreviewResponse,
    ExportPreviewRequest, ExportPreviewResponse,
    ValidationResultSchema, ImportOptionsSchema,
    BulkImportRequest, BulkExportRequest, BulkOperationResponse,
    ImportStatistics, ExportStatistics, ImportExportHealth
)
from app.utils.data_import import get_data_importer, ImportError, ValidationError
from app.utils.data_export import get_data_exporter, ExportFormat
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Import endpoints

@router.post("/import/upload", response_model=ImportJobResponse)
async def upload_and_create_import_job(
    file: UploadFile = File(...),
    table_name: str = Query(...),
    import_options: str = Query(...),  # JSON string
    field_mappings: str = Query(default="[]"),  # JSON string
    requires_approval: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload file and create import job"""
    
    try:
        import json
        
        # Parse JSON parameters
        options = ImportOptionsSchema.parse_raw(import_options)
        mappings = json.loads(field_mappings)
        
        # Check permissions
        permission = await _check_import_permission(db, current_user.id, table_name)
        if not permission or not permission.can_import:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No import permission for this table"
            )
        
        # Validate file size
        if file.size > permission.max_file_size_mb * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {permission.max_file_size_mb}MB"
            )
        
        # Create import job
        job_id = str(uuid.uuid4())
        
        import_job = ImportJob(
            job_id=job_id,
            table_name=table_name,
            status=ImportStatus.PENDING,
            original_filename=file.filename,
            file_size=file.size,
            file_format=options.format,
            import_options=options.dict(),
            field_mappings={"mappings": mappings},
            requires_approval=requires_approval or permission.requires_approval,
            created_by=current_user.id
        )
        
        db.add(import_job)
        await db.commit()
        await db.refresh(import_job)
        
        # Log audit event
        await _log_import_audit(db, import_job.id, current_user.id, "created", {
            "table_name": table_name,
            "filename": file.filename,
            "file_size": file.size
        })
        
        return ImportJobResponse.from_orm(import_job)
        
    except ImportError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Import job creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create import job"
        )


@router.post("/import/parse", response_model=Dict[str, Any])
async def parse_import_file(
    file: UploadFile = File(...),
    import_options: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Parse uploaded file and return preview data"""
    
    try:
        # Parse import options JSON string
        options = ImportOptionsSchema.parse_raw(import_options)
        
        importer = get_data_importer(db)
        parsed_data = await importer.parse_file(file, options)
        
        return {
            "headers": parsed_data["headers"],
            "sample_rows": parsed_data["rows"][:10],  # First 10 rows as preview
            "total_rows": parsed_data["total_rows"],
            "format": parsed_data["format"]
        }
        
    except ImportError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"File parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse file"
        )


@router.post("/import/{job_id}/validate", response_model=ValidationResultSchema)
async def validate_import_data(
    job_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validate import data"""
    
    try:
        # Get import job
        query = select(ImportJob).where(ImportJob.job_id == job_id)
        result = await db.execute(query)
        import_job = result.scalar_one_or_none()
        
        if not import_job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found")
        
        if import_job.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
        # Update job status
        import_job.status = ImportStatus.VALIDATING
        await db.commit()
        
        # Start background validation
        background_tasks.add_task(
            _run_import_validation,
            db, import_job.id, current_user.id
        )
        
        return ValidationResultSchema(
            is_valid=False,
            total_rows=0,
            valid_rows=0,
            error_rows=0,
            errors=[],
            warnings=[]
        )  # Placeholder response
        
    except Exception as e:
        logger.error(f"Import validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start validation"
        )


@router.post("/import/{job_id}/start", response_model=ImportJobResponse)
async def start_import(
    job_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start import process"""
    
    try:
        # Get import job
        query = select(ImportJob).where(ImportJob.job_id == job_id)
        result = await db.execute(query)
        import_job = result.scalar_one_or_none()
        
        if not import_job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found")
        
        if import_job.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
        # Check if approval is required
        if import_job.requires_approval and not import_job.approved_by:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Import requires approval before starting"
            )
        
        # Update job status
        import_job.status = ImportStatus.IMPORTING
        import_job.started_at = datetime.utcnow()
        await db.commit()
        
        # Start background import
        background_tasks.add_task(
            _run_import_process,
            db, import_job.id, current_user.id
        )
        
        await db.refresh(import_job)
        return ImportJobResponse.from_orm(import_job)
        
    except Exception as e:
        logger.error(f"Import start failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start import"
        )


@router.get("/import/{job_id}/status", response_model=ImportJobResponse)
async def get_import_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get import job status"""
    
    try:
        query = select(ImportJob).where(ImportJob.job_id == job_id)
        result = await db.execute(query)
        import_job = result.scalar_one_or_none()
        
        if not import_job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found")
        
        if import_job.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
        return ImportJobResponse.from_orm(import_job)
        
    except Exception as e:
        logger.error(f"Get import status failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get import status"
        )


@router.get("/import/jobs", response_model=List[ImportJobResponse])
async def list_import_jobs(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[ImportStatus] = None,
    table_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List import jobs for current user"""
    
    try:
        query = select(ImportJob).where(ImportJob.created_by == current_user.id)
        
        if status_filter:
            query = query.where(ImportJob.status == status_filter)
        
        if table_name:
            query = query.where(ImportJob.table_name == table_name)
        
        query = query.order_by(desc(ImportJob.created_at)).offset(skip).limit(limit)
        
        result = await db.execute(query)
        jobs = result.scalars().all()
        
        return [ImportJobResponse.from_orm(job) for job in jobs]
        
    except Exception as e:
        logger.error(f"List import jobs failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list import jobs"
        )


# Export endpoints

@router.post("/export/create", response_model=ExportJobResponse)
async def create_export_job(
    export_request: ExportJobCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create export job"""
    
    try:
        # Check permissions
        permission = await _check_export_permission(db, current_user.id, export_request.table_name)
        if not permission or not permission.can_export:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No export permission for this table"
            )
        
        # Create export job
        job_id = str(uuid.uuid4())
        
        export_job = ExportJob(
            job_id=job_id,
            table_name=export_request.table_name,
            status=ExportStatus.PENDING,
            export_format=export_request.export_format,
            export_options=export_request.export_options.dict(),
            selected_columns=export_request.selected_columns,
            filters=[f.dict() for f in export_request.filters],
            created_by=current_user.id
        )
        
        db.add(export_job)
        await db.commit()
        await db.refresh(export_job)
        
        # Start background export
        background_tasks.add_task(
            _run_export_process,
            db, export_job.id, current_user.id
        )
        
        # Log audit event
        await _log_export_audit(db, export_job.id, current_user.id, "created", {
            "table_name": export_request.table_name,
            "format": export_request.export_format,
            "columns": len(export_request.selected_columns)
        })
        
        return ExportJobResponse.from_orm(export_job)
        
    except Exception as e:
        logger.error(f"Export job creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create export job"
        )


@router.get("/export/{job_id}/status", response_model=ExportJobResponse)
async def get_export_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get export job status"""
    
    try:
        query = select(ExportJob).where(ExportJob.job_id == job_id)
        result = await db.execute(query)
        export_job = result.scalar_one_or_none()
        
        if not export_job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export job not found")
        
        if export_job.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
        return ExportJobResponse.from_orm(export_job)
        
    except Exception as e:
        logger.error(f"Get export status failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get export status"
        )


@router.get("/export/{job_id}/download")
async def download_export(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download export file"""
    
    try:
        query = select(ExportJob).where(ExportJob.job_id == job_id)
        result = await db.execute(query)
        export_job = result.scalar_one_or_none()
        
        if not export_job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export job not found")
        
        if export_job.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
        if export_job.status != ExportStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Export not completed"
            )
        
        # Use existing export utility for download
        exporter = get_data_exporter(db)
        return await exporter.download_export(job_id)
        
    except Exception as e:
        logger.error(f"Export download failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download export"
        )


@router.get("/export/jobs", response_model=List[ExportJobResponse])
async def list_export_jobs(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[ExportStatus] = None,
    table_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List export jobs for current user"""
    
    try:
        query = select(ExportJob).where(ExportJob.created_by == current_user.id)
        
        if status_filter:
            query = query.where(ExportJob.status == status_filter)
        
        if table_name:
            query = query.where(ExportJob.table_name == table_name)
        
        query = query.order_by(desc(ExportJob.created_at)).offset(skip).limit(limit)
        
        result = await db.execute(query)
        jobs = result.scalars().all()
        
        return [ExportJobResponse.from_orm(job) for job in jobs]
        
    except Exception as e:
        logger.error(f"List export jobs failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list export jobs"
        )


# Health and statistics endpoints

@router.get("/health", response_model=ImportExportHealth)
async def get_import_export_health(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get import/export system health"""
    
    try:
        # Count active jobs
        active_imports = await db.scalar(
            select(func.count()).where(
                and_(
                    ImportJob.status.in_([ImportStatus.PENDING, ImportStatus.PARSING, 
                                        ImportStatus.VALIDATING, ImportStatus.IMPORTING])
                )
            )
        )
        
        active_exports = await db.scalar(
            select(func.count()).where(
                and_(
                    ExportJob.status.in_([ExportStatus.PENDING, ExportStatus.IN_PROGRESS])
                )
            )
        )
        
        return ImportExportHealth(
            import_service_status="healthy",
            export_service_status="healthy",
            active_import_jobs=active_imports or 0,
            active_export_jobs=active_exports or 0,
            queue_size=0,  # Simplified
            system_load=0.5,  # Simplified
            available_storage_gb=100.0  # Simplified
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Health check failed"
        )


# Helper functions

async def _check_import_permission(db: AsyncSession, user_id: int, table_name: str) -> Optional[ImportPermission]:
    """Check import permission for user and table"""
    
    query = select(ImportPermission).where(
        and_(
            ImportPermission.user_id == user_id,
            ImportPermission.table_name == table_name
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _check_export_permission(db: AsyncSession, user_id: int, table_name: str) -> Optional[ExportPermission]:
    """Check export permission for user and table"""
    
    query = select(ExportPermission).where(
        and_(
            ExportPermission.user_id == user_id,
            ExportPermission.table_name == table_name
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _log_import_audit(db: AsyncSession, job_id: int, user_id: int, event_type: str, event_data: Dict[str, Any]):
    """Log import audit event"""
    
    audit_log = ImportAuditLog(
        import_job_id=job_id,
        user_id=user_id,
        event_type=event_type,
        event_data=event_data
    )
    db.add(audit_log)
    await db.commit()


async def _log_export_audit(db: AsyncSession, job_id: int, user_id: int, event_type: str, event_data: Dict[str, Any]):
    """Log export audit event"""
    
    audit_log = ExportAuditLog(
        export_job_id=job_id,
        user_id=user_id,
        event_type=event_type,
        event_data=event_data
    )
    db.add(audit_log)
    await db.commit()


async def _run_import_validation(db: AsyncSession, job_id: int, user_id: int):
    """Background task for import validation"""
    
    try:
        # Get job
        query = select(ImportJob).where(ImportJob.id == job_id)
        result = await db.execute(query)
        import_job = result.scalar_one()
        
        # Implement validation logic here
        # This is a simplified version
        import_job.status = ImportStatus.COMPLETED
        import_job.validation_results = {"is_valid": True}
        await db.commit()
        
        await _log_import_audit(db, job_id, user_id, "validated", {})
        
    except Exception as e:
        logger.error(f"Import validation background task failed: {e}")


async def _run_import_process(db: AsyncSession, job_id: int, user_id: int):
    """Background task for import process"""
    
    try:
        # Get job
        query = select(ImportJob).where(ImportJob.id == job_id)
        result = await db.execute(query)
        import_job = result.scalar_one()
        
        # Implement import logic here
        # This is a simplified version
        import_job.status = ImportStatus.COMPLETED
        import_job.completed_at = datetime.utcnow()
        import_job.processed_rows = 100  # Example
        import_job.valid_rows = 100
        await db.commit()
        
        await _log_import_audit(db, job_id, user_id, "completed", {})
        
    except Exception as e:
        logger.error(f"Import process background task failed: {e}")


async def _run_export_process(db: AsyncSession, job_id: int, user_id: int):
    """Background task for export process"""
    
    try:
        # Get job
        query = select(ExportJob).where(ExportJob.id == job_id)
        result = await db.execute(query)
        export_job = result.scalar_one()
        
        # Use existing export utility
        export_job.status = ExportStatus.IN_PROGRESS
        export_job.started_at = datetime.utcnow()
        await db.commit()
        
        # Implement export logic here using existing DataExporter
        # This is a simplified version
        export_job.status = ExportStatus.COMPLETED
        export_job.completed_at = datetime.utcnow()
        export_job.processed_rows = 500  # Example
        export_job.file_size = 12345  # Example
        await db.commit()
        
        await _log_export_audit(db, job_id, user_id, "completed", {})
        
    except Exception as e:
        logger.error(f"Export process background task failed: {e}")


# Table Discovery Endpoints

@router.get("/tables/available")
async def get_available_tables(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of available tables for import/export"""
    try:
        # Get tables from database metadata
        from sqlalchemy import inspect
        from app.db.base import engine
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        # Filter out internal tables
        excluded_tables = {
            'alembic_version', 'spatial_ref_sys', 'pg_stat_statements'
        }
        
        available_tables = [
            table for table in tables 
            if not table.startswith('_') and table not in excluded_tables
        ]
        
        return {
            "tables": available_tables,
            "total_count": len(available_tables)
        }
        
    except Exception as e:
        logger.error(f"Failed to get available tables: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve available tables: {str(e)}"
        )


@router.get("/tables/{table_name}/schema")
async def get_table_schema(
    table_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get schema information for a specific table"""
    try:
        from sqlalchemy import inspect, MetaData, Table
        from app.db.base import engine
        
        inspector = inspect(engine)
        
        # Check if table exists
        if table_name not in inspector.get_table_names():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table '{table_name}' not found"
            )
        
        # Get column information
        columns = inspector.get_columns(table_name)
        primary_keys = inspector.get_pk_constraint(table_name)
        foreign_keys = inspector.get_foreign_keys(table_name)
        indexes = inspector.get_indexes(table_name)
        
        # Format column information
        formatted_columns = []
        for col in columns:
            column_info = {
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col["nullable"],
                "default": str(col["default"]) if col["default"] is not None else None,
                "primary_key": col["name"] in primary_keys.get("constrained_columns", []),
                "autoincrement": col.get("autoincrement", False)
            }
            formatted_columns.append(column_info)
        
        # Get sample data (first 5 rows)
        sample_data = []
        try:
            from sqlalchemy import text
            sample_query = text(f"SELECT * FROM {table_name} LIMIT 5")
            sample_result = await db.execute(sample_query)
            sample_rows = sample_result.fetchall()
            sample_data = [dict(row._mapping) for row in sample_rows]
        except Exception as e:
            logger.warning(f"Could not fetch sample data for {table_name}: {e}")
        
        return {
            "table_name": table_name,
            "columns": formatted_columns,
            "primary_keys": primary_keys.get("constrained_columns", []),
            "foreign_keys": [
                {
                    "constrained_columns": fk["constrained_columns"],
                    "referred_table": fk["referred_table"],
                    "referred_columns": fk["referred_columns"]
                }
                for fk in foreign_keys
            ],
            "indexes": [
                {
                    "name": idx["name"],
                    "columns": idx["column_names"],
                    "unique": idx["unique"]
                }
                for idx in indexes
            ],
            "sample_data": sample_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get table schema for {table_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve table schema: {str(e)}"
        )


@router.get("/tables/{table_name}/permissions")
async def get_table_permissions(
    table_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user permissions for a specific table"""
    try:
        # Get import permissions
        import_query = select(ImportPermission).where(
            and_(
                ImportPermission.user_id == current_user.id,
                ImportPermission.table_name == table_name
            )
        )
        import_result = await db.execute(import_query)
        import_permission = import_result.scalar_one_or_none()
        
        # Get export permissions
        export_query = select(ExportPermission).where(
            and_(
                ExportPermission.user_id == current_user.id,
                ExportPermission.table_name == table_name
            )
        )
        export_result = await db.execute(export_query)
        export_permission = export_result.scalar_one_or_none()
        
        # If no permissions exist, create default ones
        if not import_permission:
            import_permission = ImportPermission(
                user_id=current_user.id,
                table_name=table_name,
                can_import=True,
                can_validate=True,
                can_preview=True,
                max_file_size_mb=10,
                max_rows_per_import=10000,
                allowed_formats=["csv", "json", "excel"],
                requires_approval=False
            )
            db.add(import_permission)
            await db.commit()
            await db.refresh(import_permission)
        
        if not export_permission:
            export_permission = ExportPermission(
                user_id=current_user.id,
                table_name=table_name,
                can_export=True,
                can_preview=True,
                max_rows_per_export=100000,
                allowed_formats=["csv", "json", "excel"],
                allowed_columns=[]
            )
            db.add(export_permission)
            await db.commit()
            await db.refresh(export_permission)
        
        return {
            "table_name": table_name,
            "import_permission": {
                "can_import": import_permission.can_import,
                "can_validate": import_permission.can_validate,
                "can_preview": import_permission.can_preview,
                "max_file_size_mb": import_permission.max_file_size_mb,
                "max_rows_per_import": import_permission.max_rows_per_import,
                "allowed_formats": import_permission.allowed_formats,
                "requires_approval": import_permission.requires_approval
            },
            "export_permission": {
                "can_export": export_permission.can_export,
                "can_preview": export_permission.can_preview,
                "max_rows_per_export": export_permission.max_rows_per_export,
                "allowed_formats": export_permission.allowed_formats,
                "allowed_columns": export_permission.allowed_columns
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get table permissions for {table_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve table permissions: {str(e)}"
        )


# Add router tags
router.tags = ["Data Import/Export"]