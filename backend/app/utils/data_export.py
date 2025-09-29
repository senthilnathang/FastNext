from typing import Dict, List, Any, Optional, Union, AsyncGenerator, BinaryIO
from fastapi import BackgroundTasks, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from sqlalchemy.orm import selectinload
import asyncio
import csv
import json
import xml.etree.ElementTree as ET
from xml.dom import minidom
import xlsxwriter
import io
import zipfile
import logging
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path
import tempfile
import aiofiles
from enum import Enum
import pandas as pd
import yaml

from app.core.config import settings
from app.core.logging import get_logger
from app.models.base import Base

logger = get_logger(__name__)

class ExportFormat(str, Enum):
    """Supported export formats"""
    CSV = "csv"
    JSON = "json"
    XLSX = "xlsx"
    XML = "xml"
    YAML = "yaml"
    SQL = "sql"
    PARQUET = "parquet"

class ExportStatus(str, Enum):
    """Export job status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class DataExporter:
    """Comprehensive data export utility with multiple format support"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.export_jobs: Dict[str, Dict[str, Any]] = {}
        self.max_rows_per_export = 1000000  # 1M rows limit
        self.chunk_size = 10000  # Process in chunks
    
    async def export_table(
        self,
        table_name: str,
        format: ExportFormat,
        filters: Optional[Dict[str, Any]] = None,
        columns: Optional[List[str]] = None,
        limit: Optional[int] = None,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Union[StreamingResponse, Dict[str, str]]:
        """Export a database table in specified format"""
        
        try:
            # Validate table exists
            if not await self._table_exists(table_name):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Table '{table_name}' not found"
                )
            
            # Get row count
            row_count = await self._get_row_count(table_name, filters)
            
            if row_count > self.max_rows_per_export:
                # Large export - run in background
                if background_tasks is None:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Export too large ({row_count} rows). Use background export."
                    )
                
                job_id = await self._start_background_export(
                    table_name, format, filters, columns, limit, background_tasks
                )
                
                return {"job_id": job_id, "status": "started", "estimated_rows": row_count}
            
            # Small export - stream directly
            return await self._stream_export(table_name, format, filters, columns, limit)
            
        except Exception as e:
            logger.error(f"Export failed for table {table_name}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Export failed: {str(e)}"
            )
    
    async def export_query(
        self,
        query: str,
        format: ExportFormat,
        parameters: Optional[Dict[str, Any]] = None,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Union[StreamingResponse, Dict[str, str]]:
        """Export results of a custom SQL query"""
        
        try:
            # Validate query (basic security check)
            if not self._is_safe_query(query):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Query contains potentially dangerous operations"
                )
            
            # Estimate row count
            count_query = f"SELECT COUNT(*) FROM ({query}) as subquery"
            result = await self.session.execute(text(count_query), parameters or {})
            row_count = result.scalar()
            
            if row_count > self.max_rows_per_export:
                # Large export - run in background
                if background_tasks is None:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Query result too large ({row_count} rows). Use background export."
                    )
                
                job_id = await self._start_background_query_export(
                    query, format, parameters, background_tasks
                )
                
                return {"job_id": job_id, "status": "started", "estimated_rows": row_count}
            
            # Small export - stream directly
            return await self._stream_query_export(query, format, parameters)
            
        except Exception as e:
            logger.error(f"Query export failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Query export failed: {str(e)}"
            )
    
    async def _table_exists(self, table_name: str) -> bool:
        """Check if table exists in database"""
        
        query = """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = :table_name
        )
        """
        
        result = await self.session.execute(text(query), {"table_name": table_name})
        return result.scalar()
    
    async def _get_row_count(self, table_name: str, filters: Optional[Dict[str, Any]] = None) -> int:
        """Get row count for table with optional filters"""
        
        query = f"SELECT COUNT(*) FROM {table_name}"
        params = {}
        
        if filters:
            where_conditions = []
            for column, value in filters.items():
                if isinstance(value, dict) and "operator" in value:
                    # Handle complex filters
                    op = value["operator"]
                    val = value["value"]
                    
                    if op == "in":
                        placeholders = ",".join([f":filter_{column}_{i}" for i in range(len(val))])
                        where_conditions.append(f"{column} IN ({placeholders})")
                        for i, v in enumerate(val):
                            params[f"filter_{column}_{i}"] = v
                    elif op in [">=", "<=", ">", "<", "!=", "="]:
                        where_conditions.append(f"{column} {op} :filter_{column}")
                        params[f"filter_{column}"] = val
                    elif op == "like":
                        where_conditions.append(f"{column} LIKE :filter_{column}")
                        params[f"filter_{column}"] = val
                else:
                    # Simple equality filter
                    where_conditions.append(f"{column} = :filter_{column}")
                    params[f"filter_{column}"] = value
            
            if where_conditions:
                query += " WHERE " + " AND ".join(where_conditions)
        
        result = await self.session.execute(text(query), params)
        return result.scalar()
    
    def _is_safe_query(self, query: str) -> bool:
        """Basic SQL injection and dangerous operation detection"""
        
        dangerous_keywords = [
            "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE",
            "TRUNCATE", "EXEC", "EXECUTE", "xp_", "sp_"
        ]
        
        query_upper = query.upper()
        
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                return False
        
        return True
    
    async def _stream_export(
        self,
        table_name: str,
        format: ExportFormat,
        filters: Optional[Dict[str, Any]] = None,
        columns: Optional[List[str]] = None,
        limit: Optional[int] = None
    ) -> StreamingResponse:
        """Stream table export directly to client"""
        
        async def generate_export():
            async for chunk in self._export_table_chunks(table_name, format, filters, columns, limit):
                yield chunk
        
        media_type, filename = self._get_media_type_and_filename(format, table_name)
        
        return StreamingResponse(
            generate_export(),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    async def _stream_query_export(
        self,
        query: str,
        format: ExportFormat,
        parameters: Optional[Dict[str, Any]] = None
    ) -> StreamingResponse:
        """Stream query export directly to client"""
        
        async def generate_export():
            async for chunk in self._export_query_chunks(query, format, parameters):
                yield chunk
        
        media_type, filename = self._get_media_type_and_filename(format, "query_result")
        
        return StreamingResponse(
            generate_export(),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    async def _export_table_chunks(
        self,
        table_name: str,
        format: ExportFormat,
        filters: Optional[Dict[str, Any]] = None,
        columns: Optional[List[str]] = None,
        limit: Optional[int] = None
    ) -> AsyncGenerator[bytes, None]:
        """Generate export data in chunks"""
        
        # Build query
        column_list = "*" if not columns else ", ".join(columns)
        query = f"SELECT {column_list} FROM {table_name}"
        params = {}
        
        # Add filters
        if filters:
            where_conditions = []
            for column, value in filters.items():
                where_conditions.append(f"{column} = :filter_{column}")
                params[f"filter_{column}"] = value
            
            if where_conditions:
                query += " WHERE " + " AND ".join(where_conditions)
        
        # Add limit
        if limit:
            query += f" LIMIT {limit}"
        
        # Export based on format
        async for chunk in self._export_data_chunks(query, format, params):
            yield chunk
    
    async def _export_query_chunks(
        self,
        query: str,
        format: ExportFormat,
        parameters: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[bytes, None]:
        """Generate query export data in chunks"""
        
        async for chunk in self._export_data_chunks(query, format, parameters or {}):
            yield chunk
    
    async def _export_data_chunks(
        self,
        query: str,
        format: ExportFormat,
        parameters: Dict[str, Any]
    ) -> AsyncGenerator[bytes, None]:
        """Core export logic for different formats"""
        
        if format == ExportFormat.CSV:
            async for chunk in self._export_csv_chunks(query, parameters):
                yield chunk
        
        elif format == ExportFormat.JSON:
            async for chunk in self._export_json_chunks(query, parameters):
                yield chunk
        
        elif format == ExportFormat.XLSX:
            async for chunk in self._export_xlsx_chunks(query, parameters):
                yield chunk
        
        elif format == ExportFormat.XML:
            async for chunk in self._export_xml_chunks(query, parameters):
                yield chunk
        
        elif format == ExportFormat.YAML:
            async for chunk in self._export_yaml_chunks(query, parameters):
                yield chunk
        
        elif format == ExportFormat.SQL:
            async for chunk in self._export_sql_chunks(query, parameters):
                yield chunk
        
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    async def _export_csv_chunks(self, query: str, parameters: Dict[str, Any]) -> AsyncGenerator[bytes, None]:
        """Export data as CSV chunks"""
        
        # Execute query and get results
        result = await self.session.execute(text(query), parameters)
        columns = result.keys()
        
        # Generate CSV header
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(columns)
        yield output.getvalue().encode('utf-8')
        
        # Process rows in chunks
        chunk_count = 0
        output = io.StringIO()
        writer = csv.writer(output)
        
        async for row in result:
            # Convert row to CSV-safe values
            csv_row = []
            for value in row:
                if value is None:
                    csv_row.append("")
                elif isinstance(value, (datetime, date)):
                    csv_row.append(value.isoformat())
                elif isinstance(value, Decimal):
                    csv_row.append(str(value))
                else:
                    csv_row.append(str(value))
            
            writer.writerow(csv_row)
            chunk_count += 1
            
            # Yield chunk every N rows
            if chunk_count >= self.chunk_size:
                yield output.getvalue().encode('utf-8')
                output = io.StringIO()
                writer = csv.writer(output)
                chunk_count = 0
        
        # Yield final chunk
        if chunk_count > 0:
            yield output.getvalue().encode('utf-8')
    
    async def _export_json_chunks(self, query: str, parameters: Dict[str, Any]) -> AsyncGenerator[bytes, None]:
        """Export data as JSON chunks"""
        
        result = await self.session.execute(text(query), parameters)
        columns = result.keys()
        
        # Start JSON array
        yield b'['
        
        first_row = True
        chunk_data = []
        
        async for row in result:
            # Convert row to JSON-safe dict
            row_dict = {}
            for i, value in enumerate(row):
                column_name = columns[i]
                
                if value is None:
                    row_dict[column_name] = None
                elif isinstance(value, (datetime, date)):
                    row_dict[column_name] = value.isoformat()
                elif isinstance(value, Decimal):
                    row_dict[column_name] = float(value)
                else:
                    row_dict[column_name] = value
            
            chunk_data.append(row_dict)
            
            # Yield chunk every N rows
            if len(chunk_data) >= self.chunk_size:
                chunk_json = json.dumps(chunk_data, default=str)
                
                if not first_row:
                    yield b','
                
                yield chunk_json.encode('utf-8')
                first_row = False
                chunk_data = []
        
        # Yield final chunk
        if chunk_data:
            chunk_json = json.dumps(chunk_data, default=str)
            
            if not first_row:
                yield b','
            
            yield chunk_json.encode('utf-8')
        
        # End JSON array
        yield b']'
    
    async def _export_xlsx_chunks(self, query: str, parameters: Dict[str, Any]) -> AsyncGenerator[bytes, None]:
        """Export data as XLSX file"""
        
        # For XLSX, we need to create the entire file in memory
        # This is not ideal for very large datasets
        
        with tempfile.NamedTemporaryFile() as tmp_file:
            workbook = xlsxwriter.Workbook(tmp_file.name, {'constant_memory': True})
            worksheet = workbook.add_worksheet('Data')
            
            result = await self.session.execute(text(query), parameters)
            columns = result.keys()
            
            # Write headers
            for col_idx, column in enumerate(columns):
                worksheet.write(0, col_idx, column)
            
            # Write data rows
            row_idx = 1
            async for row in result:
                for col_idx, value in enumerate(row):
                    if value is None:
                        worksheet.write(row_idx, col_idx, "")
                    elif isinstance(value, (datetime, date)):
                        worksheet.write(row_idx, col_idx, value.isoformat())
                    elif isinstance(value, Decimal):
                        worksheet.write(row_idx, col_idx, float(value))
                    else:
                        worksheet.write(row_idx, col_idx, value)
                
                row_idx += 1
            
            workbook.close()
            
            # Read file and yield
            with open(tmp_file.name, 'rb') as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    yield chunk
    
    async def _export_xml_chunks(self, query: str, parameters: Dict[str, Any]) -> AsyncGenerator[bytes, None]:
        """Export data as XML chunks"""
        
        result = await self.session.execute(text(query), parameters)
        columns = result.keys()
        
        # Start XML document
        yield b'<?xml version="1.0" encoding="UTF-8"?>\n<data>\n'
        
        async for row in result:
            # Create XML element for each row
            row_element = ET.Element("row")
            
            for i, value in enumerate(row):
                column_name = columns[i]
                column_element = ET.SubElement(row_element, column_name)
                
                if value is not None:
                    if isinstance(value, (datetime, date)):
                        column_element.text = value.isoformat()
                    elif isinstance(value, Decimal):
                        column_element.text = str(value)
                    else:
                        column_element.text = str(value)
            
            # Convert to string and yield
            rough_string = ET.tostring(row_element, 'unicode')
            reparsed = minidom.parseString(rough_string)
            yield reparsed.documentElement.toxml().encode('utf-8') + b'\n'
        
        # End XML document
        yield b'</data>'
    
    async def _export_yaml_chunks(self, query: str, parameters: Dict[str, Any]) -> AsyncGenerator[bytes, None]:
        """Export data as YAML chunks"""
        
        result = await self.session.execute(text(query), parameters)
        columns = result.keys()
        
        all_data = []
        
        async for row in result:
            row_dict = {}
            for i, value in enumerate(row):
                column_name = columns[i]
                
                if value is None:
                    row_dict[column_name] = None
                elif isinstance(value, (datetime, date)):
                    row_dict[column_name] = value.isoformat()
                elif isinstance(value, Decimal):
                    row_dict[column_name] = float(value)
                else:
                    row_dict[column_name] = value
            
            all_data.append(row_dict)
        
        # Convert to YAML and yield
        yaml_content = yaml.dump(all_data, default_flow_style=False, allow_unicode=True)
        yield yaml_content.encode('utf-8')
    
    async def _export_sql_chunks(self, query: str, parameters: Dict[str, Any]) -> AsyncGenerator[bytes, None]:
        """Export data as SQL INSERT statements"""
        
        # Extract table name from query (basic implementation)
        table_name = "exported_data"  # Default table name
        
        result = await self.session.execute(text(query), parameters)
        columns = result.keys()
        
        # Generate CREATE TABLE statement
        create_statement = f"CREATE TABLE {table_name} (\n"
        column_definitions = []
        
        for column in columns:
            column_definitions.append(f"  {column} TEXT")
        
        create_statement += ",\n".join(column_definitions) + "\n);\n\n"
        yield create_statement.encode('utf-8')
        
        # Generate INSERT statements
        async for row in result:
            values = []
            for value in row:
                if value is None:
                    values.append("NULL")
                elif isinstance(value, str):
                    escaped_value = value.replace("'", "''")
                    values.append(f"'{escaped_value}'")
                elif isinstance(value, (datetime, date)):
                    values.append(f"'{value.isoformat()}'")
                else:
                    values.append(str(value))
            
            insert_statement = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({', '.join(values)});\n"
            yield insert_statement.encode('utf-8')
    
    def _get_media_type_and_filename(self, format: ExportFormat, base_name: str) -> tuple:
        """Get media type and filename for export format"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        format_config = {
            ExportFormat.CSV: ("text/csv", f"{base_name}_{timestamp}.csv"),
            ExportFormat.JSON: ("application/json", f"{base_name}_{timestamp}.json"),
            ExportFormat.XLSX: ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"{base_name}_{timestamp}.xlsx"),
            ExportFormat.XML: ("application/xml", f"{base_name}_{timestamp}.xml"),
            ExportFormat.YAML: ("application/x-yaml", f"{base_name}_{timestamp}.yaml"),
            ExportFormat.SQL: ("application/sql", f"{base_name}_{timestamp}.sql"),
        }
        
        return format_config.get(format, ("application/octet-stream", f"{base_name}_{timestamp}.dat"))
    
    async def _start_background_export(
        self,
        table_name: str,
        format: ExportFormat,
        filters: Optional[Dict[str, Any]],
        columns: Optional[List[str]],
        limit: Optional[int],
        background_tasks: BackgroundTasks
    ) -> str:
        """Start background export job"""
        
        import uuid
        job_id = str(uuid.uuid4())
        
        self.export_jobs[job_id] = {
            "status": ExportStatus.PENDING,
            "created_at": datetime.utcnow(),
            "table_name": table_name,
            "format": format,
            "progress": 0
        }
        
        background_tasks.add_task(
            self._run_background_table_export,
            job_id, table_name, format, filters, columns, limit
        )
        
        return job_id
    
    async def _start_background_query_export(
        self,
        query: str,
        format: ExportFormat,
        parameters: Optional[Dict[str, Any]],
        background_tasks: BackgroundTasks
    ) -> str:
        """Start background query export job"""
        
        import uuid
        job_id = str(uuid.uuid4())
        
        self.export_jobs[job_id] = {
            "status": ExportStatus.PENDING,
            "created_at": datetime.utcnow(),
            "query": query[:100] + "..." if len(query) > 100 else query,
            "format": format,
            "progress": 0
        }
        
        background_tasks.add_task(
            self._run_background_query_export,
            job_id, query, format, parameters
        )
        
        return job_id
    
    async def _run_background_table_export(
        self,
        job_id: str,
        table_name: str,
        format: ExportFormat,
        filters: Optional[Dict[str, Any]],
        columns: Optional[List[str]],
        limit: Optional[int]
    ):
        """Run background table export"""
        
        try:
            self.export_jobs[job_id]["status"] = ExportStatus.IN_PROGRESS
            
            # Create export file
            export_dir = Path(settings.EXPORT_DIR if hasattr(settings, 'EXPORT_DIR') else '/tmp/exports')
            export_dir.mkdir(exist_ok=True)
            
            _, filename = self._get_media_type_and_filename(format, table_name)
            file_path = export_dir / f"{job_id}_{filename}"
            
            # Export to file
            async with aiofiles.open(file_path, 'wb') as f:
                async for chunk in self._export_table_chunks(table_name, format, filters, columns, limit):
                    await f.write(chunk)
            
            self.export_jobs[job_id].update({
                "status": ExportStatus.COMPLETED,
                "file_path": str(file_path),
                "completed_at": datetime.utcnow(),
                "progress": 100
            })
            
        except Exception as e:
            self.export_jobs[job_id].update({
                "status": ExportStatus.FAILED,
                "error": str(e),
                "failed_at": datetime.utcnow()
            })
            logger.error(f"Background export {job_id} failed: {e}")
    
    async def _run_background_query_export(
        self,
        job_id: str,
        query: str,
        format: ExportFormat,
        parameters: Optional[Dict[str, Any]]
    ):
        """Run background query export"""
        
        try:
            self.export_jobs[job_id]["status"] = ExportStatus.IN_PROGRESS
            
            # Create export file
            export_dir = Path(settings.EXPORT_DIR if hasattr(settings, 'EXPORT_DIR') else '/tmp/exports')
            export_dir.mkdir(exist_ok=True)
            
            _, filename = self._get_media_type_and_filename(format, "query_result")
            file_path = export_dir / f"{job_id}_{filename}"
            
            # Export to file
            async with aiofiles.open(file_path, 'wb') as f:
                async for chunk in self._export_query_chunks(query, format, parameters):
                    await f.write(chunk)
            
            self.export_jobs[job_id].update({
                "status": ExportStatus.COMPLETED,
                "file_path": str(file_path),
                "completed_at": datetime.utcnow(),
                "progress": 100
            })
            
        except Exception as e:
            self.export_jobs[job_id].update({
                "status": ExportStatus.FAILED,
                "error": str(e),
                "failed_at": datetime.utcnow()
            })
            logger.error(f"Background query export {job_id} failed: {e}")
    
    async def get_export_status(self, job_id: str) -> Dict[str, Any]:
        """Get status of export job"""
        
        if job_id not in self.export_jobs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Export job not found"
            )
        
        return self.export_jobs[job_id]
    
    async def download_export(self, job_id: str) -> StreamingResponse:
        """Download completed export file"""
        
        if job_id not in self.export_jobs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Export job not found"
            )
        
        job = self.export_jobs[job_id]
        
        if job["status"] != ExportStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Export not completed. Status: {job['status']}"
            )
        
        file_path = Path(job["file_path"])
        
        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Export file not found"
            )
        
        async def generate_file():
            async with aiofiles.open(file_path, 'rb') as f:
                while True:
                    chunk = await f.read(8192)
                    if not chunk:
                        break
                    yield chunk
        
        media_type = "application/octet-stream"
        filename = file_path.name
        
        return StreamingResponse(
            generate_file(),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

# Global exporter instance
data_exporter = None

def get_data_exporter(session: AsyncSession) -> DataExporter:
    """Get or create data exporter instance"""
    global data_exporter
    if data_exporter is None:
        data_exporter = DataExporter(session)
    return data_exporter