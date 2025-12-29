"""
Remote Module Service

Handles module integration when components are distributed across servers:
- Backend Server: FastAPI application
- Frontend Server: Vue.js application
- Module Server: Remote addon storage (NFS, S3, Git, Registry)

Supports multiple remote module sources:
1. Network File System (NFS/SMB)
2. Object Storage (S3, MinIO, GCS)
3. Git Repositories
4. Module Registry API
"""

import os
import json
import shutil
import tempfile
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum
import logging

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class RemoteSourceType(str, Enum):
    """Types of remote module sources."""
    NFS = "nfs"  # Network mounted path
    S3 = "s3"  # S3-compatible storage
    GIT = "git"  # Git repository
    REGISTRY = "registry"  # HTTP module registry
    RSYNC = "rsync"  # Rsync over SSH


class ModuleSyncStatus(str, Enum):
    """Module sync status."""
    PENDING = "pending"
    SYNCING = "syncing"
    SYNCED = "synced"
    FAILED = "failed"
    OUTDATED = "outdated"


class RemoteModuleService:
    """
    Service for managing modules across distributed servers.

    Architecture:
    ```
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │  Frontend       │     │  Backend        │     │  Module Server  │
    │  (Vue.js)       │────▶│  (FastAPI)      │────▶│  (Addons)       │
    │  Server A       │     │  Server B       │     │  Server C       │
    └─────────────────┘     └─────────────────┘     └─────────────────┘
           │                       │                       │
           │                       ▼                       │
           │               ┌───────────────┐               │
           │               │ Local Module  │◀──────────────┘
           │               │ Cache         │   (Sync)
           │               └───────────────┘
           │                       │
           └───────────────────────┘
                   (Static Assets)
    ```

    Example:
        service = RemoteModuleService(db)

        # Configure remote source
        service.add_remote_source(
            name="corporate_addons",
            source_type="s3",
            config={
                "bucket": "company-modules",
                "prefix": "addons/",
                "endpoint": "https://s3.company.com"
            }
        )

        # Sync modules
        service.sync_all_modules()
    """

    def __init__(
        self,
        db: Session,
        local_cache_dir: Optional[Path] = None,
    ):
        self.db = db
        self.local_cache_dir = local_cache_dir or Path("modules/.remote_cache")
        self.local_cache_dir.mkdir(parents=True, exist_ok=True)
        self._remote_sources: Dict[str, Dict[str, Any]] = {}

    # -------------------------------------------------------------------------
    # Remote Source Configuration
    # -------------------------------------------------------------------------

    def add_remote_source(
        self,
        name: str,
        source_type: str,
        config: Dict[str, Any],
        priority: int = 10,
    ) -> None:
        """
        Add a remote module source.

        Args:
            name: Unique source name
            source_type: Type of source (nfs, s3, git, registry)
            config: Source-specific configuration
            priority: Lower = higher priority for conflicts

        Config examples:
            NFS:
                {"mount_path": "/mnt/modules", "server": "nfs.company.com"}

            S3:
                {
                    "bucket": "modules",
                    "prefix": "addons/",
                    "endpoint": "https://s3.amazonaws.com",
                    "access_key": "...",
                    "secret_key": "..."
                }

            Git:
                {
                    "repo_url": "https://github.com/company/modules.git",
                    "branch": "main",
                    "ssh_key_path": "/path/to/key"
                }

            Registry:
                {
                    "url": "https://modules.company.com/api",
                    "api_key": "..."
                }
        """
        self._remote_sources[name] = {
            "type": source_type,
            "config": config,
            "priority": priority,
        }

    def remove_remote_source(self, name: str) -> bool:
        """Remove a remote source."""
        if name in self._remote_sources:
            del self._remote_sources[name]
            return True
        return False

    def list_remote_sources(self) -> List[Dict[str, Any]]:
        """List all configured remote sources."""
        return [
            {"name": name, **info}
            for name, info in self._remote_sources.items()
        ]

    # -------------------------------------------------------------------------
    # Module Discovery (Remote)
    # -------------------------------------------------------------------------

    def discover_remote_modules(
        self,
        source_name: Optional[str] = None,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Discover modules from remote sources.

        Args:
            source_name: Specific source to check, or all if None

        Returns:
            Dict of module_name -> {source, version, path, manifest}
        """
        modules = {}
        sources = (
            {source_name: self._remote_sources[source_name]}
            if source_name
            else self._remote_sources
        )

        for name, source_info in sources.items():
            source_type = source_info["type"]

            try:
                if source_type == RemoteSourceType.NFS.value:
                    found = self._discover_nfs_modules(source_info["config"])
                elif source_type == RemoteSourceType.S3.value:
                    found = self._discover_s3_modules(source_info["config"])
                elif source_type == RemoteSourceType.GIT.value:
                    found = self._discover_git_modules(source_info["config"])
                elif source_type == RemoteSourceType.REGISTRY.value:
                    found = self._discover_registry_modules(source_info["config"])
                else:
                    logger.warning(f"Unknown source type: {source_type}")
                    continue

                for module_name, module_info in found.items():
                    module_info["source"] = name
                    module_info["source_type"] = source_type

                    # Handle priority for conflicts
                    if module_name not in modules:
                        modules[module_name] = module_info
                    elif source_info["priority"] < modules[module_name].get("priority", 99):
                        modules[module_name] = module_info

            except Exception as e:
                logger.error(f"Error discovering from {name}: {e}")

        return modules

    def _discover_nfs_modules(self, config: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Discover modules from NFS mount."""
        mount_path = Path(config["mount_path"])
        modules = {}

        if not mount_path.exists():
            raise ValueError(f"NFS mount not available: {mount_path}")

        for item in mount_path.iterdir():
            if item.is_dir():
                manifest_path = item / "__manifest__.py"
                init_path = item / "__init__.py"

                if manifest_path.exists() and init_path.exists():
                    manifest = self._load_manifest(manifest_path)
                    modules[item.name] = {
                        "path": str(item),
                        "version": manifest.get("version", "0.0.0"),
                        "manifest": manifest,
                    }

        return modules

    def _discover_s3_modules(self, config: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Discover modules from S3-compatible storage."""
        try:
            import boto3
        except ImportError:
            raise ImportError("boto3 required for S3 support: pip install boto3")

        s3 = boto3.client(
            "s3",
            endpoint_url=config.get("endpoint"),
            aws_access_key_id=config.get("access_key"),
            aws_secret_access_key=config.get("secret_key"),
        )

        bucket = config["bucket"]
        prefix = config.get("prefix", "")
        modules = {}

        # List module directories
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix, Delimiter="/"):
            for common_prefix in page.get("CommonPrefixes", []):
                module_prefix = common_prefix["Prefix"]
                module_name = module_prefix.rstrip("/").split("/")[-1]

                # Check for manifest
                manifest_key = f"{module_prefix}__manifest__.py"
                try:
                    response = s3.get_object(Bucket=bucket, Key=manifest_key)
                    manifest_content = response["Body"].read().decode("utf-8")
                    manifest = self._parse_manifest_content(manifest_content)

                    modules[module_name] = {
                        "path": f"s3://{bucket}/{module_prefix}",
                        "version": manifest.get("version", "0.0.0"),
                        "manifest": manifest,
                    }
                except s3.exceptions.NoSuchKey:
                    continue

        return modules

    def _discover_git_modules(self, config: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Discover modules from Git repository."""
        import subprocess

        repo_url = config["repo_url"]
        branch = config.get("branch", "main")
        modules = {}

        # Clone to temp directory
        with tempfile.TemporaryDirectory() as temp_dir:
            cmd = ["git", "clone", "--depth", "1", "-b", branch, repo_url, temp_dir]
            subprocess.run(cmd, check=True, capture_output=True)

            repo_path = Path(temp_dir)
            for item in repo_path.iterdir():
                if item.is_dir() and not item.name.startswith("."):
                    manifest_path = item / "__manifest__.py"
                    if manifest_path.exists():
                        manifest = self._load_manifest(manifest_path)
                        modules[item.name] = {
                            "path": f"git:{repo_url}#{branch}/{item.name}",
                            "version": manifest.get("version", "0.0.0"),
                            "manifest": manifest,
                        }

        return modules

    def _discover_registry_modules(self, config: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Discover modules from HTTP registry API."""
        import httpx

        url = config["url"].rstrip("/")
        api_key = config.get("api_key")
        modules = {}

        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        response = httpx.get(f"{url}/modules", headers=headers, timeout=30)
        response.raise_for_status()

        for module in response.json().get("modules", []):
            modules[module["name"]] = {
                "path": f"registry:{url}/modules/{module['name']}",
                "version": module.get("version", "0.0.0"),
                "manifest": module.get("manifest", {}),
            }

        return modules

    # -------------------------------------------------------------------------
    # Module Synchronization
    # -------------------------------------------------------------------------

    def sync_module(
        self,
        module_name: str,
        source_name: Optional[str] = None,
        force: bool = False,
    ) -> Dict[str, Any]:
        """
        Sync a single module from remote to local cache.

        Args:
            module_name: Module to sync
            source_name: Specific source, or auto-detect
            force: Force re-sync even if up-to-date

        Returns:
            Sync result with status and details
        """
        # Find module in remote sources
        remote_modules = self.discover_remote_modules(source_name)

        if module_name not in remote_modules:
            return {
                "status": ModuleSyncStatus.FAILED.value,
                "error": f"Module {module_name} not found in remote sources",
            }

        module_info = remote_modules[module_name]
        source_type = module_info["source_type"]
        remote_version = module_info["version"]

        # Check local version
        local_path = self.local_cache_dir / module_name
        local_manifest_path = local_path / "__manifest__.py"

        if local_path.exists() and not force:
            if local_manifest_path.exists():
                local_manifest = self._load_manifest(local_manifest_path)
                local_version = local_manifest.get("version", "0.0.0")

                if local_version == remote_version:
                    return {
                        "status": ModuleSyncStatus.SYNCED.value,
                        "message": "Already up-to-date",
                        "version": local_version,
                    }

        # Sync based on source type
        try:
            if source_type == RemoteSourceType.NFS.value:
                self._sync_from_nfs(module_info, local_path)
            elif source_type == RemoteSourceType.S3.value:
                self._sync_from_s3(module_info, local_path)
            elif source_type == RemoteSourceType.GIT.value:
                self._sync_from_git(module_info, local_path)
            elif source_type == RemoteSourceType.REGISTRY.value:
                self._sync_from_registry(module_info, local_path)

            return {
                "status": ModuleSyncStatus.SYNCED.value,
                "message": "Successfully synced",
                "version": remote_version,
                "path": str(local_path),
            }

        except Exception as e:
            logger.error(f"Sync failed for {module_name}: {e}")
            return {
                "status": ModuleSyncStatus.FAILED.value,
                "error": str(e),
            }

    def sync_all_modules(self, force: bool = False) -> Dict[str, Dict[str, Any]]:
        """Sync all remote modules to local cache."""
        remote_modules = self.discover_remote_modules()
        results = {}

        for module_name in remote_modules:
            results[module_name] = self.sync_module(module_name, force=force)

        return results

    def _sync_from_nfs(self, module_info: Dict, local_path: Path) -> None:
        """Sync module from NFS mount."""
        remote_path = Path(module_info["path"])

        if local_path.exists():
            shutil.rmtree(local_path)

        shutil.copytree(remote_path, local_path)

    def _sync_from_s3(self, module_info: Dict, local_path: Path) -> None:
        """Sync module from S3."""
        import boto3

        # Parse S3 path
        s3_path = module_info["path"]  # s3://bucket/prefix/
        parts = s3_path.replace("s3://", "").split("/", 1)
        bucket = parts[0]
        prefix = parts[1] if len(parts) > 1 else ""

        # Get config from source
        source_name = module_info["source"]
        config = self._remote_sources[source_name]["config"]

        s3 = boto3.client(
            "s3",
            endpoint_url=config.get("endpoint"),
            aws_access_key_id=config.get("access_key"),
            aws_secret_access_key=config.get("secret_key"),
        )

        # Clear local path
        if local_path.exists():
            shutil.rmtree(local_path)
        local_path.mkdir(parents=True)

        # Download all files
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                relative_path = key[len(prefix):]
                local_file = local_path / relative_path

                local_file.parent.mkdir(parents=True, exist_ok=True)
                s3.download_file(bucket, key, str(local_file))

    def _sync_from_git(self, module_info: Dict, local_path: Path) -> None:
        """Sync module from Git repository."""
        import subprocess

        # Parse git path: git:url#branch/module
        git_path = module_info["path"]
        _, rest = git_path.split(":", 1)
        url, path_part = rest.split("#", 1)
        branch, module_subpath = path_part.split("/", 1)

        source_name = module_info["source"]
        config = self._remote_sources[source_name]["config"]

        # Clone to temp and copy module
        with tempfile.TemporaryDirectory() as temp_dir:
            cmd = ["git", "clone", "--depth", "1", "-b", branch, url, temp_dir]

            env = os.environ.copy()
            if config.get("ssh_key_path"):
                env["GIT_SSH_COMMAND"] = f"ssh -i {config['ssh_key_path']}"

            subprocess.run(cmd, check=True, capture_output=True, env=env)

            source_path = Path(temp_dir) / module_subpath

            if local_path.exists():
                shutil.rmtree(local_path)

            shutil.copytree(source_path, local_path)

    def _sync_from_registry(self, module_info: Dict, local_path: Path) -> None:
        """Sync module from HTTP registry."""
        import httpx

        # Parse registry path
        registry_path = module_info["path"]  # registry:url/modules/name
        _, url = registry_path.split(":", 1)

        source_name = module_info["source"]
        config = self._remote_sources[source_name]["config"]

        headers = {}
        if config.get("api_key"):
            headers["Authorization"] = f"Bearer {config['api_key']}"

        # Download module as zip
        response = httpx.get(
            f"{url}/download",
            headers=headers,
            timeout=120,
            follow_redirects=True,
        )
        response.raise_for_status()

        # Extract to local path
        import zipfile
        import io

        if local_path.exists():
            shutil.rmtree(local_path)
        local_path.mkdir(parents=True)

        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            zf.extractall(local_path)

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    def _load_manifest(self, path: Path) -> Dict[str, Any]:
        """Load manifest from file."""
        import ast

        content = path.read_text()
        return self._parse_manifest_content(content)

    def _parse_manifest_content(self, content: str) -> Dict[str, Any]:
        """Parse manifest content safely."""
        import ast

        try:
            return ast.literal_eval(content)
        except (ValueError, SyntaxError):
            return {}

    def get_local_module_path(self, module_name: str) -> Optional[Path]:
        """Get path to locally cached module."""
        local_path = self.local_cache_dir / module_name
        if local_path.exists():
            return local_path
        return None

    def get_sync_status(self, module_name: str) -> Dict[str, Any]:
        """Get sync status for a module."""
        local_path = self.local_cache_dir / module_name
        remote_modules = self.discover_remote_modules()

        if module_name not in remote_modules:
            return {"status": "not_found", "message": "Module not in any remote source"}

        remote_info = remote_modules[module_name]
        remote_version = remote_info["version"]

        if not local_path.exists():
            return {
                "status": ModuleSyncStatus.PENDING.value,
                "remote_version": remote_version,
            }

        local_manifest = self._load_manifest(local_path / "__manifest__.py")
        local_version = local_manifest.get("version", "0.0.0")

        if local_version == remote_version:
            return {
                "status": ModuleSyncStatus.SYNCED.value,
                "version": local_version,
            }
        else:
            return {
                "status": ModuleSyncStatus.OUTDATED.value,
                "local_version": local_version,
                "remote_version": remote_version,
            }


# -------------------------------------------------------------------------
# Integration with ModuleLoader
# -------------------------------------------------------------------------


class DistributedModuleLoader:
    """
    Extended ModuleLoader that supports remote modules.

    Usage:
        loader = DistributedModuleLoader(
            local_paths=settings.all_addon_paths,
            remote_service=remote_module_service,
        )

        # Sync remote modules first
        loader.sync_remote_modules()

        # Now discover includes both local and synced remote modules
        modules = loader.discover_modules()
    """

    def __init__(
        self,
        local_paths: List[Path],
        remote_service: Optional[RemoteModuleService] = None,
    ):
        from app.core.modules.loader import ModuleLoader

        self.local_loader = ModuleLoader(local_paths)
        self.remote_service = remote_service

    def sync_remote_modules(self, force: bool = False) -> Dict[str, Any]:
        """Sync all remote modules."""
        if not self.remote_service:
            return {"status": "no_remote_service"}

        return self.remote_service.sync_all_modules(force=force)

    def discover_modules(self, force: bool = False) -> List[str]:
        """Discover all modules (local + remote cached)."""
        modules = set(self.local_loader.discover_modules(force=force))

        if self.remote_service:
            # Add synced remote modules
            cache_dir = self.remote_service.local_cache_dir
            if cache_dir.exists():
                for item in cache_dir.iterdir():
                    if item.is_dir() and (item / "__manifest__.py").exists():
                        modules.add(item.name)

        return sorted(modules)

    def get_module_path(self, name: str) -> Optional[Path]:
        """Get module path (local or cached)."""
        # Try local first
        path = self.local_loader.get_module_path(name)
        if path:
            return path

        # Try remote cache
        if self.remote_service:
            return self.remote_service.get_local_module_path(name)

        return None


def get_remote_module_service(db: Session) -> RemoteModuleService:
    """Get remote module service instance."""
    return RemoteModuleService(db)
