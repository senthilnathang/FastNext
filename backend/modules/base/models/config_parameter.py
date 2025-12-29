"""
Configuration Parameter Model

Key-value configuration storage per module.
Similar to Odoo's ir.config_parameter.
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
import json

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.base import TimestampMixin


class ConfigValueType(str, Enum):
    """Configuration value types."""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    JSON = "json"
    SECRET = "secret"  # For sensitive values (could be encrypted in future)


class ConfigParameter(Base, TimestampMixin):
    """
    Configuration Parameter storage.

    Provides a key-value store for module configuration with typed values.
    Similar to Odoo's ir.config_parameter but with additional features:
    - Typed values (string, integer, float, boolean, json, secret)
    - Module association for grouping
    - Company-specific configuration for multi-tenancy
    - System flag to protect critical settings

    Usage:
        # Get a parameter (via service)
        value = config_service.get_param("base.smtp_host", default="localhost")

        # Set a parameter (via service)
        config_service.set_param("base.smtp_host", "mail.example.com")
    """

    __tablename__ = "config_parameters"
    __table_args__ = (
        Index("ix_config_parameters_key_module", "key", "module_name"),
        Index("ix_config_parameters_module_company", "module_name", "company_id"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # Parameter identification
    key = Column(
        String(200),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique parameter key, typically module.parameter_name"
    )
    module_name = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Module that owns this parameter"
    )

    # Value storage
    value = Column(
        Text,
        nullable=True,
        comment="String representation of the value"
    )
    value_type = Column(
        String(20),
        default=ConfigValueType.STRING.value,
        comment="Type of the value for proper conversion"
    )

    # Metadata
    description = Column(
        Text,
        nullable=True,
        comment="Human-readable description of the parameter"
    )
    is_system = Column(
        Boolean,
        default=False,
        comment="Protected from user modification via UI"
    )

    # Company-specific (optional for multi-tenant)
    company_id = Column(
        Integer,
        nullable=True,
        index=True,
        comment="Company ID for multi-tenant configuration"
    )

    def __repr__(self) -> str:
        return f"<ConfigParameter(key='{self.key}', value='{self.value[:50] if self.value else None}...')>"

    def get_typed_value(self) -> Any:
        """
        Get the value converted to its proper type.

        Returns:
            The value converted to the appropriate Python type.
        """
        if self.value is None:
            return None

        try:
            if self.value_type == ConfigValueType.INTEGER.value:
                return int(self.value)
            elif self.value_type == ConfigValueType.FLOAT.value:
                return float(self.value)
            elif self.value_type == ConfigValueType.BOOLEAN.value:
                return self.value.lower() in ("true", "1", "yes", "on")
            elif self.value_type == ConfigValueType.JSON.value:
                return json.loads(self.value)
            elif self.value_type == ConfigValueType.SECRET.value:
                # In future, could decrypt here
                return self.value
            else:
                return self.value
        except (ValueError, json.JSONDecodeError):
            return self.value

    @staticmethod
    def set_typed_value(value: Any, value_type: str = None) -> tuple:
        """
        Convert a Python value to string for storage.

        Args:
            value: The value to convert
            value_type: Optional explicit type, otherwise auto-detected

        Returns:
            Tuple of (string_value, value_type)
        """
        if value is None:
            return (None, value_type or ConfigValueType.STRING.value)

        # Auto-detect type if not specified
        if value_type is None:
            if isinstance(value, bool):
                value_type = ConfigValueType.BOOLEAN.value
            elif isinstance(value, int):
                value_type = ConfigValueType.INTEGER.value
            elif isinstance(value, float):
                value_type = ConfigValueType.FLOAT.value
            elif isinstance(value, (dict, list)):
                value_type = ConfigValueType.JSON.value
            else:
                value_type = ConfigValueType.STRING.value

        # Convert to string
        if value_type == ConfigValueType.JSON.value:
            string_value = json.dumps(value)
        elif value_type == ConfigValueType.BOOLEAN.value:
            string_value = "true" if value else "false"
        else:
            string_value = str(value)

        return (string_value, value_type)

    # Class methods for quick access
    @classmethod
    def get_param(
        cls,
        db: Session,
        key: str,
        default: Any = None,
        company_id: Optional[int] = None
    ) -> Any:
        """
        Get a configuration parameter value.

        Args:
            db: Database session
            key: Parameter key
            default: Default value if not found
            company_id: Optional company ID for multi-tenant

        Returns:
            The parameter value or default
        """
        query = db.query(cls).filter(cls.key == key)
        if company_id is not None:
            # Try company-specific first, then global
            param = query.filter(cls.company_id == company_id).first()
            if param is None:
                param = query.filter(cls.company_id.is_(None)).first()
        else:
            param = query.filter(cls.company_id.is_(None)).first()

        if param is None:
            return default

        return param.get_typed_value()

    @classmethod
    def set_param(
        cls,
        db: Session,
        key: str,
        value: Any,
        value_type: str = None,
        module_name: str = None,
        description: str = None,
        company_id: int = None,
        is_system: bool = False
    ) -> "ConfigParameter":
        """
        Set a configuration parameter value.

        Args:
            db: Database session
            key: Parameter key
            value: Value to set
            value_type: Optional explicit type
            module_name: Optional module name
            description: Optional description
            company_id: Optional company ID
            is_system: Whether this is a system parameter

        Returns:
            The created or updated ConfigParameter
        """
        string_value, detected_type = cls.set_typed_value(value, value_type)

        # Find existing
        query = db.query(cls).filter(cls.key == key)
        if company_id is not None:
            query = query.filter(cls.company_id == company_id)
        else:
            query = query.filter(cls.company_id.is_(None))
        param = query.first()

        if param:
            param.value = string_value
            param.value_type = detected_type
            if description is not None:
                param.description = description
        else:
            param = cls(
                key=key,
                value=string_value,
                value_type=detected_type,
                module_name=module_name,
                description=description,
                company_id=company_id,
                is_system=is_system
            )
            db.add(param)

        db.flush()
        return param

    @classmethod
    def delete_param(cls, db: Session, key: str, company_id: int = None) -> bool:
        """
        Delete a configuration parameter.

        Args:
            db: Database session
            key: Parameter key
            company_id: Optional company ID

        Returns:
            True if deleted, False if not found
        """
        query = db.query(cls).filter(cls.key == key)
        if company_id is not None:
            query = query.filter(cls.company_id == company_id)
        else:
            query = query.filter(cls.company_id.is_(None))

        param = query.first()
        if param:
            if param.is_system:
                raise ValueError(f"Cannot delete system parameter: {key}")
            db.delete(param)
            return True
        return False

    @classmethod
    def get_module_params(
        cls,
        db: Session,
        module_name: str,
        company_id: int = None
    ) -> Dict[str, Any]:
        """
        Get all parameters for a module.

        Args:
            db: Database session
            module_name: Module name
            company_id: Optional company ID

        Returns:
            Dictionary of key -> typed value
        """
        query = db.query(cls).filter(cls.module_name == module_name)
        if company_id is not None:
            query = query.filter(
                (cls.company_id == company_id) | (cls.company_id.is_(None))
            )
        else:
            query = query.filter(cls.company_id.is_(None))

        params = query.all()
        return {p.key: p.get_typed_value() for p in params}

    @classmethod
    def load_defaults(
        cls,
        db: Session,
        module_name: str,
        defaults: Dict[str, Dict[str, Any]]
    ) -> List["ConfigParameter"]:
        """
        Load default parameters from a module's manifest.

        Only creates parameters that don't already exist.

        Args:
            db: Database session
            module_name: Module name
            defaults: Dictionary of key -> {value, type, description}

        Returns:
            List of created ConfigParameter objects
        """
        created = []
        for key, config in defaults.items():
            # Check if already exists
            existing = db.query(cls).filter(cls.key == key).first()
            if existing:
                continue

            value = config.get("value")
            value_type = config.get("type")
            description = config.get("description")

            param = cls.set_param(
                db=db,
                key=key,
                value=value,
                value_type=value_type,
                module_name=module_name,
                description=description
            )
            created.append(param)

        return created
