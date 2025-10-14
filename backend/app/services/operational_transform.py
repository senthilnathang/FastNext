"""
Operational Transform service for conflict-free collaborative editing
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum


class OperationType(Enum):
    INSERT = "insert"
    DELETE = "delete"
    RETAIN = "retain"


@dataclass
class Operation:
    type: OperationType
    position: int
    content: Optional[str] = None
    length: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "type": self.type.value,
            "position": self.position
        }
        if self.content is not None:
            result["content"] = self.content
        if self.length is not None:
            result["length"] = self.length
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Operation':
        return cls(
            type=OperationType(data["type"]),
            position=data["position"],
            content=data.get("content"),
            length=data.get("length")
        )


class OperationalTransform:
    """
    Basic operational transform implementation for collaborative editing
    """

    @staticmethod
    def transform(operation_a: Operation, operation_b: Operation) -> tuple[Operation, Operation]:
        """
        Transform two concurrent operations to maintain consistency

        Returns transformed operations (operation_a', operation_b')
        """
        if operation_a.type == OperationType.RETAIN and operation_b.type == OperationType.RETAIN:
            # Both retain - no transformation needed
            return operation_a, operation_b

        elif operation_a.type == OperationType.INSERT and operation_b.type == OperationType.RETAIN:
            # Insert vs Retain - adjust insert position if needed
            if operation_b.position <= operation_a.position:
                return operation_a, operation_b
            else:
                # operation_b retains past operation_a's insert, shift operation_a
                return Operation(
                    type=OperationType.INSERT,
                    position=operation_a.position + (operation_b.length or 0),
                    content=operation_a.content
                ), operation_b

        elif operation_a.type == OperationType.RETAIN and operation_b.type == OperationType.INSERT:
            # Retain vs Insert - symmetric to above
            if operation_a.position <= operation_b.position:
                return operation_a, operation_b
            else:
                return operation_a, Operation(
                    type=OperationType.INSERT,
                    position=operation_b.position + (operation_a.length or 0),
                    content=operation_b.content
                )

        elif operation_a.type == OperationType.INSERT and operation_b.type == OperationType.INSERT:
            # Both insert - order by position
            if operation_a.position < operation_b.position:
                return operation_a, Operation(
                    type=OperationType.INSERT,
                    position=operation_b.position + len(operation_a.content or ""),
                    content=operation_b.content
                )
            elif operation_a.position > operation_b.position:
                return Operation(
                    type=OperationType.INSERT,
                    position=operation_a.position + len(operation_b.content or ""),
                    content=operation_a.content
                ), operation_b
            else:
                # Same position - arbitrary order
                return operation_a, Operation(
                    type=OperationType.INSERT,
                    position=operation_b.position + len(operation_a.content or ""),
                    content=operation_b.content
                )

        elif operation_a.type == OperationType.DELETE and operation_b.type == OperationType.RETAIN:
            # Delete vs Retain
            if operation_b.position <= operation_a.position:
                return operation_a, operation_b
            else:
                return Operation(
                    type=OperationType.DELETE,
                    position=operation_a.position + (operation_b.length or 0),
                    length=operation_a.length
                ), operation_b

        elif operation_a.type == OperationType.RETAIN and operation_b.type == OperationType.DELETE:
            # Retain vs Delete - symmetric
            if operation_a.position <= operation_b.position:
                return operation_a, operation_b
            else:
                return operation_a, Operation(
                    type=OperationType.DELETE,
                    position=operation_b.position + (operation_a.length or 0),
                    length=operation_b.length
                )

        elif operation_a.type == OperationType.DELETE and operation_b.type == OperationType.DELETE:
            # Both delete - handle overlapping deletions
            a_start = operation_a.position
            a_end = a_start + (operation_a.length or 0)
            b_start = operation_b.position
            b_end = b_start + (operation_b.length or 0)

            if a_end <= b_start:
                # No overlap
                return operation_a, operation_b
            elif b_end <= a_start:
                # No overlap
                return operation_a, operation_b
            else:
                # Overlapping deletions - merge or adjust
                # For simplicity, keep both but adjust positions
                return operation_a, operation_b

        elif operation_a.type == OperationType.INSERT and operation_b.type == OperationType.DELETE:
            # Insert vs Delete
            if operation_b.position <= operation_a.position:
                return Operation(
                    type=OperationType.INSERT,
                    position=operation_a.position - (operation_b.length or 0),
                    content=operation_a.content
                ), operation_b
            else:
                return operation_a, operation_b

        elif operation_a.type == OperationType.DELETE and operation_b.type == OperationType.INSERT:
            # Delete vs Insert - symmetric
            if operation_a.position <= operation_b.position:
                return operation_a, Operation(
                    type=OperationType.INSERT,
                    position=operation_b.position - (operation_a.length or 0),
                    content=operation_b.content
                )
            else:
                return operation_a, operation_b

        # Default: no transformation
        return operation_a, operation_b

    @staticmethod
    def apply_operation(content: str, operation: Operation) -> str:
        """
        Apply a single operation to content
        """
        if operation.type == OperationType.INSERT:
            position = min(operation.position, len(content))
            content_before = content[:position]
            content_after = content[position:]
            return content_before + (operation.content or "") + content_after

        elif operation.type == OperationType.DELETE:
            start = operation.position
            length = operation.length or 0
            end = min(start + length, len(content))
            return content[:start] + content[end:]

        elif operation.type == OperationType.RETAIN:
            # Retain doesn't change content
            return content

        return content

    @staticmethod
    def compose_operations(operation_a: Operation, operation_b: Operation) -> List[Operation]:
        """
        Compose two sequential operations into a single operation or sequence
        """
        # For simplicity, return both operations
        # In a full implementation, this would merge compatible operations
        return [operation_a, operation_b]

    @staticmethod
    def invert_operation(operation: Operation) -> Operation:
        """
        Create the inverse of an operation for undo functionality
        """
        if operation.type == OperationType.INSERT:
            return Operation(
                type=OperationType.DELETE,
                position=operation.position,
                length=len(operation.content or "")
            )
        elif operation.type == OperationType.DELETE:
            # Note: This assumes we have the deleted content stored
            # In practice, we'd need to store the deleted content
            return Operation(
                type=OperationType.INSERT,
                position=operation.position,
                content="[deleted content]"  # Placeholder
            )
        else:
            return operation