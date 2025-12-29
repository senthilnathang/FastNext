"""
Storage service for file uploads.
Supports local filesystem and S3-compatible storage backends.
"""

import hashlib
import mimetypes
import os
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from pathlib import Path
from typing import BinaryIO, Dict, Optional, Tuple, List

from app.core.config import settings


class StorageBackend(ABC):
    """Abstract base class for storage backends"""

    @abstractmethod
    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        path: str = "",
        content_type: Optional[str] = None,
    ) -> Dict:
        """Upload a file and return metadata"""
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete a file by key"""
        pass

    @abstractmethod
    async def get_url(self, key: str, expires_in: int = 3600) -> str:
        """Get URL for a file (presigned for S3)"""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if a file exists"""
        pass


class LocalStorageBackend(StorageBackend):
    """Local filesystem storage backend"""

    def __init__(self, base_path: str, url_prefix: str):
        self.base_path = Path(base_path).resolve()
        self.url_prefix = url_prefix.rstrip("/")
        # Ensure base directory exists
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        path: str = "",
        content_type: Optional[str] = None,
    ) -> Dict:
        """Upload file to local filesystem"""
        # Generate unique filename to avoid collisions
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"

        # Create directory structure based on date
        date_path = datetime.utcnow().strftime("%Y/%m/%d")
        full_path = self.base_path / path / date_path
        full_path.mkdir(parents=True, exist_ok=True)

        # Build storage key
        storage_key = f"{path}/{date_path}/{unique_name}".lstrip("/")
        file_path = full_path / unique_name

        # Read content and calculate hash
        content = file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        # Write file
        with open(file_path, "wb") as f:
            f.write(content)

        # Determine content type
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            content_type = content_type or "application/octet-stream"

        return {
            "storage_key": storage_key,
            "storage_backend": "local",
            "filename": unique_name,
            "original_filename": filename,
            "mime_type": content_type,
            "size": file_size,
            "hash": file_hash,
            "url": f"{self.url_prefix}/{storage_key}",
        }

    async def delete(self, key: str) -> bool:
        """Delete file from local filesystem"""
        file_path = self.base_path / key
        if file_path.exists():
            file_path.unlink()
            return True
        return False

    async def get_url(self, key: str, expires_in: int = 3600) -> str:
        """Get URL for local file (no expiry for local)"""
        return f"{self.url_prefix}/{key}"

    async def exists(self, key: str) -> bool:
        """Check if file exists locally"""
        return (self.base_path / key).exists()


class S3StorageBackend(StorageBackend):
    """S3-compatible storage backend"""

    def __init__(
        self,
        bucket: str,
        region: str,
        access_key: str,
        secret_key: str,
        endpoint_url: Optional[str] = None,
    ):
        self.bucket = bucket
        self.region = region
        self.endpoint_url = endpoint_url
        self._client = None
        self._access_key = access_key
        self._secret_key = secret_key

    @property
    def client(self):
        """Lazy-load boto3 client"""
        if self._client is None:
            import boto3

            self._client = boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=self._access_key,
                aws_secret_access_key=self._secret_key,
                endpoint_url=self.endpoint_url,
            )
        return self._client

    async def upload(
        self,
        file: BinaryIO,
        filename: str,
        path: str = "",
        content_type: Optional[str] = None,
    ) -> Dict:
        """Upload file to S3"""
        # Generate unique filename
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"

        # Create key with date-based path
        date_path = datetime.utcnow().strftime("%Y/%m/%d")
        storage_key = f"{path}/{date_path}/{unique_name}".lstrip("/")

        # Read content and calculate hash
        content = file.read()
        file_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        # Determine content type
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            content_type = content_type or "application/octet-stream"

        # Upload to S3
        self.client.put_object(
            Bucket=self.bucket,
            Key=storage_key,
            Body=content,
            ContentType=content_type,
            Metadata={
                "original-filename": filename,
                "hash": file_hash,
            },
        )

        return {
            "storage_key": storage_key,
            "storage_backend": "s3",
            "filename": unique_name,
            "original_filename": filename,
            "mime_type": content_type,
            "size": file_size,
            "hash": file_hash,
            "url": await self.get_url(storage_key),
        }

    async def delete(self, key: str) -> bool:
        """Delete file from S3"""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False

    async def get_url(self, key: str, expires_in: int = 3600) -> str:
        """Get presigned URL for S3 object"""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    async def exists(self, key: str) -> bool:
        """Check if object exists in S3"""
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False


class StorageService:
    """
    Main storage service that handles file uploads.
    Automatically selects backend based on configuration.
    """

    def __init__(self):
        self._backend: Optional[StorageBackend] = None

    @property
    def backend(self) -> StorageBackend:
        """Get storage backend based on configuration"""
        if self._backend is None:
            storage_backend = getattr(settings, 'STORAGE_BACKEND', 'local')
            if storage_backend == "s3":
                s3_bucket = getattr(settings, 'S3_BUCKET', None)
                if not s3_bucket:
                    raise ValueError("S3_BUCKET must be set when using S3 backend")
                self._backend = S3StorageBackend(
                    bucket=s3_bucket,
                    region=getattr(settings, 'S3_REGION', 'us-east-1'),
                    access_key=getattr(settings, 'S3_ACCESS_KEY', '') or "",
                    secret_key=getattr(settings, 'S3_SECRET_KEY', '') or "",
                    endpoint_url=getattr(settings, 'S3_ENDPOINT_URL', None),
                )
            else:
                self._backend = LocalStorageBackend(
                    base_path=getattr(settings, 'STORAGE_LOCAL_PATH', './uploads'),
                    url_prefix=getattr(settings, 'STORAGE_URL_PREFIX', '/uploads'),
                )
        return self._backend

    def validate_file(
        self,
        file: BinaryIO,
        filename: str,
        allowed_types: Optional[List[str]] = None,
        max_size: Optional[int] = None,
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate file before upload.
        Returns (is_valid, error_message)
        """
        # Check file size
        file.seek(0, 2)  # Seek to end
        size = file.tell()
        file.seek(0)  # Reset position

        attachment_max_size = getattr(settings, 'ATTACHMENT_MAX_SIZE', 10 * 1024 * 1024)
        max_size = max_size or attachment_max_size
        if size > max_size:
            return False, f"File size ({size} bytes) exceeds maximum allowed ({max_size} bytes)"

        # Check content type
        content_type, _ = mimetypes.guess_type(filename)
        allowed_attachment_types = getattr(settings, 'allowed_attachment_types', None)
        allowed_types = allowed_types or allowed_attachment_types

        if content_type and allowed_types and content_type not in allowed_types:
            return False, f"File type '{content_type}' is not allowed"

        return True, None

    async def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        path: str = "attachments",
        content_type: Optional[str] = None,
        validate: bool = True,
        allowed_types: Optional[List[str]] = None,
        max_size: Optional[int] = None,
    ) -> Dict:
        """
        Upload a file to storage.

        Args:
            file: File-like object
            filename: Original filename
            path: Storage path prefix
            content_type: MIME type (auto-detected if not provided)
            validate: Whether to validate file before upload
            allowed_types: Allowed MIME types (uses config default if not provided)
            max_size: Maximum file size (uses config default if not provided)

        Returns:
            Dict with storage metadata
        """
        if validate:
            is_valid, error = self.validate_file(file, filename, allowed_types, max_size)
            if not is_valid:
                raise ValueError(error)

        return await self.backend.upload(file, filename, path, content_type)

    async def delete_file(self, key: str) -> bool:
        """Delete a file from storage"""
        return await self.backend.delete(key)

    async def get_file_url(self, key: str, expires_in: int = 3600) -> str:
        """Get URL for a file"""
        return await self.backend.get_url(key, expires_in)

    async def file_exists(self, key: str) -> bool:
        """Check if a file exists"""
        return await self.backend.exists(key)

    def get_thumbnail_key(self, key: str) -> str:
        """Generate thumbnail key from original key"""
        path = Path(key)
        return f"{path.parent}/thumbs/{path.stem}_thumb{path.suffix}"


# Singleton instance
storage_service = StorageService()
