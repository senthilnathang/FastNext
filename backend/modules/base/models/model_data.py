"""
Model Data (XML ID Registry)

Tracks external identifiers (XML IDs) for records.
Similar to Odoo's ir.model.data.

Features:
- Map XML IDs to database record IDs
- Track which module created each record
- Support noupdate flag for protected data
- Enable cross-module references
"""

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.db.base import Base
from app.models.base import TimestampMixin


class IrModelData(Base, TimestampMixin):
    """
    Model Data / XML ID Registry.

    Maps external identifiers to database records.
    Used by the data loader to track and reference records.

    XML ID format: module_name.external_id
    Example: base.user_admin, sale.order_sequence

    Usage:
        # Register an XML ID
        IrModelData.register(db, "sale.order_sequence", "base.Sequence", sequence.id)

        # Look up a record by XML ID
        record_id = IrModelData.get_res_id(db, "sale.order_sequence")

        # Get full XML ID for a record
        xml_id = IrModelData.get_xml_id(db, "base.Sequence", record.id)
    """

    __tablename__ = "ir_model_data"
    __table_args__ = (
        Index("ix_ir_model_data_complete_name", "module", "name"),
        Index("ix_ir_model_data_res", "model", "res_id"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True)

    # XML ID components
    module = Column(String(100), nullable=False, index=True, comment="Owning module")
    name = Column(String(200), nullable=False, index=True, comment="External ID within module")

    # Reference to actual record
    model = Column(String(200), nullable=False, index=True, comment="Model name")
    res_id = Column(Integer, nullable=False, index=True, comment="Record ID")

    # Control flags
    noupdate = Column(Boolean, default=False, comment="Don't update on module upgrade")

    # Reference info (for documentation)
    reference = Column(Text, nullable=True, comment="Optional reference/description")

    def __repr__(self) -> str:
        return f"<IrModelData({self.module}.{self.name} -> {self.model}:{self.res_id})>"

    @property
    def complete_name(self) -> str:
        """Get the complete XML ID (module.name)."""
        return f"{self.module}.{self.name}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "module": self.module,
            "name": self.name,
            "complete_name": self.complete_name,
            "model": self.model,
            "res_id": self.res_id,
            "noupdate": self.noupdate,
        }

    # -------------------------------------------------------------------------
    # Class Methods for Common Operations
    # -------------------------------------------------------------------------

    @classmethod
    def register(
        cls,
        db: Session,
        xml_id: str,
        model: str,
        res_id: int,
        noupdate: bool = False,
        reference: str = None,
    ) -> "IrModelData":
        """
        Register an XML ID for a record.

        Args:
            db: Database session
            xml_id: Complete XML ID (module.name)
            model: Model name
            res_id: Record ID
            noupdate: If True, protect from updates
            reference: Optional description

        Returns:
            Created or updated IrModelData record
        """
        module, name = cls._parse_xml_id(xml_id)

        existing = db.query(cls).filter(
            cls.module == module,
            cls.name == name,
        ).first()

        if existing:
            existing.model = model
            existing.res_id = res_id
            if not existing.noupdate:  # Don't override noupdate flag
                existing.noupdate = noupdate
            if reference:
                existing.reference = reference
            return existing

        record = cls(
            module=module,
            name=name,
            model=model,
            res_id=res_id,
            noupdate=noupdate,
            reference=reference,
        )
        db.add(record)
        return record

    @classmethod
    def get_res_id(
        cls,
        db: Session,
        xml_id: str,
        raise_if_not_found: bool = False,
    ) -> Optional[int]:
        """
        Get the record ID for an XML ID.

        Args:
            db: Database session
            xml_id: Complete XML ID (module.name)
            raise_if_not_found: Raise ValueError if not found

        Returns:
            Record ID or None
        """
        module, name = cls._parse_xml_id(xml_id)

        record = db.query(cls).filter(
            cls.module == module,
            cls.name == name,
        ).first()

        if record:
            return record.res_id

        if raise_if_not_found:
            raise ValueError(f"XML ID not found: {xml_id}")

        return None

    @classmethod
    def get_object(
        cls,
        db: Session,
        xml_id: str,
        model_class: type,
    ) -> Optional[Any]:
        """
        Get the actual record for an XML ID.

        Args:
            db: Database session
            xml_id: Complete XML ID
            model_class: SQLAlchemy model class

        Returns:
            The record or None
        """
        res_id = cls.get_res_id(db, xml_id)
        if res_id:
            return db.query(model_class).filter(
                model_class.id == res_id
            ).first()
        return None

    @classmethod
    def get_xml_id(
        cls,
        db: Session,
        model: str,
        res_id: int,
    ) -> Optional[str]:
        """
        Get the XML ID for a record.

        Args:
            db: Database session
            model: Model name
            res_id: Record ID

        Returns:
            Complete XML ID or None
        """
        record = db.query(cls).filter(
            cls.model == model,
            cls.res_id == res_id,
        ).first()

        if record:
            return record.complete_name

        return None

    @classmethod
    def unlink_for_module(
        cls,
        db: Session,
        module: str,
    ) -> int:
        """
        Remove all XML ID mappings for a module.

        Used when uninstalling a module.

        Args:
            db: Database session
            module: Module name

        Returns:
            Number of records deleted
        """
        deleted = db.query(cls).filter(
            cls.module == module
        ).delete()

        return deleted

    @classmethod
    def check_exists(
        cls,
        db: Session,
        xml_id: str,
    ) -> bool:
        """Check if an XML ID exists."""
        module, name = cls._parse_xml_id(xml_id)

        return db.query(cls).filter(
            cls.module == module,
            cls.name == name,
        ).count() > 0

    @classmethod
    def get_by_module(
        cls,
        db: Session,
        module: str,
        model: str = None,
    ) -> list:
        """
        Get all XML IDs for a module.

        Args:
            db: Database session
            module: Module name
            model: Optional model filter

        Returns:
            List of IrModelData records
        """
        query = db.query(cls).filter(cls.module == module)

        if model:
            query = query.filter(cls.model == model)

        return query.all()

    @staticmethod
    def _parse_xml_id(xml_id: str) -> tuple:
        """Parse module.name format."""
        if "." in xml_id:
            parts = xml_id.split(".", 1)
            return parts[0], parts[1]
        return "__unknown__", xml_id


# ---------------------------------------------------------------------------
# Helper function for easy access
# ---------------------------------------------------------------------------


def ref(db: Session, xml_id: str) -> Optional[int]:
    """
    Shorthand for getting a record ID by XML ID.

    Usage:
        partner_id = ref(db, "base.partner_admin")
    """
    return IrModelData.get_res_id(db, xml_id)
