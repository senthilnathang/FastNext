"""
Document versioning service for collaborative editing
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.operational_transform import Operation


@dataclass
class DocumentVersion:
    """Represents a version of a document"""
    version_id: str
    document_id: str
    content: str
    operations: List[Operation]
    created_by: str
    created_at: datetime
    parent_version: Optional[str] = None
    metadata: Dict[str, Any] = None


class DocumentVersioning:
    """
    Service for managing document versions and conflict resolution
    """

    # In-memory storage for versions (in production, use database)
    _versions: Dict[str, List[DocumentVersion]] = {}
    _current_content: Dict[str, str] = {}

    @staticmethod
    def create_version(
        document_id: str,
        content: str,
        operations: List[Operation],
        user: User,
        parent_version: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> DocumentVersion:
        """
        Create a new version of a document
        """
        version_id = f"{document_id}_v_{int(datetime.utcnow().timestamp() * 1000)}"

        version = DocumentVersion(
            version_id=version_id,
            document_id=document_id,
            content=content,
            operations=operations,
            created_by=str(user.id),
            created_at=datetime.utcnow(),
            parent_version=parent_version,
            metadata=metadata or {}
        )

        if document_id not in DocumentVersioning._versions:
            DocumentVersioning._versions[document_id] = []

        DocumentVersioning._versions[document_id].append(version)
        DocumentVersioning._current_content[document_id] = content

        return version

    @staticmethod
    def get_current_content(document_id: str) -> Optional[str]:
        """
        Get the current content of a document
        """
        return DocumentVersioning._current_content.get(document_id)

    @staticmethod
    def get_version_history(document_id: str, limit: int = 50) -> List[DocumentVersion]:
        """
        Get version history for a document
        """
        versions = DocumentVersioning._versions.get(document_id, [])
        return sorted(versions, key=lambda v: v.created_at, reverse=True)[:limit]

    @staticmethod
    def get_version(version_id: str) -> Optional[DocumentVersion]:
        """
        Get a specific version by ID
        """
        for versions in DocumentVersioning._versions.values():
            for version in versions:
                if version.version_id == version_id:
                    return version
        return None

    @staticmethod
    def revert_to_version(document_id: str, version_id: str, user: User) -> Optional[str]:
        """
        Revert document to a specific version
        """
        version = DocumentVersioning.get_version(version_id)
        if not version or version.document_id != document_id:
            return None

        # Create a new version with the reverted content
        DocumentVersioning.create_version(
            document_id=document_id,
            content=version.content,
            operations=[],  # Revert operation
            user=user,
            parent_version=version_id,
            metadata={"type": "revert", "reverted_from": version_id}
        )

        return version.content

    @staticmethod
    def apply_operation_with_conflict_resolution(
        document_id: str,
        operation: Operation,
        user: User,
        concurrent_operations: List[Operation]
    ) -> tuple[str, List[Operation]]:
        """
        Apply an operation with conflict resolution against concurrent operations

        Returns: (new_content, transformed_operations)
        """
        from app.services.operational_transform import OperationalTransform

        current_content = DocumentVersioning._current_content.get(document_id, "")

        # Transform the incoming operation against all concurrent operations
        transformed_operation = operation
        transformed_concurrent = []

        for concurrent_op in concurrent_operations:
            transformed_operation, transformed_concurrent_op = OperationalTransform.transform(
                transformed_operation, concurrent_op
            )
            transformed_concurrent.append(transformed_concurrent_op)

        # Apply the transformed operation
        new_content = OperationalTransform.apply_operation(current_content, transformed_operation)

        # Update current content
        DocumentVersioning._current_content[document_id] = new_content

        # Create version with all operations
        all_operations = [transformed_operation] + transformed_concurrent
        DocumentVersioning.create_version(
            document_id=document_id,
            content=new_content,
            operations=all_operations,
            user=user,
            metadata={"conflict_resolved": len(concurrent_operations) > 0}
        )

        return new_content, all_operations

    @staticmethod
    def get_conflicts(document_id: str) -> List[Dict[str, Any]]:
        """
        Get any outstanding conflicts for a document
        """
        # In a more sophisticated implementation, this would track unresolved conflicts
        return []

    @staticmethod
    def resolve_conflict(
        document_id: str,
        conflict_id: str,
        resolution: Operation,
        user: User
    ) -> bool:
        """
        Resolve a specific conflict
        """
        # Implementation would depend on conflict tracking mechanism
        return True