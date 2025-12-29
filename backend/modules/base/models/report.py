"""
Report Framework Models

Provides report generation functionality with:
- PDF/Excel/CSV/HTML output formats
- Jinja2 templates for content
- Record data binding
- Access control
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Integer, String, Text,
    ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import Session, relationship

from app.db.base import Base
from app.models.base import TimestampMixin, AuditMixin


class ReportFormat(str, Enum):
    """Report output formats."""
    PDF = "pdf"
    HTML = "html"
    XLSX = "xlsx"
    CSV = "csv"
    JSON = "json"


class ReportTemplateType(str, Enum):
    """Report template types."""
    JINJA2 = "jinja2"
    QWEB = "qweb"  # Odoo-style
    CUSTOM = "custom"


class PaperFormat(str, Enum):
    """Paper formats for PDF."""
    A4 = "A4"
    A3 = "A3"
    LETTER = "Letter"
    LEGAL = "Legal"
    CUSTOM = "custom"


class ReportDefinition(Base, TimestampMixin, AuditMixin):
    """
    Report definition.

    Configures reports that can be generated for model records.

    Example:
        ReportDefinition(
            name="Invoice Report",
            code="invoice_report",
            model_name="account.invoice",
            output_format="pdf",
            template_type="jinja2",
            template_content="<html>{{ record.name }}...</html>"
        )
    """

    __tablename__ = "report_definitions"
    __table_args__ = (
        Index("ix_report_definitions_model", "model_name"),
        Index("ix_report_definitions_module", "module_name"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Identification
    name = Column(
        String(200),
        nullable=False,
        comment="Human-readable report name"
    )
    code = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique report code"
    )
    description = Column(
        Text,
        nullable=True,
        comment="Report description"
    )

    # Ownership
    module_name = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Module that owns this report"
    )

    # Model binding
    model_name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Model for record data"
    )

    # Output configuration
    output_format = Column(
        String(10),
        default=ReportFormat.PDF.value,
        comment="Output format: pdf, html, xlsx, csv, json"
    )

    # Template configuration
    template_type = Column(
        String(20),
        default=ReportTemplateType.JINJA2.value,
        comment="Template type: jinja2, qweb, custom"
    )
    template_content = Column(
        Text,
        nullable=True,
        comment="Template content (Jinja2 HTML)"
    )
    template_file = Column(
        String(500),
        nullable=True,
        comment="Path to template file"
    )

    # PDF settings
    paper_format = Column(
        String(20),
        default=PaperFormat.A4.value,
        comment="Paper format: A4, A3, Letter, Legal, custom"
    )
    orientation = Column(
        String(20),
        default="portrait",
        comment="Page orientation: portrait, landscape"
    )
    margin_top = Column(
        Integer,
        default=10,
        comment="Top margin in mm"
    )
    margin_bottom = Column(
        Integer,
        default=10,
        comment="Bottom margin in mm"
    )
    margin_left = Column(
        Integer,
        default=10,
        comment="Left margin in mm"
    )
    margin_right = Column(
        Integer,
        default=10,
        comment="Right margin in mm"
    )
    header_html = Column(
        Text,
        nullable=True,
        comment="Page header HTML template"
    )
    footer_html = Column(
        Text,
        nullable=True,
        comment="Page footer HTML template"
    )

    # Excel settings
    excel_sheet_name = Column(
        String(100),
        nullable=True,
        comment="Sheet name for Excel output"
    )
    excel_template_file = Column(
        String(500),
        nullable=True,
        comment="Path to Excel template file"
    )

    # Data configuration
    data_query = Column(
        Text,
        nullable=True,
        comment="Custom SQL or ORM query for data"
    )
    default_filters = Column(
        JSONB,
        default=dict,
        comment="Default filter parameters"
    )
    allow_filters = Column(
        Boolean,
        default=True,
        comment="Allow user to add filters"
    )

    # Access control
    required_groups = Column(
        JSONB,
        default=list,
        comment="Groups required to run this report"
    )

    # Multi-record support
    supports_multi = Column(
        Boolean,
        default=False,
        comment="Whether report can handle multiple records"
    )

    # Status
    is_active = Column(
        Boolean,
        default=True,
        comment="Whether this report is active"
    )

    # Preview/Testing
    preview_record_id = Column(
        Integer,
        nullable=True,
        comment="Record ID for preview"
    )

    def __repr__(self) -> str:
        return f"<ReportDefinition({self.code}: {self.name})>"

    @classmethod
    def get_by_code(cls, db: Session, code: str) -> Optional["ReportDefinition"]:
        """Get report by code."""
        return db.query(cls).filter(
            cls.code == code,
            cls.is_active == True
        ).first()

    @classmethod
    def get_for_model(cls, db: Session, model_name: str) -> List["ReportDefinition"]:
        """Get all reports for a model."""
        return db.query(cls).filter(
            cls.model_name == model_name,
            cls.is_active == True
        ).order_by(cls.name).all()


class ReportExecution(Base, TimestampMixin):
    """
    Report execution log.

    Tracks report generation with timing and parameters.
    """

    __tablename__ = "report_executions"
    __table_args__ = (
        Index("ix_report_executions_report", "report_id"),
        Index("ix_report_executions_user", "user_id"),
        Index("ix_report_executions_created", "created_at"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Report reference
    report_id = Column(
        Integer,
        ForeignKey("report_definitions.id", ondelete="SET NULL"),
        nullable=True
    )
    report_code = Column(
        String(100),
        nullable=False,
        comment="Report code (denormalized)"
    )

    # Execution context
    user_id = Column(
        Integer,
        nullable=True,
        comment="User who ran the report"
    )
    model_name = Column(
        String(100),
        nullable=True,
        comment="Model name"
    )
    record_ids = Column(
        JSONB,
        default=list,
        comment="List of record IDs"
    )
    parameters = Column(
        JSONB,
        default=dict,
        comment="Report parameters/filters"
    )

    # Output
    output_format = Column(
        String(10),
        nullable=False,
        comment="Output format used"
    )
    file_path = Column(
        String(500),
        nullable=True,
        comment="Generated file path"
    )
    file_size = Column(
        Integer,
        nullable=True,
        comment="File size in bytes"
    )

    # Timing
    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When generation started"
    )
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When generation completed"
    )
    duration_ms = Column(
        Integer,
        nullable=True,
        comment="Duration in milliseconds"
    )

    # Status
    status = Column(
        String(20),
        default="pending",
        comment="Status: pending, running, completed, failed"
    )
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if failed"
    )

    # Relationships
    report = relationship("ReportDefinition")

    def __repr__(self) -> str:
        return f"<ReportExecution({self.id}: {self.report_code} - {self.status})>"

    def start(self) -> None:
        """Mark execution as started."""
        self.status = "running"
        self.started_at = datetime.utcnow()

    def complete(self, file_path: str, file_size: int) -> None:
        """Mark execution as completed."""
        self.status = "completed"
        self.completed_at = datetime.utcnow()
        self.file_path = file_path
        self.file_size = file_size
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_ms = int(delta.total_seconds() * 1000)

    def fail(self, error: str) -> None:
        """Mark execution as failed."""
        self.status = "failed"
        self.completed_at = datetime.utcnow()
        self.error_message = error
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_ms = int(delta.total_seconds() * 1000)


class ReportSchedule(Base, TimestampMixin, AuditMixin):
    """
    Scheduled report generation.

    Configures automatic report generation on schedule.
    """

    __tablename__ = "report_schedules"
    __table_args__ = (
        Index("ix_report_schedules_report", "report_id"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Report reference
    report_id = Column(
        Integer,
        ForeignKey("report_definitions.id", ondelete="CASCADE"),
        nullable=False
    )

    # Schedule configuration
    name = Column(
        String(200),
        nullable=False,
        comment="Schedule name"
    )
    cron_expression = Column(
        String(100),
        nullable=False,
        comment="Cron expression for schedule"
    )

    # Report parameters
    parameters = Column(
        JSONB,
        default=dict,
        comment="Report parameters"
    )
    output_format = Column(
        String(10),
        nullable=True,
        comment="Override output format"
    )

    # Delivery configuration
    email_to = Column(
        String(500),
        nullable=True,
        comment="Email recipients"
    )
    email_subject = Column(
        String(200),
        nullable=True,
        comment="Email subject template"
    )
    save_to_path = Column(
        String(500),
        nullable=True,
        comment="Path to save generated report"
    )

    # Execution tracking
    last_run = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last execution time"
    )
    next_run = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Next scheduled run"
    )
    last_status = Column(
        String(20),
        nullable=True,
        comment="Last run status"
    )

    # Status
    is_active = Column(
        Boolean,
        default=True,
        comment="Whether this schedule is active"
    )

    # Relationships
    report = relationship("ReportDefinition")

    def __repr__(self) -> str:
        return f"<ReportSchedule({self.id}: {self.name})>"
