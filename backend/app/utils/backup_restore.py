import asyncio
import gzip
import hashlib
import json
import logging
import os
import shutil
import subprocess
import tarfile
import tempfile
import zipfile
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional, Union

import aiofiles
import boto3
import yaml
from app.core.config import settings
from app.core.logging import get_logger
from app.models.base import Base
from botocore.exceptions import ClientError
from fastapi import BackgroundTasks, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import MetaData, Table, inspect, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

logger = get_logger(__name__)


class BackupFormat(str, Enum):
    """Supported backup formats"""

    SQL_DUMP = "sql_dump"
    JSON = "json"
    COMPRESSED_JSON = "compressed_json"
    BINARY = "binary"
    INCREMENTAL = "incremental"


class BackupStatus(str, Enum):
    """Backup job status"""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StorageBackend(str, Enum):
    """Storage backend options"""

    LOCAL = "local"
    S3 = "s3"
    AZURE = "azure"
    GCS = "gcs"


class BackupManager:
    """Comprehensive database backup and restore system"""

    def __init__(self, session: AsyncSession, engine: Engine):
        self.session = session
        self.engine = engine
        self.backup_jobs: Dict[str, Dict[str, Any]] = {}
        self.restore_jobs: Dict[str, Dict[str, Any]] = {}

        # Configuration
        self.backup_dir = Path(getattr(settings, "BACKUP_DIR", "/tmp/backups"))
        self.backup_dir.mkdir(exist_ok=True)

        self.max_backup_age_days = getattr(settings, "MAX_BACKUP_AGE_DAYS", 30)
        self.compression_enabled = getattr(settings, "BACKUP_COMPRESSION", True)
        self.encryption_enabled = getattr(settings, "BACKUP_ENCRYPTION", False)
        self.storage_backend = getattr(
            settings, "BACKUP_STORAGE_BACKEND", StorageBackend.LOCAL
        )

        # Initialize storage backend
        self._init_storage_backend()

    def _init_storage_backend(self):
        """Initialize storage backend client"""

        if self.storage_backend == StorageBackend.S3:
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", None),
                aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", None),
                region_name=getattr(settings, "AWS_REGION", "us-east-1"),
            )
            self.s3_bucket = getattr(settings, "BACKUP_S3_BUCKET", None)

        # Add other storage backends as needed

    async def create_backup(
        self,
        backup_format: BackupFormat = BackupFormat.SQL_DUMP,
        tables: Optional[List[str]] = None,
        incremental: bool = False,
        compression: bool = True,
        encryption: bool = False,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> Union[StreamingResponse, Dict[str, str]]:
        """Create database backup"""

        try:
            # Generate backup metadata
            backup_id = self._generate_backup_id()
            backup_metadata = {
                "backup_id": backup_id,
                "format": backup_format,
                "tables": tables or "all",
                "incremental": incremental,
                "compression": compression,
                "encryption": encryption,
                "created_at": datetime.utcnow(),
                "database_version": await self._get_database_version(),
                "schema_version": await self._get_schema_version(),
            }

            # Estimate backup size
            estimated_size = await self._estimate_backup_size(tables)

            # Large backup - run in background
            if (
                estimated_size > 100 * 1024 * 1024 or background_tasks
            ):  # 100MB threshold
                if background_tasks is None:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Backup too large. Use background backup.",
                    )

                job_id = await self._start_background_backup(
                    backup_metadata, background_tasks
                )

                return {
                    "job_id": job_id,
                    "backup_id": backup_id,
                    "status": "started",
                    "estimated_size": estimated_size,
                }

            # Small backup - stream directly
            return await self._stream_backup(backup_metadata)

        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Backup failed: {str(e)}",
            )

    async def restore_backup(
        self,
        backup_file: UploadFile,
        restore_strategy: str = "replace",
        tables: Optional[List[str]] = None,
        verify_integrity: bool = True,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> Union[Dict[str, str], Dict[str, Any]]:
        """Restore database from backup"""

        try:
            # Validate backup file
            if not backup_file.filename:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No backup file provided",
                )

            # Save uploaded file
            temp_path = await self._save_uploaded_file(backup_file)

            try:
                # Verify backup integrity
                if verify_integrity:
                    backup_metadata = await self._verify_backup_integrity(temp_path)
                else:
                    backup_metadata = await self._extract_backup_metadata(temp_path)

                # Check compatibility
                compatibility_issues = await self._check_restore_compatibility(
                    backup_metadata
                )
                if compatibility_issues:
                    return {
                        "status": "compatibility_issues",
                        "issues": compatibility_issues,
                        "can_proceed": False,
                    }

                # Large restore - run in background
                file_size = temp_path.stat().st_size
                if file_size > 50 * 1024 * 1024 or background_tasks:  # 50MB threshold
                    if background_tasks is None:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="Restore too large. Use background restore.",
                        )

                    job_id = await self._start_background_restore(
                        temp_path,
                        backup_metadata,
                        restore_strategy,
                        tables,
                        background_tasks,
                    )

                    return {
                        "job_id": job_id,
                        "status": "started",
                        "backup_metadata": backup_metadata,
                    }

                # Small restore - execute directly
                return await self._execute_restore(
                    temp_path, backup_metadata, restore_strategy, tables
                )

            finally:
                # Cleanup temp file
                if temp_path.exists():
                    temp_path.unlink()

        except Exception as e:
            logger.error(f"Restore failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Restore failed: {str(e)}",
            )

    async def list_backups(
        self,
        limit: int = 50,
        offset: int = 0,
        format_filter: Optional[BackupFormat] = None,
    ) -> Dict[str, Any]:
        """List available backups"""

        try:
            backups = []

            if self.storage_backend == StorageBackend.LOCAL:
                backups = await self._list_local_backups(limit, offset, format_filter)
            elif self.storage_backend == StorageBackend.S3:
                backups = await self._list_s3_backups(limit, offset, format_filter)

            # Add metadata and statistics
            for backup in backups:
                backup["age_days"] = (datetime.utcnow() - backup["created_at"]).days
                backup["size_mb"] = backup.get("size", 0) / (1024 * 1024)

            return {
                "backups": backups,
                "total": len(backups),
                "limit": limit,
                "offset": offset,
            }

        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list backups: {str(e)}",
            )

    async def delete_backup(self, backup_id: str) -> Dict[str, str]:
        """Delete a backup"""

        try:
            if self.storage_backend == StorageBackend.LOCAL:
                success = await self._delete_local_backup(backup_id)
            elif self.storage_backend == StorageBackend.S3:
                success = await self._delete_s3_backup(backup_id)
            else:
                success = False

            if success:
                return {"status": "deleted", "backup_id": backup_id}
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Backup not found"
                )

        except Exception as e:
            logger.error(f"Failed to delete backup {backup_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete backup: {str(e)}",
            )

    async def cleanup_old_backups(self) -> Dict[str, Any]:
        """Clean up old backups based on retention policy"""

        try:
            cutoff_date = datetime.utcnow() - timedelta(days=self.max_backup_age_days)
            deleted_count = 0
            total_size_freed = 0

            backups = await self.list_backups(limit=1000)

            for backup in backups["backups"]:
                if backup["created_at"] < cutoff_date:
                    try:
                        await self.delete_backup(backup["backup_id"])
                        deleted_count += 1
                        total_size_freed += backup.get("size", 0)
                    except Exception as e:
                        logger.error(
                            f"Failed to delete old backup {backup['backup_id']}: {e}"
                        )

            return {
                "deleted_count": deleted_count,
                "total_size_freed_mb": total_size_freed / (1024 * 1024),
                "cutoff_date": cutoff_date.isoformat(),
            }

        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Backup cleanup failed: {str(e)}",
            )

    def _generate_backup_id(self) -> str:
        """Generate unique backup ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        random_suffix = hashlib.md5(
            str(datetime.utcnow().timestamp()).encode()
        ).hexdigest()[:8]
        return f"backup_{timestamp}_{random_suffix}"

    async def _get_database_version(self) -> str:
        """Get database version"""
        try:
            result = await self.session.execute(text("SELECT version()"))
            return result.scalar()
        except Exception:
            return "unknown"

    async def _get_schema_version(self) -> str:
        """Get application schema version"""
        try:
            # Try to get from alembic version table
            result = await self.session.execute(
                text("SELECT version_num FROM alembic_version LIMIT 1")
            )
            return result.scalar() or "unknown"
        except Exception:
            return "unknown"

    async def _estimate_backup_size(self, tables: Optional[List[str]] = None) -> int:
        """Estimate backup size in bytes"""

        try:
            if tables:
                # Estimate size for specific tables
                total_size = 0
                for table in tables:
                    size_query = f"""
                    SELECT pg_total_relation_size('{table}')::bigint as size
                    """
                    result = await self.session.execute(text(size_query))
                    table_size = result.scalar() or 0
                    total_size += table_size
                return total_size
            else:
                # Estimate size for entire database
                size_query = """
                SELECT pg_database_size(current_database())::bigint as size
                """
                result = await self.session.execute(text(size_query))
                return result.scalar() or 0

        except Exception as e:
            logger.warning(f"Could not estimate backup size: {e}")
            return 0

    async def _stream_backup(
        self, backup_metadata: Dict[str, Any]
    ) -> StreamingResponse:
        """Stream backup directly to client"""

        async def generate_backup():
            async for chunk in self._generate_backup_chunks(backup_metadata):
                yield chunk

        filename = f"{backup_metadata['backup_id']}.backup"

        if backup_metadata.get("compression", True):
            filename += ".gz"

        return StreamingResponse(
            generate_backup(),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    async def _generate_backup_chunks(
        self, backup_metadata: Dict[str, Any]
    ) -> AsyncGenerator[bytes, None]:
        """Generate backup data in chunks"""

        backup_format = backup_metadata["format"]

        if backup_format == BackupFormat.SQL_DUMP:
            async for chunk in self._generate_sql_dump_chunks(backup_metadata):
                yield chunk

        elif backup_format == BackupFormat.JSON:
            async for chunk in self._generate_json_backup_chunks(backup_metadata):
                yield chunk

        elif backup_format == BackupFormat.COMPRESSED_JSON:
            async for chunk in self._generate_compressed_json_chunks(backup_metadata):
                yield chunk

        else:
            raise ValueError(f"Unsupported backup format: {backup_format}")

    async def _generate_sql_dump_chunks(
        self, backup_metadata: Dict[str, Any]
    ) -> AsyncGenerator[bytes, None]:
        """Generate SQL dump chunks using pg_dump"""

        # Prepare pg_dump command
        dump_cmd = [
            "pg_dump",
            "--host",
            settings.POSTGRES_SERVER,
            "--port",
            str(settings.POSTGRES_PORT),
            "--username",
            settings.POSTGRES_USER,
            "--dbname",
            settings.POSTGRES_DB,
            "--no-password",
            "--verbose",
            "--create",
            "--clean",
            "--if-exists",
        ]

        # Add table selection if specified
        tables = backup_metadata.get("tables")
        if tables and tables != "all":
            for table in tables:
                dump_cmd.extend(["--table", table])

        # Set password via environment
        env = os.environ.copy()
        env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

        # Execute pg_dump
        process = await asyncio.create_subprocess_exec(
            *dump_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )

        # Stream output
        while True:
            chunk = await process.stdout.read(8192)
            if not chunk:
                break

            # Apply compression if enabled
            if backup_metadata.get("compression", True):
                chunk = gzip.compress(chunk)

            yield chunk

        # Wait for process completion
        await process.wait()

        if process.returncode != 0:
            stderr_output = await process.stderr.read()
            raise Exception(f"pg_dump failed: {stderr_output.decode()}")

    async def _generate_json_backup_chunks(
        self, backup_metadata: Dict[str, Any]
    ) -> AsyncGenerator[bytes, None]:
        """Generate JSON backup chunks"""

        # Start JSON structure
        backup_data = {
            "metadata": backup_metadata,
            "schema": await self._export_schema(),
            "data": {},
        }

        # Get table list
        tables = backup_metadata.get("tables")
        if tables == "all" or not tables:
            tables = await self._get_all_table_names()

        # Export each table
        for table_name in tables:
            table_data = []

            # Get table data
            query = f"SELECT * FROM {table_name}"
            result = await self.session.execute(text(query))

            # Convert rows to JSON-serializable format
            columns = result.keys()
            for row in result:
                row_dict = {}
                for i, value in enumerate(row):
                    column_name = columns[i]

                    if value is None:
                        row_dict[column_name] = None
                    elif isinstance(value, datetime):
                        row_dict[column_name] = value.isoformat()
                    else:
                        row_dict[column_name] = str(value)

                table_data.append(row_dict)

            backup_data["data"][table_name] = table_data

        # Convert to JSON and yield
        json_content = json.dumps(backup_data, indent=2, default=str)
        yield json_content.encode("utf-8")

    async def _generate_compressed_json_chunks(
        self, backup_metadata: Dict[str, Any]
    ) -> AsyncGenerator[bytes, None]:
        """Generate compressed JSON backup chunks"""

        # Generate JSON backup
        json_chunks = []
        async for chunk in self._generate_json_backup_chunks(backup_metadata):
            json_chunks.append(chunk)

        # Combine all chunks
        json_data = b"".join(json_chunks)

        # Compress and yield
        compressed_data = gzip.compress(json_data)

        # Yield in chunks
        chunk_size = 8192
        for i in range(0, len(compressed_data), chunk_size):
            yield compressed_data[i : i + chunk_size]

    async def _export_schema(self) -> Dict[str, Any]:
        """Export database schema information"""

        try:
            # Get table definitions
            inspector = inspect(self.engine)
            tables_schema = {}

            for table_name in inspector.get_table_names():
                columns = inspector.get_columns(table_name)
                indexes = inspector.get_indexes(table_name)
                foreign_keys = inspector.get_foreign_keys(table_name)

                tables_schema[table_name] = {
                    "columns": columns,
                    "indexes": indexes,
                    "foreign_keys": foreign_keys,
                }

            return {
                "tables": tables_schema,
                "version": await self._get_schema_version(),
            }

        except Exception as e:
            logger.error(f"Schema export failed: {e}")
            return {}

    async def _get_all_table_names(self) -> List[str]:
        """Get list of all table names"""

        query = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        """

        result = await self.session.execute(text(query))
        return [row[0] for row in result]

    async def _save_uploaded_file(self, upload_file: UploadFile) -> Path:
        """Save uploaded backup file to temporary location"""

        temp_dir = Path(tempfile.mkdtemp())
        temp_path = temp_dir / upload_file.filename

        async with aiofiles.open(temp_path, "wb") as f:
            while True:
                chunk = await upload_file.read(8192)
                if not chunk:
                    break
                await f.write(chunk)

        return temp_path

    async def _verify_backup_integrity(self, backup_path: Path) -> Dict[str, Any]:
        """Verify backup file integrity and extract metadata"""

        try:
            # Try to extract metadata from backup
            if backup_path.suffix == ".gz":
                # Compressed backup
                with gzip.open(backup_path, "rt") as f:
                    # Try to read first few lines to detect format
                    first_line = f.readline()

                    if first_line.startswith("--"):
                        # SQL dump format
                        return {
                            "format": BackupFormat.SQL_DUMP,
                            "compression": True,
                            "verified": True,
                        }
                    elif first_line.startswith("{"):
                        # JSON format
                        f.seek(0)
                        backup_data = json.load(f)
                        return backup_data.get(
                            "metadata",
                            {
                                "format": BackupFormat.JSON,
                                "compression": True,
                                "verified": True,
                            },
                        )
            else:
                # Uncompressed backup
                with open(backup_path, "r") as f:
                    first_line = f.readline()

                    if first_line.startswith("--"):
                        return {
                            "format": BackupFormat.SQL_DUMP,
                            "compression": False,
                            "verified": True,
                        }
                    elif first_line.startswith("{"):
                        f.seek(0)
                        backup_data = json.load(f)
                        return backup_data.get(
                            "metadata",
                            {
                                "format": BackupFormat.JSON,
                                "compression": False,
                                "verified": True,
                            },
                        )

            raise ValueError("Unknown backup format")

        except Exception as e:
            logger.error(f"Backup verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid backup file: {str(e)}",
            )

    async def _extract_backup_metadata(self, backup_path: Path) -> Dict[str, Any]:
        """Extract metadata from backup without full verification"""

        # Simplified metadata extraction
        return {
            "format": BackupFormat.SQL_DUMP,  # Default assumption
            "size": backup_path.stat().st_size,
            "created_at": datetime.fromtimestamp(backup_path.stat().st_mtime),
        }

    async def _check_restore_compatibility(
        self, backup_metadata: Dict[str, Any]
    ) -> List[str]:
        """Check if backup is compatible with current system"""

        issues = []

        # Check schema version compatibility
        backup_schema_version = backup_metadata.get("schema_version")
        current_schema_version = await self._get_schema_version()

        if backup_schema_version and backup_schema_version != current_schema_version:
            issues.append(
                f"Schema version mismatch: backup={backup_schema_version}, current={current_schema_version}"
            )

        # Check database version compatibility
        backup_db_version = backup_metadata.get("database_version", "")
        current_db_version = await self._get_database_version()

        if backup_db_version and not self._is_db_version_compatible(
            backup_db_version, current_db_version
        ):
            issues.append(
                f"Database version compatibility issue: backup={backup_db_version}, current={current_db_version}"
            )

        return issues

    def _is_db_version_compatible(
        self, backup_version: str, current_version: str
    ) -> bool:
        """Check if database versions are compatible"""

        # Extract major version numbers for PostgreSQL
        try:
            backup_major = int(backup_version.split(".")[0].split()[-1])
            current_major = int(current_version.split(".")[0].split()[-1])

            # Allow restore from same or lower major version
            return backup_major <= current_major

        except Exception:
            # If version parsing fails, assume compatible
            return True

    async def _start_background_backup(
        self, backup_metadata: Dict[str, Any], background_tasks: BackgroundTasks
    ) -> str:
        """Start background backup job"""

        import uuid

        job_id = str(uuid.uuid4())

        self.backup_jobs[job_id] = {
            "status": BackupStatus.PENDING,
            "created_at": datetime.utcnow(),
            "backup_metadata": backup_metadata,
            "progress": 0,
        }

        background_tasks.add_task(self._run_background_backup, job_id, backup_metadata)

        return job_id

    async def _start_background_restore(
        self,
        backup_path: Path,
        backup_metadata: Dict[str, Any],
        restore_strategy: str,
        tables: Optional[List[str]],
        background_tasks: BackgroundTasks,
    ) -> str:
        """Start background restore job"""

        import uuid

        job_id = str(uuid.uuid4())

        self.restore_jobs[job_id] = {
            "status": BackupStatus.PENDING,
            "created_at": datetime.utcnow(),
            "backup_metadata": backup_metadata,
            "restore_strategy": restore_strategy,
            "tables": tables,
            "progress": 0,
        }

        background_tasks.add_task(
            self._run_background_restore,
            job_id,
            backup_path,
            backup_metadata,
            restore_strategy,
            tables,
        )

        return job_id

    async def _run_background_backup(
        self, job_id: str, backup_metadata: Dict[str, Any]
    ):
        """Run background backup job"""

        try:
            self.backup_jobs[job_id]["status"] = BackupStatus.IN_PROGRESS

            # Create backup file
            backup_filename = f"{backup_metadata['backup_id']}.backup"
            if backup_metadata.get("compression", True):
                backup_filename += ".gz"

            backup_path = self.backup_dir / backup_filename

            # Generate backup
            async with aiofiles.open(backup_path, "wb") as f:
                async for chunk in self._generate_backup_chunks(backup_metadata):
                    await f.write(chunk)

            # Upload to storage backend if not local
            if self.storage_backend != StorageBackend.LOCAL:
                await self._upload_backup_to_storage(
                    backup_path, backup_metadata["backup_id"]
                )

            self.backup_jobs[job_id].update(
                {
                    "status": BackupStatus.COMPLETED,
                    "backup_path": str(backup_path),
                    "completed_at": datetime.utcnow(),
                    "progress": 100,
                    "size": backup_path.stat().st_size,
                }
            )

        except Exception as e:
            self.backup_jobs[job_id].update(
                {
                    "status": BackupStatus.FAILED,
                    "error": str(e),
                    "failed_at": datetime.utcnow(),
                }
            )
            logger.error(f"Background backup {job_id} failed: {e}")

    async def _run_background_restore(
        self,
        job_id: str,
        backup_path: Path,
        backup_metadata: Dict[str, Any],
        restore_strategy: str,
        tables: Optional[List[str]],
    ):
        """Run background restore job"""

        try:
            self.restore_jobs[job_id]["status"] = BackupStatus.IN_PROGRESS

            # Execute restore
            result = await self._execute_restore(
                backup_path, backup_metadata, restore_strategy, tables
            )

            self.restore_jobs[job_id].update(
                {
                    "status": BackupStatus.COMPLETED,
                    "completed_at": datetime.utcnow(),
                    "progress": 100,
                    "result": result,
                }
            )

        except Exception as e:
            self.restore_jobs[job_id].update(
                {
                    "status": BackupStatus.FAILED,
                    "error": str(e),
                    "failed_at": datetime.utcnow(),
                }
            )
            logger.error(f"Background restore {job_id} failed: {e}")

    async def _execute_restore(
        self,
        backup_path: Path,
        backup_metadata: Dict[str, Any],
        restore_strategy: str,
        tables: Optional[List[str]],
    ) -> Dict[str, Any]:
        """Execute database restore"""

        backup_format = backup_metadata.get("format", BackupFormat.SQL_DUMP)

        if backup_format == BackupFormat.SQL_DUMP:
            return await self._restore_from_sql_dump(
                backup_path, restore_strategy, tables
            )
        elif backup_format in [BackupFormat.JSON, BackupFormat.COMPRESSED_JSON]:
            return await self._restore_from_json(
                backup_path, backup_metadata, restore_strategy, tables
            )
        else:
            raise ValueError(f"Unsupported restore format: {backup_format}")

    async def _restore_from_sql_dump(
        self, backup_path: Path, restore_strategy: str, tables: Optional[List[str]]
    ) -> Dict[str, Any]:
        """Restore from SQL dump using pg_restore or psql"""

        # Prepare restore command
        if backup_path.suffix == ".gz":
            # Compressed dump - use zcat + psql
            restore_cmd = [
                "bash",
                "-c",
                f"zcat {backup_path} | psql -h {settings.POSTGRES_SERVER} -p {settings.POSTGRES_PORT} "
                f"-U {settings.POSTGRES_USER} -d {settings.POSTGRES_DB}",
            ]
        else:
            # Uncompressed dump - use psql directly
            restore_cmd = [
                "psql",
                "-h",
                settings.POSTGRES_SERVER,
                "-p",
                str(settings.POSTGRES_PORT),
                "-U",
                settings.POSTGRES_USER,
                "-d",
                settings.POSTGRES_DB,
                "-f",
                str(backup_path),
            ]

        # Set password via environment
        env = os.environ.copy()
        env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

        # Execute restore
        process = await asyncio.create_subprocess_exec(
            *restore_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            raise Exception(f"Restore failed: {error_msg}")

        return {
            "status": "completed",
            "strategy": restore_strategy,
            "stdout": stdout.decode(),
            "stderr": stderr.decode(),
        }

    async def _restore_from_json(
        self,
        backup_path: Path,
        backup_metadata: Dict[str, Any],
        restore_strategy: str,
        tables: Optional[List[str]],
    ) -> Dict[str, Any]:
        """Restore from JSON backup"""

        # Load backup data
        if backup_metadata.get("compression", False):
            with gzip.open(backup_path, "rt") as f:
                backup_data = json.load(f)
        else:
            with open(backup_path, "r") as f:
                backup_data = json.load(f)

        # Restore tables
        restored_tables = []

        for table_name, table_data in backup_data["data"].items():
            if tables and table_name not in tables:
                continue

            try:
                # Clear table if replace strategy
                if restore_strategy == "replace":
                    await self.session.execute(text(f"DELETE FROM {table_name}"))

                # Insert data
                for row in table_data:
                    columns = list(row.keys())
                    values = list(row.values())

                    placeholders = ", ".join([f":{col}" for col in columns])
                    insert_query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"

                    await self.session.execute(text(insert_query), row)

                await self.session.commit()
                restored_tables.append(table_name)

            except Exception as e:
                await self.session.rollback()
                logger.error(f"Failed to restore table {table_name}: {e}")
                raise

        return {
            "status": "completed",
            "strategy": restore_strategy,
            "restored_tables": restored_tables,
            "total_tables": len(restored_tables),
        }

    async def _list_local_backups(
        self, limit: int, offset: int, format_filter: Optional[BackupFormat]
    ) -> List[Dict[str, Any]]:
        """List backups from local storage"""

        backups = []

        for backup_file in self.backup_dir.glob("backup_*.backup*"):
            try:
                stat = backup_file.stat()

                backup_info = {
                    "backup_id": backup_file.stem.replace(".backup", ""),
                    "filename": backup_file.name,
                    "size": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime),
                    "format": self._detect_backup_format(backup_file),
                    "storage_backend": StorageBackend.LOCAL,
                }

                if format_filter and backup_info["format"] != format_filter:
                    continue

                backups.append(backup_info)

            except Exception as e:
                logger.warning(f"Failed to read backup info for {backup_file}: {e}")

        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x["created_at"], reverse=True)

        return backups[offset : offset + limit]

    async def _list_s3_backups(
        self, limit: int, offset: int, format_filter: Optional[BackupFormat]
    ) -> List[Dict[str, Any]]:
        """List backups from S3 storage"""

        if not self.s3_bucket:
            return []

        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.s3_bucket, Prefix="backups/", MaxKeys=limit + offset
            )

            backups = []

            for obj in response.get("Contents", []):
                backup_info = {
                    "backup_id": Path(obj["Key"]).stem.replace(".backup", ""),
                    "filename": Path(obj["Key"]).name,
                    "size": obj["Size"],
                    "created_at": obj["LastModified"],
                    "format": self._detect_backup_format_from_name(obj["Key"]),
                    "storage_backend": StorageBackend.S3,
                    "s3_key": obj["Key"],
                }

                if format_filter and backup_info["format"] != format_filter:
                    continue

                backups.append(backup_info)

            # Sort by creation time (newest first)
            backups.sort(key=lambda x: x["created_at"], reverse=True)

            return backups[offset : offset + limit]

        except ClientError as e:
            logger.error(f"Failed to list S3 backups: {e}")
            return []

    def _detect_backup_format(self, backup_path: Path) -> BackupFormat:
        """Detect backup format from file"""

        try:
            if backup_path.suffix == ".gz":
                # Compressed file
                with gzip.open(backup_path, "rt") as f:
                    first_line = f.readline()
            else:
                with open(backup_path, "r") as f:
                    first_line = f.readline()

            if first_line.startswith("--"):
                return BackupFormat.SQL_DUMP
            elif first_line.startswith("{"):
                return BackupFormat.JSON

        except Exception:
            pass

        return BackupFormat.SQL_DUMP  # Default

    def _detect_backup_format_from_name(self, filename: str) -> BackupFormat:
        """Detect backup format from filename"""

        if "json" in filename.lower():
            return BackupFormat.JSON
        else:
            return BackupFormat.SQL_DUMP

    async def _delete_local_backup(self, backup_id: str) -> bool:
        """Delete backup from local storage"""

        for backup_file in self.backup_dir.glob(f"{backup_id}.*"):
            try:
                backup_file.unlink()
                return True
            except Exception as e:
                logger.error(f"Failed to delete local backup {backup_file}: {e}")

        return False

    async def _delete_s3_backup(self, backup_id: str) -> bool:
        """Delete backup from S3 storage"""

        if not self.s3_bucket:
            return False

        try:
            # Find the backup key
            response = self.s3_client.list_objects_v2(
                Bucket=self.s3_bucket, Prefix=f"backups/{backup_id}"
            )

            for obj in response.get("Contents", []):
                self.s3_client.delete_object(Bucket=self.s3_bucket, Key=obj["Key"])

            return True

        except ClientError as e:
            logger.error(f"Failed to delete S3 backup {backup_id}: {e}")
            return False

    async def _upload_backup_to_storage(self, backup_path: Path, backup_id: str):
        """Upload backup to configured storage backend"""

        if self.storage_backend == StorageBackend.S3:
            await self._upload_to_s3(backup_path, backup_id)

    async def _upload_to_s3(self, backup_path: Path, backup_id: str):
        """Upload backup to S3"""

        if not self.s3_bucket:
            raise Exception("S3 bucket not configured")

        s3_key = f"backups/{backup_id}/{backup_path.name}"

        try:
            self.s3_client.upload_file(
                str(backup_path),
                self.s3_bucket,
                s3_key,
                ExtraArgs={
                    "Metadata": {
                        "backup_id": backup_id,
                        "created_at": datetime.utcnow().isoformat(),
                    }
                },
            )

        except ClientError as e:
            logger.error(f"Failed to upload backup to S3: {e}")
            raise

    async def get_backup_status(self, job_id: str) -> Dict[str, Any]:
        """Get status of backup job"""

        if job_id in self.backup_jobs:
            return self.backup_jobs[job_id]
        elif job_id in self.restore_jobs:
            return self.restore_jobs[job_id]
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
            )


# Global backup manager instance
backup_manager = None


def get_backup_manager(session: AsyncSession, engine: Engine) -> BackupManager:
    """Get or create backup manager instance"""
    global backup_manager
    if backup_manager is None:
        backup_manager = BackupManager(session, engine)
    return backup_manager
