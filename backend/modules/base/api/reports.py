"""
Report API Endpoints

Provides report generation and management.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import io

from app.api.deps import get_current_active_user, get_db
from app.models.user import User

from ..services.report_service import ReportService
from ..models.report import ReportFormat


router = APIRouter(prefix="/reports", tags=["Reports"])


# -------------------------------------------------------------------------
# Request/Response Models
# -------------------------------------------------------------------------


class ReportResponse(BaseModel):
    """Report definition response."""
    id: int
    code: str
    name: str
    description: Optional[str]
    model_name: str
    module_name: Optional[str]
    output_format: str
    template_type: str
    paper_format: str
    orientation: str
    supports_multi: bool
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class ReportExecutionResponse(BaseModel):
    """Report execution response."""
    id: int
    report_code: str
    model_name: Optional[str]
    record_ids: List[int]
    output_format: str
    status: str
    file_path: Optional[str]
    file_size: Optional[int]
    duration_ms: Optional[int]
    error_message: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class ReportScheduleResponse(BaseModel):
    """Report schedule response."""
    id: int
    report_id: int
    name: str
    cron_expression: str
    output_format: Optional[str]
    email_to: Optional[str]
    last_run: Optional[str]
    next_run: Optional[str]
    last_status: Optional[str]
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class CreateReportRequest(BaseModel):
    """Create report request."""
    code: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=200)
    model_name: str = Field(..., min_length=2, max_length=100)
    output_format: str = Field(default="pdf")
    template_type: str = Field(default="jinja2")
    template_content: Optional[str] = None
    template_file: Optional[str] = None
    module_name: Optional[str] = None
    description: Optional[str] = None
    paper_format: str = Field(default="A4")
    orientation: str = Field(default="portrait")
    margin_top: int = Field(default=10)
    margin_bottom: int = Field(default=10)
    margin_left: int = Field(default=10)
    margin_right: int = Field(default=10)
    header_html: Optional[str] = None
    footer_html: Optional[str] = None
    supports_multi: bool = False


class UpdateReportRequest(BaseModel):
    """Update report request."""
    name: Optional[str] = None
    description: Optional[str] = None
    template_content: Optional[str] = None
    template_file: Optional[str] = None
    output_format: Optional[str] = None
    paper_format: Optional[str] = None
    orientation: Optional[str] = None
    margin_top: Optional[int] = None
    margin_bottom: Optional[int] = None
    margin_left: Optional[int] = None
    margin_right: Optional[int] = None
    header_html: Optional[str] = None
    footer_html: Optional[str] = None
    supports_multi: Optional[bool] = None
    is_active: Optional[bool] = None


class RenderReportRequest(BaseModel):
    """Render report request."""
    record_ids: List[int] = Field(..., min_items=1)
    parameters: Optional[Dict[str, Any]] = None
    output_format: Optional[str] = None


class CreateScheduleRequest(BaseModel):
    """Create schedule request."""
    name: str = Field(..., min_length=2, max_length=200)
    cron_expression: str = Field(..., min_length=9)
    parameters: Optional[Dict[str, Any]] = None
    output_format: Optional[str] = None
    email_to: Optional[str] = None
    email_subject: Optional[str] = None
    save_to_path: Optional[str] = None


# -------------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------------


def get_report_service(db: Session) -> ReportService:
    """Get report service instance."""
    return ReportService(db)


def report_to_response(report) -> ReportResponse:
    """Convert report to response model."""
    return ReportResponse(
        id=report.id,
        code=report.code,
        name=report.name,
        description=report.description,
        model_name=report.model_name,
        module_name=report.module_name,
        output_format=report.output_format,
        template_type=report.template_type,
        paper_format=report.paper_format,
        orientation=report.orientation,
        supports_multi=report.supports_multi,
        is_active=report.is_active,
        created_at=report.created_at.isoformat(),
    )


def execution_to_response(execution) -> ReportExecutionResponse:
    """Convert execution to response model."""
    return ReportExecutionResponse(
        id=execution.id,
        report_code=execution.report_code,
        model_name=execution.model_name,
        record_ids=execution.record_ids or [],
        output_format=execution.output_format,
        status=execution.status,
        file_path=execution.file_path,
        file_size=execution.file_size,
        duration_ms=execution.duration_ms,
        error_message=execution.error_message,
        created_at=execution.created_at.isoformat(),
    )


def schedule_to_response(schedule) -> ReportScheduleResponse:
    """Convert schedule to response model."""
    return ReportScheduleResponse(
        id=schedule.id,
        report_id=schedule.report_id,
        name=schedule.name,
        cron_expression=schedule.cron_expression,
        output_format=schedule.output_format,
        email_to=schedule.email_to,
        last_run=schedule.last_run.isoformat() if schedule.last_run else None,
        next_run=schedule.next_run.isoformat() if schedule.next_run else None,
        last_status=schedule.last_status,
        is_active=schedule.is_active,
        created_at=schedule.created_at.isoformat(),
    )


# -------------------------------------------------------------------------
# Report Definition Endpoints
# -------------------------------------------------------------------------


@router.get("/", response_model=List[ReportResponse])
def list_reports(
    model_name: Optional[str] = None,
    module_name: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List available reports."""
    service = get_report_service(db)
    reports = service.list_reports(
        model_name=model_name,
        module_name=module_name,
        is_active=active_only,
    )
    return [report_to_response(r) for r in reports]


@router.get("/{report_code}", response_model=ReportResponse)
def get_report(
    report_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a report by code."""
    service = get_report_service(db)
    report = service.get_report_by_code(report_code)

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    return report_to_response(report)


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    data: CreateReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new report definition."""
    service = get_report_service(db)

    try:
        report = service.create_report(**data.model_dump())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return report_to_response(report)


@router.put("/{report_code}", response_model=ReportResponse)
def update_report(
    report_code: str,
    data: UpdateReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a report definition."""
    service = get_report_service(db)
    report = service.get_report_by_code(report_code)

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    updated = service.update_report(
        report.id,
        **data.model_dump(exclude_unset=True)
    )

    return report_to_response(updated)


@router.delete("/{report_code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a report definition."""
    service = get_report_service(db)
    report = service.get_report_by_code(report_code)

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    service.delete_report(report.id)


# -------------------------------------------------------------------------
# Report Rendering Endpoints
# -------------------------------------------------------------------------


@router.post("/{report_code}/render")
def render_report(
    report_code: str,
    data: RenderReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Render a report for given records.

    Returns the generated file as a download.
    """
    service = get_report_service(db)

    try:
        result = service.render_report(
            report_code=report_code,
            record_ids=data.record_ids,
            user_id=current_user.id,
            parameters=data.parameters,
            output_format=data.output_format,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {e}"
        )

    # Return file as streaming response
    return StreamingResponse(
        io.BytesIO(result['content']),
        media_type=result['content_type'],
        headers={
            'Content-Disposition': f'attachment; filename="{result["filename"]}"'
        }
    )


@router.post("/{report_code}/preview", response_model=Dict[str, str])
def preview_report(
    report_code: str,
    sample_data: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Preview a report with sample data."""
    service = get_report_service(db)

    try:
        html = service.preview_report(report_code, sample_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return {"html": html}


# -------------------------------------------------------------------------
# Report Execution History
# -------------------------------------------------------------------------


@router.get("/{report_code}/executions", response_model=List[ReportExecutionResponse])
def list_report_executions(
    report_code: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get execution history for a report."""
    service = get_report_service(db)
    report = service.get_report_by_code(report_code)

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    executions = service.list_executions(report_id=report.id, limit=limit)
    return [execution_to_response(e) for e in executions]


@router.get("/executions/{execution_id}", response_model=ReportExecutionResponse)
def get_execution(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific execution."""
    service = get_report_service(db)
    execution = service.get_execution(execution_id)

    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )

    return execution_to_response(execution)


# -------------------------------------------------------------------------
# Report Schedules
# -------------------------------------------------------------------------


@router.get("/{report_code}/schedules", response_model=List[ReportScheduleResponse])
def list_report_schedules(
    report_code: str,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get schedules for a report."""
    service = get_report_service(db)
    report = service.get_report_by_code(report_code)

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    schedules = service.list_schedules(report_id=report.id, is_active=active_only)
    return [schedule_to_response(s) for s in schedules]


@router.post("/{report_code}/schedules", response_model=ReportScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    report_code: str,
    data: CreateScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a schedule for a report."""
    service = get_report_service(db)
    report = service.get_report_by_code(report_code)

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    try:
        schedule = service.create_schedule(
            report_id=report.id,
            **data.model_dump()
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return schedule_to_response(schedule)


# -------------------------------------------------------------------------
# Model Reports
# -------------------------------------------------------------------------


@router.get("/model/{model_name}", response_model=List[ReportResponse])
def get_model_reports(
    model_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all available reports for a model."""
    service = get_report_service(db)
    reports = service.list_reports(model_name=model_name)
    return [report_to_response(r) for r in reports]
