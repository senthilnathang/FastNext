"""
Installed Module Model

Tracks module installation state in the database.
"""

import re
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel
from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.base import TimestampMixin

# Module name validation pattern
MODULE_NAME_PATTERN = re.compile(r'^[a-zA-Z][a-zA-Z0-9_]*$')


def serialize_manifest(manifest: Dict[str, Any]) -> Dict[str, Any]:
    """
    Serialize a manifest dict ensuring all Pydantic objects are converted to dicts.

    This is needed because parse_manifest may add Pydantic model instances
    (ExternalDeps, AssetConfig, etc.) which are not JSON serializable.
    """
    import json
    from enum import Enum

    def serialize_value(value: Any) -> Any:
        """Recursively serialize a value to be JSON compatible."""
        if value is None:
            return None
        elif isinstance(value, BaseModel):
            # Convert Pydantic model to dict
            return value.model_dump()
        elif isinstance(value, Enum):
            # Convert Enum to its value
            return value.value
        elif isinstance(value, dict):
            # Recursively serialize nested dicts
            return {k: serialize_value(v) for k, v in value.items()}
        elif isinstance(value, (list, tuple)):
            # Handle lists/tuples that may contain Pydantic models
            return [serialize_value(item) for item in value]
        elif isinstance(value, (str, int, float, bool)):
            # Primitive types are fine
            return value
        else:
            # For any other type, try to convert to string
            try:
                # First check if it's JSON serializable
                json.dumps(value)
                return value
            except (TypeError, ValueError):
                return str(value)

    return {key: serialize_value(value) for key, value in manifest.items()}


class InstalledModule(Base, TimestampMixin):
    """
    Tracks installed modules in the database.

    This model persists module state across server restarts and enables
    tracking of module versions, installation dates, and configuration.
    """

    __tablename__ = "installed_modules"
    __table_args__ = (
        # Composite indexes for common query patterns
        Index('ix_installed_modules_state_category', 'state', 'category'),
        Index('ix_installed_modules_category_application', 'category', 'application'),
        # Check constraint for valid state values
        CheckConstraint(
            "state IN ('installed', 'uninstalled', 'to_upgrade', 'to_remove')",
            name='ck_installed_modules_state'
        ),
        {"extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)

    # Module identification
    name = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="Technical module name (directory name)"
    )
    display_name = Column(
        String(200),
        nullable=False,
        comment="Human-readable module name"
    )
    version = Column(
        String(50),
        nullable=False,
        comment="Module version string"
    )

    # Module metadata
    summary = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    author = Column(String(200), nullable=True)
    website = Column(String(500), nullable=True)
    category = Column(String(100), default="Uncategorized", index=True)
    license = Column(String(50), default="MIT")

    # Module type
    application = Column(
        Boolean,
        default=False,
        comment="True if full application, False if technical module"
    )

    # Installation state
    state = Column(
        String(20),
        default="installed",
        nullable=False,
        index=True,
        comment="Module state: installed, to_upgrade, to_remove, uninstalled"
    )
    installed_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    uninstalled_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When module was last uninstalled"
    )

    # Dependencies
    depends = Column(
        JSONB,
        default=list,
        comment="List of module dependencies"
    )

    # Cached manifest for quick access
    manifest_cache = Column(
        JSONB,
        default=dict,
        comment="Full manifest cached as JSON"
    )

    # Path to module directory
    module_path = Column(
        String(500),
        nullable=True,
        comment="Filesystem path to module directory"
    )

    # Auto-install flag
    auto_install = Column(
        Boolean,
        default=False,
        comment="Auto-install when dependencies are met"
    )

    def __repr__(self) -> str:
        return f"<InstalledModule(name={self.name}, version={self.version}, state={self.state})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "display_name": self.display_name,
            "version": self.version,
            "summary": self.summary,
            "description": self.description,
            "author": self.author,
            "website": self.website,
            "category": self.category,
            "license": self.license,
            "application": self.application,
            "state": self.state,
            "installed_at": self.installed_at.isoformat() if self.installed_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "depends": self.depends or [],
            "module_path": self.module_path,
            "auto_install": self.auto_install,
        }

    @classmethod
    def from_manifest(
        cls,
        name: str,
        manifest: Dict[str, Any],
        path: Optional[str] = None
    ) -> "InstalledModule":
        """
        Create an InstalledModule instance from a manifest dictionary.

        Args:
            name: Technical module name
            manifest: Parsed manifest dictionary
            path: Optional filesystem path

        Returns:
            InstalledModule instance (not saved to DB)

        Raises:
            ValueError: If module name is invalid
        """
        # Validate module name
        if not name or not MODULE_NAME_PATTERN.match(name):
            raise ValueError(f"Invalid module name: {name}")

        # Sanitize and validate inputs
        display_name = str(manifest.get("name", name))[:200]
        version = str(manifest.get("version", "1.0.0"))[:50]
        summary = str(manifest.get("summary", ""))[:500] if manifest.get("summary") else None
        description = str(manifest.get("description", "")) if manifest.get("description") else None
        author = str(manifest.get("author", ""))[:200] if manifest.get("author") else None
        website = str(manifest.get("website", ""))[:500] if manifest.get("website") else None
        category = str(manifest.get("category", "Uncategorized"))[:100]
        license_str = str(manifest.get("license", "MIT"))[:50]

        return cls(
            name=name,
            display_name=display_name,
            version=version,
            summary=summary,
            description=description,
            author=author,
            website=website,
            category=category,
            license=license_str,
            application=bool(manifest.get("application", False)),
            state="installed",
            depends=manifest.get("depends", []),
            manifest_cache=serialize_manifest(manifest),
            module_path=path,
            auto_install=bool(manifest.get("auto_install", False)),
        )


class ModuleReloadSignal(Base):
    """
    Tracks module reload signals for frontend synchronization.

    When a module is installed, uninstalled, or upgraded, a signal is created
    to notify the frontend to reload module assets.
    """

    __tablename__ = "module_reload_signals"
    __table_args__ = (
        Index('ix_module_reload_signals_pending', 'acknowledged', 'created_at'),
        {"extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)
    module_name = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Module that triggered the reload"
    )
    action = Column(
        String(20),
        nullable=False,
        comment="Action: install, uninstall, upgrade"
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    acknowledged = Column(
        Boolean,
        default=False,
        comment="True when frontend has processed this signal"
    )
    acknowledged_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    def __repr__(self) -> str:
        return f"<ModuleReloadSignal(module={self.module_name}, action={self.action})>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "module_name": self.module_name,
            "action": self.action,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "acknowledged": self.acknowledged,
        }

    @classmethod
    def get_pending_signals(cls, db, limit: int = 50):
        """Get unacknowledged reload signals."""
        return db.query(cls).filter(
            cls.acknowledged == False
        ).order_by(cls.created_at.asc()).limit(limit).all()

    @classmethod
    def acknowledge_signals(cls, db, signal_ids: list) -> int:
        """Mark signals as acknowledged."""
        count = db.query(cls).filter(
            cls.id.in_(signal_ids)
        ).update(
            {"acknowledged": True, "acknowledged_at": datetime.utcnow()},
            synchronize_session=False
        )
        db.commit()
        return count
