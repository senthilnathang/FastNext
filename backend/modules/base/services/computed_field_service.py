"""
Computed Field Service

Manages computed field calculations including:
- Simple expression evaluation
- Aggregate calculations (requires DB access)
- Related field resolution
- Batch recomputation
"""

import importlib
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Type

from sqlalchemy import func as sql_func, text
from sqlalchemy.orm import Session

from ..models.computed_field import (
    AggregateFunction,
    ComputedFieldDefinition,
    ComputedFieldInfo,
    ComputeType,
)

logger = logging.getLogger(__name__)


class ComputedFieldService:
    """
    Service for managing computed field calculations.

    Handles complex computations that require database access,
    such as aggregations over related records.

    Usage:
        service = ComputedFieldService(db)

        # Compute all fields on a record
        service.compute_all(record)

        # Compute specific field
        service.compute_field(record, 'total_amount')

        # Batch recompute for multiple records
        service.recompute_batch(records, ['total', 'tax_amount'])

        # Compute aggregate field
        value = service.compute_aggregate(
            function='sum',
            model='SaleOrderLine',
            field='subtotal',
            domain=[{'field': 'order_id', 'operator': '=', 'value': order.id}]
        )
    """

    def __init__(self, db: Session):
        self.db = db
        self._model_cache: Dict[str, Type] = {}
        self._definition_cache: Dict[str, List[ComputedFieldDefinition]] = {}

    # -------------------------------------------------------------------------
    # Main Computation Methods
    # -------------------------------------------------------------------------

    def compute_all(self, record: Any) -> None:
        """
        Compute all computed fields on a record.

        Args:
            record: The record to compute fields for
        """
        # First, use mixin's compute_all if available
        if hasattr(record, "compute_all"):
            record.compute_all()

        # Then check for dynamic definitions
        model_name = self._get_model_name(type(record))
        definitions = self._get_definitions(model_name)

        for definition in definitions:
            self._compute_definition(record, definition)

    def compute_field(self, record: Any, field_name: str) -> Any:
        """
        Compute a specific field on a record.

        Args:
            record: The record
            field_name: Name of the field to compute

        Returns:
            The computed value
        """
        # Try mixin computation first
        if hasattr(record, "_compute_field"):
            record._compute_field(field_name)
            return getattr(record, field_name, None)

        # Try dynamic definition
        model_name = self._get_model_name(type(record))
        definition = self._get_definition(model_name, field_name)

        if definition:
            return self._compute_definition(record, definition)

        return None

    def recompute_batch(
        self,
        records: List[Any],
        fields: List[str] = None,
    ) -> None:
        """
        Recompute fields for a batch of records.

        Args:
            records: List of records
            fields: Optional list of field names (all if None)
        """
        for record in records:
            if fields:
                for field_name in fields:
                    self.compute_field(record, field_name)
            else:
                self.compute_all(record)

        self.db.flush()

    def recompute_dependents(
        self,
        record: Any,
        changed_fields: List[str],
    ) -> List[str]:
        """
        Recompute all fields that depend on the changed fields.

        Args:
            record: The record
            changed_fields: List of fields that changed

        Returns:
            List of field names that were recomputed
        """
        recomputed = []

        # Use mixin if available
        if hasattr(record, "recompute_dependents"):
            record.recompute_dependents(changed_fields)
            if hasattr(record, "_computed_fields"):
                for field_name, info in record._computed_fields.items():
                    if any(dep in changed_fields for dep in info.depends):
                        recomputed.append(field_name)

        # Check dynamic definitions
        model_name = self._get_model_name(type(record))
        definitions = self._get_definitions(model_name)

        for definition in definitions:
            if any(dep in changed_fields for dep in (definition.depends or [])):
                self._compute_definition(record, definition)
                recomputed.append(definition.name)

        return recomputed

    # -------------------------------------------------------------------------
    # Aggregate Computation
    # -------------------------------------------------------------------------

    def compute_aggregate(
        self,
        function: str,
        model: str,
        field: str,
        domain: List[Dict] = None,
    ) -> Any:
        """
        Compute an aggregate value over records.

        Args:
            function: Aggregate function (sum, count, avg, min, max)
            model: Model name
            field: Field to aggregate
            domain: Filter conditions

        Returns:
            Aggregate result
        """
        model_class = self._get_model_class(model)
        if not model_class:
            logger.warning(f"Model not found for aggregate: {model}")
            return None

        # Get the column
        column = getattr(model_class, field, None)
        if column is None:
            logger.warning(f"Field not found for aggregate: {model}.{field}")
            return None

        # Build aggregate function
        agg_func = self._get_aggregate_func(function, column)
        if agg_func is None:
            return None

        # Build query
        query = self.db.query(agg_func)

        # Apply domain filters
        if domain:
            for condition in domain:
                query = self._apply_condition(query, model_class, condition)

        result = query.scalar()
        return result or 0

    def compute_aggregate_for_record(
        self,
        record: Any,
        info: ComputedFieldInfo,
    ) -> Any:
        """
        Compute an aggregate field for a specific record.

        Uses the aggregate metadata stored in ComputedFieldInfo.

        Args:
            record: The parent record
            info: ComputedFieldInfo with aggregate metadata

        Returns:
            Aggregate value
        """
        if not hasattr(info, "aggregate_function"):
            return None

        # Build domain with foreign key reference
        domain = list(info.aggregate_domain or [])

        if hasattr(info, "aggregate_foreign_key") and info.aggregate_foreign_key:
            domain.append({
                "field": info.aggregate_foreign_key,
                "operator": "=",
                "value": record.id,
            })

        return self.compute_aggregate(
            function=info.aggregate_function.value if hasattr(info.aggregate_function, "value") else info.aggregate_function,
            model=info.aggregate_model,
            field=info.aggregate_field,
            domain=domain,
        )

    # -------------------------------------------------------------------------
    # Dynamic Definition Computation
    # -------------------------------------------------------------------------

    def _compute_definition(
        self,
        record: Any,
        definition: ComputedFieldDefinition,
    ) -> Any:
        """Compute a field based on its dynamic definition."""
        value = None

        if definition.compute_type == "python":
            value = self._compute_python_expression(record, definition.expression)

        elif definition.compute_type == "sql":
            value = self._compute_sql_expression(record, definition.expression)

        elif definition.compute_type == "aggregate":
            value = self.compute_aggregate(
                function=definition.aggregate_function,
                model=definition.aggregate_model,
                field=definition.aggregate_field,
                domain=definition.aggregate_domain,
            )

        elif definition.compute_type == "related":
            value = self._compute_related(record, definition.related_field)

        # Set the value on the record
        if value is not None and hasattr(record, definition.name):
            setattr(record, definition.name, value)

        return value

    def _compute_python_expression(
        self,
        record: Any,
        expression: str,
    ) -> Any:
        """
        Evaluate a Python expression.

        WARNING: Only use with trusted expressions.
        """
        if not expression:
            return None

        context = {
            "record": record,
            "self": record,
            "datetime": datetime,
            "sum": sum,
            "len": len,
            "min": min,
            "max": max,
            "abs": abs,
            "round": round,
        }

        try:
            return eval(expression, {"__builtins__": {}}, context)
        except Exception as e:
            logger.error(f"Error evaluating expression '{expression}': {e}")
            return None

    # SQL keywords that are forbidden in computed field expressions
    _FORBIDDEN_SQL_KEYWORDS = frozenset({
        "DROP", "DELETE", "UPDATE", "ALTER", "TRUNCATE",
        "INSERT", "GRANT", "REVOKE", "CREATE", "EXEC",
    })

    def _compute_sql_expression(
        self,
        record: Any,
        expression: str,
    ) -> Any:
        """Execute an SQL expression and return the result.

        Uses parameterized queries to prevent SQL injection.
        The expression should use :record_id as a bind parameter
        for the current record's ID.
        """
        if not expression:
            return None

        # Reject expressions containing dangerous SQL keywords
        upper_expr = expression.upper()
        for kw in self._FORBIDDEN_SQL_KEYWORDS:
            if kw in upper_expr:
                logger.error(
                    f"Forbidden keyword '{kw}' in SQL expression, "
                    f"rejecting: {expression[:100]}"
                )
                return None

        try:
            stmt = text(expression)
            result = self.db.execute(
                stmt, {"record_id": record.id}
            ).scalar()
            return result
        except Exception as e:
            logger.error(f"Error executing SQL expression: {e}")
            return None

    def _compute_related(
        self,
        record: Any,
        field_path: str,
    ) -> Any:
        """Resolve a related field path."""
        if not field_path:
            return None

        parts = field_path.split(".")
        value = record

        for part in parts:
            if value is None:
                break
            value = getattr(value, part, None)

        return value

    # -------------------------------------------------------------------------
    # Definition Management
    # -------------------------------------------------------------------------

    def create_definition(
        self,
        name: str,
        model_name: str,
        compute_type: str = "python",
        expression: str = None,
        depends: List[str] = None,
        store: bool = False,
        **kwargs,
    ) -> ComputedFieldDefinition:
        """
        Create a new computed field definition.

        Args:
            name: Field name
            model_name: Target model
            compute_type: Type of computation
            expression: Python or SQL expression
            depends: Dependency fields
            store: Whether to store computed value
            **kwargs: Additional fields

        Returns:
            Created definition
        """
        definition = ComputedFieldDefinition(
            name=name,
            model_name=model_name,
            compute_type=compute_type,
            expression=expression,
            depends=depends or [],
            store=store,
            **kwargs,
        )

        self.db.add(definition)
        self.db.commit()
        self.db.refresh(definition)

        # Clear cache
        self._definition_cache.pop(model_name, None)

        logger.info(f"Created computed field definition: {model_name}.{name}")
        return definition

    def _get_definitions(self, model_name: str) -> List[ComputedFieldDefinition]:
        """Get all active definitions for a model."""
        if model_name not in self._definition_cache:
            definitions = (
                self.db.query(ComputedFieldDefinition)
                .filter(
                    ComputedFieldDefinition.model_name == model_name,
                    ComputedFieldDefinition.is_active == True,
                )
                .all()
            )
            self._definition_cache[model_name] = definitions

        return self._definition_cache.get(model_name, [])

    def _get_definition(
        self,
        model_name: str,
        field_name: str,
    ) -> Optional[ComputedFieldDefinition]:
        """Get a specific definition by model and field name."""
        definitions = self._get_definitions(model_name)
        for d in definitions:
            if d.name == field_name:
                return d
        return None

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    def _get_model_name(self, model_class: Type) -> str:
        """Get the full model name."""
        module = model_class.__module__
        parts = module.split(".")
        if "modules" in parts:
            idx = parts.index("modules")
            if idx + 1 < len(parts):
                return f"{parts[idx + 1]}.{model_class.__name__}"
        return model_class.__name__

    def _get_model_class(self, model_name: str) -> Optional[Type]:
        """Get a model class by name."""
        if model_name in self._model_cache:
            return self._model_cache[model_name]

        try:
            parts = model_name.split(".")
            if len(parts) == 2:
                mod = importlib.import_module(f"modules.{parts[0]}.models")
                model_class = getattr(mod, parts[1], None)
                if model_class:
                    self._model_cache[model_name] = model_class
                    return model_class
        except Exception:
            pass

        return None

    def _get_aggregate_func(self, function: str, column):
        """Get SQLAlchemy aggregate function."""
        func_map = {
            "sum": sql_func.sum,
            "count": sql_func.count,
            "avg": sql_func.avg,
            "min": sql_func.min,
            "max": sql_func.max,
        }

        func = func_map.get(function.lower())
        if func:
            return func(column)
        return None

    def _apply_condition(
        self,
        query,
        model_class: Type,
        condition: Dict,
    ):
        """Apply a domain condition to a query."""
        field = condition.get("field")
        operator = condition.get("operator", "=")
        value = condition.get("value")

        column = getattr(model_class, field, None)
        if column is None:
            return query

        if operator in ("=", "=="):
            return query.filter(column == value)
        elif operator in ("!=", "<>"):
            return query.filter(column != value)
        elif operator == ">":
            return query.filter(column > value)
        elif operator == ">=":
            return query.filter(column >= value)
        elif operator == "<":
            return query.filter(column < value)
        elif operator == "<=":
            return query.filter(column <= value)
        elif operator == "in":
            return query.filter(column.in_(value if isinstance(value, list) else [value]))
        elif operator == "not in":
            return query.filter(~column.in_(value if isinstance(value, list) else [value]))
        elif operator == "like":
            return query.filter(column.like(f"%{value}%"))
        elif operator == "is null":
            return query.filter(column.is_(None))
        elif operator == "is not null":
            return query.filter(column.isnot(None))

        return query


def get_computed_field_service(db: Session) -> ComputedFieldService:
    """Factory function for ComputedFieldService."""
    return ComputedFieldService(db)
