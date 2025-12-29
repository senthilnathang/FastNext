"""
Configuration Parameter Service

Provides access to module configuration parameters.
Supports typed values, company-specific settings, and manifest defaults.
"""

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..models.config_parameter import ConfigParameter, ConfigValueType

logger = logging.getLogger(__name__)


class ConfigParameterService:
    """
    Service for managing configuration parameters.

    Provides a key-value configuration store with typed values,
    similar to Odoo's ir.config_parameter.

    Features:
    - Typed values (string, integer, float, boolean, json)
    - Module association for grouping
    - Company-specific configuration
    - Default value loading from manifests

    Usage:
        service = ConfigParameterService(db)

        # Get a parameter
        smtp_host = service.get_param("base.smtp_host", default="localhost")

        # Set a parameter
        service.set_param("base.smtp_host", "mail.example.com")

        # Get all config for a module
        config = service.get_module_config("base")
    """

    def __init__(self, db: Session):
        self.db = db

    def get_param(
        self,
        key: str,
        default: Any = None,
        company_id: Optional[int] = None
    ) -> Any:
        """
        Get a configuration parameter value.

        Args:
            key: Parameter key
            default: Default value if not found
            company_id: Optional company ID for multi-tenant

        Returns:
            The parameter value (typed) or default
        """
        return ConfigParameter.get_param(self.db, key, default, company_id)

    def set_param(
        self,
        key: str,
        value: Any,
        value_type: str = None,
        module_name: str = None,
        description: str = None,
        company_id: int = None,
        is_system: bool = False
    ) -> ConfigParameter:
        """
        Set a configuration parameter value.

        Args:
            key: Parameter key
            value: Value to set (any type)
            value_type: Optional explicit type
            module_name: Optional module name for grouping
            description: Optional description
            company_id: Optional company ID
            is_system: Whether protected from UI modification

        Returns:
            The created or updated ConfigParameter
        """
        param = ConfigParameter.set_param(
            db=self.db,
            key=key,
            value=value,
            value_type=value_type,
            module_name=module_name,
            description=description,
            company_id=company_id,
            is_system=is_system
        )
        logger.debug(f"Set config parameter: {key} = {value}")
        return param

    def delete_param(self, key: str, company_id: int = None) -> bool:
        """
        Delete a configuration parameter.

        Args:
            key: Parameter key
            company_id: Optional company ID

        Returns:
            True if deleted, False if not found
        """
        try:
            result = ConfigParameter.delete_param(self.db, key, company_id)
            if result:
                logger.debug(f"Deleted config parameter: {key}")
            return result
        except ValueError as e:
            logger.warning(f"Cannot delete parameter: {e}")
            raise

    def get_module_config(
        self,
        module_name: str,
        company_id: int = None
    ) -> Dict[str, Any]:
        """
        Get all configuration parameters for a module.

        Args:
            module_name: Module name
            company_id: Optional company ID

        Returns:
            Dictionary of key -> typed value
        """
        return ConfigParameter.get_module_params(self.db, module_name, company_id)

    def load_defaults_from_manifest(
        self,
        module_name: str,
        defaults: Dict[str, Dict[str, Any]]
    ) -> List[ConfigParameter]:
        """
        Load default configuration from a module manifest.

        Only creates parameters that don't already exist.
        Called during module installation.

        Args:
            module_name: Module name
            defaults: Dictionary of key -> {value, type, description}
                Example:
                {
                    "mymodule.setting1": {
                        "value": "default",
                        "type": "string",
                        "description": "Description"
                    }
                }

        Returns:
            List of created ConfigParameter objects
        """
        created = ConfigParameter.load_defaults(self.db, module_name, defaults)
        if created:
            logger.info(
                f"Loaded {len(created)} default config parameters for {module_name}"
            )
        return created

    def get_all_params(
        self,
        module_name: str = None,
        company_id: int = None,
        include_system: bool = True
    ) -> List[ConfigParameter]:
        """
        Get all configuration parameters.

        Args:
            module_name: Optional filter by module
            company_id: Optional filter by company
            include_system: Whether to include system parameters

        Returns:
            List of ConfigParameter objects
        """
        query = self.db.query(ConfigParameter)

        if module_name:
            query = query.filter(ConfigParameter.module_name == module_name)

        if company_id is not None:
            query = query.filter(
                (ConfigParameter.company_id == company_id) |
                (ConfigParameter.company_id.is_(None))
            )

        if not include_system:
            query = query.filter(ConfigParameter.is_system == False)

        return query.order_by(ConfigParameter.key).all()

    def get_param_by_id(self, param_id: int) -> Optional[ConfigParameter]:
        """
        Get a configuration parameter by ID.

        Args:
            param_id: Parameter ID

        Returns:
            ConfigParameter or None
        """
        return self.db.query(ConfigParameter).filter(
            ConfigParameter.id == param_id
        ).first()

    def get_param_by_key(
        self,
        key: str,
        company_id: int = None
    ) -> Optional[ConfigParameter]:
        """
        Get a configuration parameter object by key.

        Args:
            key: Parameter key
            company_id: Optional company ID

        Returns:
            ConfigParameter object or None
        """
        query = self.db.query(ConfigParameter).filter(ConfigParameter.key == key)
        if company_id is not None:
            query = query.filter(ConfigParameter.company_id == company_id)
        else:
            query = query.filter(ConfigParameter.company_id.is_(None))
        return query.first()

    def update_param(
        self,
        param_id: int,
        value: Any = None,
        description: str = None
    ) -> Optional[ConfigParameter]:
        """
        Update a configuration parameter by ID.

        Args:
            param_id: Parameter ID
            value: New value (optional)
            description: New description (optional)

        Returns:
            Updated ConfigParameter or None if not found
        """
        param = self.get_param_by_id(param_id)
        if not param:
            return None

        if value is not None:
            string_value, value_type = ConfigParameter.set_typed_value(
                value, param.value_type
            )
            param.value = string_value
            param.value_type = value_type

        if description is not None:
            param.description = description

        self.db.flush()
        logger.debug(f"Updated config parameter: {param.key}")
        return param

    def search_params(
        self,
        query: str,
        module_name: str = None,
        company_id: int = None
    ) -> List[ConfigParameter]:
        """
        Search configuration parameters by key or description.

        Args:
            query: Search query
            module_name: Optional filter by module
            company_id: Optional filter by company

        Returns:
            List of matching ConfigParameter objects
        """
        search_query = self.db.query(ConfigParameter).filter(
            (ConfigParameter.key.ilike(f"%{query}%")) |
            (ConfigParameter.description.ilike(f"%{query}%"))
        )

        if module_name:
            search_query = search_query.filter(
                ConfigParameter.module_name == module_name
            )

        if company_id is not None:
            search_query = search_query.filter(
                (ConfigParameter.company_id == company_id) |
                (ConfigParameter.company_id.is_(None))
            )

        return search_query.order_by(ConfigParameter.key).all()

    def bulk_set_params(
        self,
        params: Dict[str, Any],
        module_name: str = None,
        company_id: int = None
    ) -> List[ConfigParameter]:
        """
        Set multiple configuration parameters at once.

        Args:
            params: Dictionary of key -> value
            module_name: Optional module name for all params
            company_id: Optional company ID

        Returns:
            List of created/updated ConfigParameter objects
        """
        results = []
        for key, value in params.items():
            param = self.set_param(
                key=key,
                value=value,
                module_name=module_name,
                company_id=company_id
            )
            results.append(param)
        return results

    def delete_module_params(self, module_name: str) -> int:
        """
        Delete all configuration parameters for a module.

        Called during module uninstallation.

        Args:
            module_name: Module name

        Returns:
            Number of deleted parameters
        """
        count = self.db.query(ConfigParameter).filter(
            ConfigParameter.module_name == module_name,
            ConfigParameter.is_system == False
        ).delete()
        logger.info(f"Deleted {count} config parameters for module {module_name}")
        return count


def get_config_parameter_service(db: Session) -> ConfigParameterService:
    """
    Factory function to get ConfigParameterService.

    Args:
        db: Database session

    Returns:
        ConfigParameterService instance
    """
    return ConfigParameterService(db)
