"""
Report Service

Provides report generation with:
- PDF/Excel/CSV/HTML output formats
- Jinja2 templates
- Record data binding
- Execution logging
"""

import io
import json
import csv
import hashlib
import logging
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from decimal import Decimal

from sqlalchemy.orm import Session
from jinja2 import Environment, BaseLoader, TemplateError

from ..models.report import (
    ReportDefinition,
    ReportExecution,
    ReportSchedule,
    ReportFormat,
)

logger = logging.getLogger(__name__)


class ReportService:
    """Service for report generation and management."""

    def __init__(self, db: Session):
        self.db = db
        self._jinja_env = None

    @property
    def jinja_env(self) -> Environment:
        """Get Jinja2 environment."""
        if self._jinja_env is None:
            self._jinja_env = Environment(
                loader=BaseLoader(),
                autoescape=True,
            )
            # Add custom filters
            self._jinja_env.filters['currency'] = self._format_currency
            self._jinja_env.filters['date'] = self._format_date
            self._jinja_env.filters['datetime'] = self._format_datetime
            self._jinja_env.filters['number'] = self._format_number
        return self._jinja_env

    # ==================== Report Definition CRUD ====================

    def create_report(
        self,
        code: str,
        name: str,
        model_name: str,
        output_format: str = ReportFormat.PDF.value,
        template_content: Optional[str] = None,
        template_file: Optional[str] = None,
        module_name: Optional[str] = None,
        **kwargs,
    ) -> ReportDefinition:
        """Create a new report definition."""
        # Check for duplicate code
        existing = self.get_report_by_code(code)
        if existing:
            raise ValueError(f"Report with code '{code}' already exists")

        report = ReportDefinition(
            code=code,
            name=name,
            model_name=model_name,
            output_format=output_format,
            template_content=template_content,
            template_file=template_file,
            module_name=module_name,
            **kwargs,
        )

        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def get_report(self, report_id: int) -> Optional[ReportDefinition]:
        """Get report by ID."""
        return self.db.query(ReportDefinition).filter(
            ReportDefinition.id == report_id
        ).first()

    def get_report_by_code(self, code: str) -> Optional[ReportDefinition]:
        """Get report by code."""
        return self.db.query(ReportDefinition).filter(
            ReportDefinition.code == code
        ).first()

    def list_reports(
        self,
        model_name: Optional[str] = None,
        module_name: Optional[str] = None,
        is_active: bool = True,
    ) -> List[ReportDefinition]:
        """List reports with filters."""
        query = self.db.query(ReportDefinition)

        if model_name:
            query = query.filter(ReportDefinition.model_name == model_name)
        if module_name:
            query = query.filter(ReportDefinition.module_name == module_name)
        if is_active:
            query = query.filter(ReportDefinition.is_active == True)

        return query.order_by(ReportDefinition.name).all()

    def update_report(
        self,
        report_id: int,
        **kwargs,
    ) -> Optional[ReportDefinition]:
        """Update a report definition."""
        report = self.get_report(report_id)
        if not report:
            return None

        for key, value in kwargs.items():
            if hasattr(report, key):
                setattr(report, key, value)

        self.db.commit()
        self.db.refresh(report)
        return report

    def delete_report(self, report_id: int) -> bool:
        """Delete a report definition."""
        report = self.get_report(report_id)
        if not report:
            return False

        self.db.delete(report)
        self.db.commit()
        return True

    # ==================== Report Rendering ====================

    def render_report(
        self,
        report_code: str,
        record_ids: List[int],
        user_id: Optional[int] = None,
        parameters: Optional[Dict] = None,
        output_format: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Render a report for given records.

        Returns:
            Dict with keys: content, content_type, filename, execution_id
        """
        report = self.get_report_by_code(report_code)
        if not report:
            raise ValueError(f"Report '{report_code}' not found")

        if not report.is_active:
            raise ValueError(f"Report '{report_code}' is not active")

        # Use specified format or default from report
        format_to_use = output_format or report.output_format

        # Create execution record
        execution = ReportExecution(
            report_id=report.id,
            report_code=report.code,
            user_id=user_id,
            model_name=report.model_name,
            record_ids=record_ids,
            parameters=parameters or {},
            output_format=format_to_use,
        )
        self.db.add(execution)
        self.db.commit()

        execution.start()
        self.db.commit()

        try:
            # Get record data
            records = self._get_record_data(report.model_name, record_ids)

            # Render template
            context = {
                'records': records,
                'record': records[0] if len(records) == 1 else None,
                'report': report,
                'parameters': parameters or {},
                'now': datetime.utcnow(),
            }

            html_content = self._render_template(report, context)

            # Generate output
            if format_to_use == ReportFormat.PDF.value:
                content, content_type = self._generate_pdf(report, html_content)
                extension = 'pdf'
            elif format_to_use == ReportFormat.XLSX.value:
                content, content_type = self._generate_excel(report, records, context)
                extension = 'xlsx'
            elif format_to_use == ReportFormat.CSV.value:
                content, content_type = self._generate_csv(records)
                extension = 'csv'
            elif format_to_use == ReportFormat.JSON.value:
                content, content_type = self._generate_json(records)
                extension = 'json'
            else:  # HTML
                content = html_content.encode('utf-8')
                content_type = 'text/html'
                extension = 'html'

            # Save to temp file
            filename = f"{report.code}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{extension}"
            temp_path = Path(tempfile.gettempdir()) / filename
            temp_path.write_bytes(content)

            execution.complete(str(temp_path), len(content))
            self.db.commit()

            return {
                'content': content,
                'content_type': content_type,
                'filename': filename,
                'execution_id': execution.id,
            }

        except Exception as e:
            logger.exception(f"Failed to render report {report_code}")
            execution.fail(str(e))
            self.db.commit()
            raise

    def _get_record_data(
        self,
        model_name: str,
        record_ids: List[int],
    ) -> List[Dict[str, Any]]:
        """Get record data from database."""
        # This is a simplified version - in practice, you'd use
        # the model introspection service to dynamically query
        from app.core.modules import ModuleRegistry

        registry = ModuleRegistry.get_registry()

        # Try to get model class
        model_class = registry.get_model_class(model_name)
        if model_class:
            records = self.db.query(model_class).filter(
                model_class.id.in_(record_ids)
            ).all()
            return [self._model_to_dict(r) for r in records]

        return []

    def _model_to_dict(self, obj: Any) -> Dict[str, Any]:
        """Convert SQLAlchemy model to dictionary."""
        result = {}
        for column in obj.__table__.columns:
            value = getattr(obj, column.name)
            if isinstance(value, datetime):
                value = value.isoformat()
            elif isinstance(value, Decimal):
                value = float(value)
            result[column.name] = value
        return result

    def _render_template(
        self,
        report: ReportDefinition,
        context: Dict[str, Any],
    ) -> str:
        """Render Jinja2 template."""
        template_content = report.template_content

        if not template_content and report.template_file:
            template_path = Path(report.template_file)
            if template_path.exists():
                template_content = template_path.read_text()

        if not template_content:
            # Default template
            template_content = """
            <html>
            <head><title>{{ report.name }}</title></head>
            <body>
                <h1>{{ report.name }}</h1>
                <p>Generated: {{ now }}</p>
                {% for record in records %}
                <div class="record">
                    {% for key, value in record.items() %}
                    <p><strong>{{ key }}:</strong> {{ value }}</p>
                    {% endfor %}
                </div>
                <hr>
                {% endfor %}
            </body>
            </html>
            """

        try:
            template = self.jinja_env.from_string(template_content)
            return template.render(**context)
        except TemplateError as e:
            raise ValueError(f"Template error: {e}")

    def _generate_pdf(
        self,
        report: ReportDefinition,
        html_content: str,
    ) -> tuple:
        """Generate PDF from HTML."""
        try:
            from weasyprint import HTML, CSS
        except ImportError:
            logger.warning("weasyprint not installed, returning HTML instead")
            return html_content.encode('utf-8'), 'text/html'

        # Build CSS for paper settings
        css_content = f"""
        @page {{
            size: {report.paper_format} {report.orientation};
            margin: {report.margin_top}mm {report.margin_right}mm {report.margin_bottom}mm {report.margin_left}mm;
        }}
        """

        html = HTML(string=html_content)
        css = CSS(string=css_content)
        pdf_bytes = html.write_pdf(stylesheets=[css])

        return pdf_bytes, 'application/pdf'

    def _generate_excel(
        self,
        report: ReportDefinition,
        records: List[Dict],
        context: Dict,
    ) -> tuple:
        """Generate Excel file."""
        try:
            from openpyxl import Workbook
            from openpyxl.utils.dataframe import dataframe_to_rows
        except ImportError:
            # Fallback to CSV
            return self._generate_csv(records)

        wb = Workbook()
        ws = wb.active
        ws.title = report.excel_sheet_name or 'Report'

        if records:
            # Header row
            headers = list(records[0].keys())
            ws.append(headers)

            # Data rows
            for record in records:
                ws.append([record.get(h) for h in headers])

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        return output.read(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    def _generate_csv(self, records: List[Dict]) -> tuple:
        """Generate CSV file."""
        if not records:
            return b'', 'text/csv'

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)

        return output.getvalue().encode('utf-8'), 'text/csv'

    def _generate_json(self, records: List[Dict]) -> tuple:
        """Generate JSON file."""
        return json.dumps(records, indent=2, default=str).encode('utf-8'), 'application/json'

    # ==================== Template Filters ====================

    @staticmethod
    def _format_currency(value: Any, currency: str = 'USD') -> str:
        """Format value as currency."""
        if value is None:
            return ''
        try:
            amount = float(value)
            if currency == 'USD':
                return f'${amount:,.2f}'
            return f'{amount:,.2f} {currency}'
        except (ValueError, TypeError):
            return str(value)

    @staticmethod
    def _format_date(value: Any, format: str = '%Y-%m-%d') -> str:
        """Format date."""
        if value is None:
            return ''
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value)
            except ValueError:
                return value
        if isinstance(value, datetime):
            return value.strftime(format)
        return str(value)

    @staticmethod
    def _format_datetime(value: Any, format: str = '%Y-%m-%d %H:%M') -> str:
        """Format datetime."""
        return ReportService._format_date(value, format)

    @staticmethod
    def _format_number(value: Any, decimals: int = 2) -> str:
        """Format number."""
        if value is None:
            return ''
        try:
            return f'{float(value):,.{decimals}f}'
        except (ValueError, TypeError):
            return str(value)

    # ==================== Preview ====================

    def preview_report(
        self,
        report_code: str,
        sample_data: Optional[Dict] = None,
    ) -> str:
        """Preview report with sample data."""
        report = self.get_report_by_code(report_code)
        if not report:
            raise ValueError(f"Report '{report_code}' not found")

        # Use sample data or fetch preview record
        if sample_data:
            records = [sample_data]
        elif report.preview_record_id:
            records = self._get_record_data(report.model_name, [report.preview_record_id])
        else:
            records = [{'id': 1, 'name': 'Sample Record'}]

        context = {
            'records': records,
            'record': records[0] if records else None,
            'report': report,
            'parameters': {},
            'now': datetime.utcnow(),
        }

        return self._render_template(report, context)

    # ==================== Execution History ====================

    def get_execution(self, execution_id: int) -> Optional[ReportExecution]:
        """Get execution by ID."""
        return self.db.query(ReportExecution).filter(
            ReportExecution.id == execution_id
        ).first()

    def list_executions(
        self,
        report_id: Optional[int] = None,
        user_id: Optional[int] = None,
        limit: int = 50,
    ) -> List[ReportExecution]:
        """List report executions."""
        query = self.db.query(ReportExecution)

        if report_id:
            query = query.filter(ReportExecution.report_id == report_id)
        if user_id:
            query = query.filter(ReportExecution.user_id == user_id)

        return query.order_by(
            ReportExecution.created_at.desc()
        ).limit(limit).all()

    # ==================== Schedule Management ====================

    def create_schedule(
        self,
        report_id: int,
        name: str,
        cron_expression: str,
        **kwargs,
    ) -> ReportSchedule:
        """Create a report schedule."""
        report = self.get_report(report_id)
        if not report:
            raise ValueError(f"Report {report_id} not found")

        schedule = ReportSchedule(
            report_id=report_id,
            name=name,
            cron_expression=cron_expression,
            **kwargs,
        )

        self.db.add(schedule)
        self.db.commit()
        self.db.refresh(schedule)
        return schedule

    def list_schedules(
        self,
        report_id: Optional[int] = None,
        is_active: bool = True,
    ) -> List[ReportSchedule]:
        """List report schedules."""
        query = self.db.query(ReportSchedule)

        if report_id:
            query = query.filter(ReportSchedule.report_id == report_id)
        if is_active:
            query = query.filter(ReportSchedule.is_active == True)

        return query.all()
