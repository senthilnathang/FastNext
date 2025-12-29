"""
Computed Field Model

Implements computed/formula fields for models.
Similar to Odoo's computed fields and Salesforce formula fields.

Features:
- Define computed fields via decorators or configuration
- Support for dependencies (recompute when dependencies change)
- Store computed values or calculate on-the-fly
- Support for aggregations and related field access
"""

from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Type, Union

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.event import listen
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.base import TimestampMixin


class ComputeType(str, Enum):
    """How the field value is computed."""
    PYTHON = "python"  # Python expression/code
    SQL = "sql"  # SQL expression
    AGGREGATE = "aggregate"  # Aggregation (sum, count, avg)
    RELATED = "related"  # Value from related record


class AggregateFunction(str, Enum):
    """Aggregate functions for computed fields."""
    SUM = "sum"
    COUNT = "count"
    AVG = "avg"
    MIN = "min"
    MAX = "max"


class ComputedFieldDefinition(Base, TimestampMixin):
    """
    Stored definition of a computed field.

    Used for dynamic computed field configuration.
    For static definitions, use the @computed decorator instead.
    """

    __tablename__ = "computed_field_definitions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)

    # Field identification
    name = Column(String(100), nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    module_name = Column(String(100), nullable=True, index=True)

    # Computation definition
    compute_type = Column(String(30), default="python")
    expression = Column(Text, nullable=True, comment="Python expression or SQL")

    # Dependencies (fields that trigger recomputation)
    depends = Column(JSONB, default=list, comment="List of field names")

    # For aggregate computations
    aggregate_function = Column(String(20), nullable=True)
    aggregate_field = Column(String(100), nullable=True)
    aggregate_model = Column(String(100), nullable=True)
    aggregate_domain = Column(JSONB, default=list)

    # For related field access
    related_field = Column(String(200), nullable=True, comment="Dot notation path")

    # Storage
    store = Column(Boolean, default=False, comment="Store computed value in DB")
    readonly = Column(Boolean, default=True)

    # Activation
    is_active = Column(Boolean, default=True, index=True)

    def __repr__(self) -> str:
        return f"<ComputedFieldDefinition({self.model_name}.{self.name})>"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "model_name": self.model_name,
            "compute_type": self.compute_type,
            "expression": self.expression,
            "depends": self.depends,
            "store": self.store,
        }


# ---------------------------------------------------------------------------
# Computed Field Decorator and Mixin
# ---------------------------------------------------------------------------


class ComputedFieldInfo:
    """Metadata for a computed field."""

    def __init__(
        self,
        compute: Union[str, Callable],
        depends: List[str] = None,
        store: bool = False,
        readonly: bool = True,
        compute_type: ComputeType = ComputeType.PYTHON,
    ):
        self.compute = compute
        self.depends = depends or []
        self.store = store
        self.readonly = readonly
        self.compute_type = compute_type
        self.field_name: Optional[str] = None

    def __repr__(self) -> str:
        return f"<ComputedFieldInfo({self.field_name}, depends={self.depends})>"


def computed(
    compute: Union[str, Callable] = None,
    depends: List[str] = None,
    store: bool = False,
    readonly: bool = True,
) -> Callable:
    """
    Decorator to mark a field as computed.

    Can be used as:
    1. @computed - uses method with same name as _compute_{field}
    2. @computed(depends=['field1', 'field2'])
    3. @computed('_compute_my_field', depends=['price', 'qty'])

    Example:
        class SaleOrder(ComputedFieldsMixin, Base):
            price = Column(Float)
            quantity = Column(Integer)
            total = Column(Float)  # Computed field

            @computed(depends=['price', 'quantity'], store=True)
            def _compute_total(self):
                self.total = self.price * self.quantity
    """

    def decorator(func_or_class):
        if callable(func_or_class) and not isinstance(func_or_class, type):
            # Decorating a method
            info = ComputedFieldInfo(
                compute=func_or_class,
                depends=depends or [],
                store=store,
                readonly=readonly,
            )
            func_or_class._computed_info = info
            return func_or_class
        return func_or_class

    if compute is not None and callable(compute) and not isinstance(compute, str):
        # @computed without arguments
        return decorator(compute)

    return decorator


class ComputedFieldsMixin:
    """
    Mixin that enables computed fields on a model.

    Usage:
        class MyModel(ComputedFieldsMixin, Base):
            __tablename__ = 'my_model'

            name = Column(String)
            price = Column(Float)
            quantity = Column(Integer)
            total = Column(Float)

            @computed(depends=['price', 'quantity'], store=True)
            def _compute_total(self):
                self.total = (self.price or 0) * (self.quantity or 0)
    """

    _computed_fields: Dict[str, ComputedFieldInfo] = {}

    @classmethod
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls._register_computed_fields()

    @classmethod
    def _register_computed_fields(cls):
        """Register all computed fields from decorated methods."""
        cls._computed_fields = {}

        for name in dir(cls):
            if name.startswith("_compute_"):
                method = getattr(cls, name, None)
                if method and hasattr(method, "_computed_info"):
                    info: ComputedFieldInfo = method._computed_info
                    # Field name is derived from method name
                    field_name = name.replace("_compute_", "")
                    info.field_name = field_name
                    info.compute = method
                    cls._computed_fields[field_name] = info

    def compute_all(self):
        """Compute all computed fields."""
        for field_name, info in self._computed_fields.items():
            self._compute_field(field_name)

    def _compute_field(self, field_name: str):
        """Compute a single field."""
        info = self._computed_fields.get(field_name)
        if not info:
            return

        if callable(info.compute):
            info.compute(self)

    def _get_depends_for_field(self, field_name: str) -> Set[str]:
        """Get all fields that this computed field depends on."""
        info = self._computed_fields.get(field_name)
        return set(info.depends) if info else set()

    def _get_fields_depending_on(self, changed_field: str) -> List[str]:
        """Get all computed fields that depend on the changed field."""
        result = []
        for field_name, info in self._computed_fields.items():
            if changed_field in info.depends:
                result.append(field_name)
        return result

    def recompute_dependents(self, changed_fields: List[str]):
        """Recompute all fields that depend on the changed fields."""
        to_compute = set()
        for field in changed_fields:
            to_compute.update(self._get_fields_depending_on(field))

        for field_name in to_compute:
            self._compute_field(field_name)


# ---------------------------------------------------------------------------
# SQLAlchemy Event Listeners for Auto-Recomputation
# ---------------------------------------------------------------------------


def setup_computed_field_listeners(model_class: Type):
    """
    Set up SQLAlchemy event listeners for automatic recomputation.

    Call this after defining your model to enable auto-recomputation
    when dependencies change.
    """
    if not hasattr(model_class, "_computed_fields"):
        return

    def before_flush(session, flush_context, instances):
        for obj in session.dirty:
            if isinstance(obj, model_class):
                # Get changed attributes
                changed = []
                for attr in session.dirty:
                    if hasattr(attr, "attrs"):
                        changed.extend(attr.attrs.keys())

                if hasattr(obj, "recompute_dependents"):
                    obj.recompute_dependents(changed)

    listen(Session, "before_flush", before_flush)


# ---------------------------------------------------------------------------
# Related Field Access
# ---------------------------------------------------------------------------


def related(field_path: str, store: bool = False) -> Callable:
    """
    Decorator for related field access.

    Allows accessing values from related records using dot notation.

    Example:
        class SaleOrderLine(ComputedFieldsMixin, Base):
            order_id = Column(Integer, ForeignKey('sale_order.id'))
            order = relationship('SaleOrder')

            # Access order.partner_name without explicit computation
            partner_name = Column(String)

            @related('order.partner_id.name')
            def _compute_partner_name(self):
                pass  # Automatically resolved
    """

    def decorator(func):
        parts = field_path.split(".")

        def wrapper(self):
            value = self
            for part in parts:
                if value is None:
                    break
                value = getattr(value, part, None)
            # Set the value on the field
            field_name = func.__name__.replace("_compute_", "")
            setattr(self, field_name, value)

        info = ComputedFieldInfo(
            compute=wrapper,
            depends=[parts[0]] if parts else [],
            store=store,
            compute_type=ComputeType.RELATED,
        )
        wrapper._computed_info = info
        return wrapper

    return decorator


# ---------------------------------------------------------------------------
# Aggregate Field
# ---------------------------------------------------------------------------


def aggregate(
    function: AggregateFunction,
    field: str,
    model: str,
    domain: List[Dict] = None,
    foreign_key: str = None,
    store: bool = False,
) -> Callable:
    """
    Decorator for aggregate computed fields.

    Calculates aggregations over related records.

    Example:
        class SaleOrder(ComputedFieldsMixin, Base):
            total_lines = Column(Integer)
            total_amount = Column(Float)

            @aggregate(
                function=AggregateFunction.COUNT,
                field='id',
                model='SaleOrderLine',
                foreign_key='order_id'
            )
            def _compute_total_lines(self):
                pass  # Automatically calculated

            @aggregate(
                function=AggregateFunction.SUM,
                field='subtotal',
                model='SaleOrderLine',
                foreign_key='order_id'
            )
            def _compute_total_amount(self):
                pass
    """

    def decorator(func):
        def wrapper(self):
            # This requires database access - handled by service
            pass

        info = ComputedFieldInfo(
            compute=wrapper,
            depends=[],
            store=store,
            compute_type=ComputeType.AGGREGATE,
        )
        # Store aggregate metadata
        info.aggregate_function = function
        info.aggregate_field = field
        info.aggregate_model = model
        info.aggregate_domain = domain or []
        info.aggregate_foreign_key = foreign_key
        wrapper._computed_info = info
        return wrapper

    return decorator
