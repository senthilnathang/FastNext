"""
Module Service

Provides business logic for module management operations.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from modules.base.models.module import InstalledModule, ModuleReloadSignal, serialize_manifest

logger = logging.getLogger(__name__)


class ModuleService:
    """
    Service for managing installed modules.

    Handles CRUD operations on InstalledModule records and module reload signals.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_all_modules(self, include_uninstalled: bool = False) -> List[InstalledModule]:
        """
        Get all installed modules.

        Args:
            include_uninstalled: If True, include uninstalled modules

        Returns:
            List of InstalledModule instances
        """
        query = self.db.query(InstalledModule)
        if not include_uninstalled:
            query = query.filter(InstalledModule.state != "uninstalled")
        return query.order_by(InstalledModule.name).all()

    def get_module(self, name: str) -> Optional[InstalledModule]:
        """
        Get a module by name.

        Args:
            name: Technical module name

        Returns:
            InstalledModule instance or None
        """
        return self.db.query(InstalledModule).filter(
            InstalledModule.name == name
        ).first()

    def get_module_by_id(self, module_id: int) -> Optional[InstalledModule]:
        """
        Get a module by ID.

        Args:
            module_id: Module database ID

        Returns:
            InstalledModule instance or None
        """
        return self.db.query(InstalledModule).filter(
            InstalledModule.id == module_id
        ).first()

    def install_module(
        self,
        name: str,
        manifest: Dict[str, Any],
        path: Optional[str] = None
    ) -> InstalledModule:
        """
        Install or update a module in the database.

        Args:
            name: Technical module name
            manifest: Module manifest dictionary
            path: Optional filesystem path

        Returns:
            InstalledModule instance
        """
        existing = self.get_module(name)

        if existing:
            # Update existing module
            existing.display_name = manifest.get("name", name)
            existing.version = manifest.get("version", "1.0.0")
            existing.summary = manifest.get("summary")
            existing.description = manifest.get("description")
            existing.author = manifest.get("author")
            existing.website = manifest.get("website")
            existing.category = manifest.get("category", "Uncategorized")
            existing.license = manifest.get("license", "MIT")
            existing.application = manifest.get("application", False)
            existing.depends = manifest.get("depends", [])
            existing.manifest_cache = serialize_manifest(manifest)
            existing.module_path = path
            existing.auto_install = manifest.get("auto_install", False)
            existing.state = "installed"
            existing.uninstalled_at = None

            self.db.commit()
            self.db.refresh(existing)

            # Create reload signal
            self._create_reload_signal(name, "upgrade")

            logger.info(f"Updated module: {name} v{existing.version}")
            return existing
        else:
            # Create new module
            module = InstalledModule.from_manifest(name, manifest, path)
            self.db.add(module)
            self.db.commit()
            self.db.refresh(module)

            # Create reload signal
            self._create_reload_signal(name, "install")

            logger.info(f"Installed module: {name} v{module.version}")
            return module

    def uninstall_module(self, name: str) -> bool:
        """
        Mark a module as uninstalled.

        Args:
            name: Technical module name

        Returns:
            True if module was uninstalled, False if not found
        """
        module = self.get_module(name)
        if not module:
            return False

        module.state = "uninstalled"
        module.uninstalled_at = datetime.utcnow()
        self.db.commit()

        # Create reload signal
        self._create_reload_signal(name, "uninstall")

        logger.info(f"Uninstalled module: {name}")
        return True

    def set_module_state(self, name: str, state: str) -> bool:
        """
        Set the state of a module.

        Args:
            name: Technical module name
            state: New state value

        Returns:
            True if state was set, False if module not found
        """
        module = self.get_module(name)
        if not module:
            return False

        module.state = state
        self.db.commit()

        logger.info(f"Module '{name}' state changed to: {state}")
        return True

    def get_modules_by_category(self, category: str) -> List[InstalledModule]:
        """Get all installed modules in a category."""
        return self.db.query(InstalledModule).filter(
            InstalledModule.category == category,
            InstalledModule.state == "installed"
        ).order_by(InstalledModule.name).all()

    def get_applications(self) -> List[InstalledModule]:
        """Get all installed application modules."""
        return self.db.query(InstalledModule).filter(
            InstalledModule.application == True,
            InstalledModule.state == "installed"
        ).order_by(InstalledModule.name).all()

    def get_dependents(self, name: str) -> List[InstalledModule]:
        """
        Get modules that depend on the given module.

        Args:
            name: Module name to find dependents for

        Returns:
            List of dependent modules
        """
        # Use JSONB contains operator to find modules with this dependency
        return self.db.query(InstalledModule).filter(
            InstalledModule.depends.contains([name]),
            InstalledModule.state == "installed"
        ).all()

    def _create_reload_signal(self, module_name: str, action: str) -> ModuleReloadSignal:
        """Create a reload signal for frontend synchronization."""
        signal = ModuleReloadSignal(
            module_name=module_name,
            action=action
        )
        self.db.add(signal)
        self.db.commit()
        self.db.refresh(signal)
        return signal

    def get_pending_reload_signals(self, limit: int = 50) -> List[ModuleReloadSignal]:
        """Get unacknowledged reload signals."""
        return ModuleReloadSignal.get_pending_signals(self.db, limit)

    def acknowledge_reload_signals(self, signal_ids: List[int]) -> int:
        """Mark reload signals as acknowledged."""
        return ModuleReloadSignal.acknowledge_signals(self.db, signal_ids)


# Dependency injection helper
_module_service: Optional[ModuleService] = None


def get_module_service(db: Session) -> ModuleService:
    """Get a ModuleService instance."""
    return ModuleService(db)
