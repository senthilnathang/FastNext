from typing import Any, Dict, List, Optional

from app.models.author import Author
from app.models.user import User
from app.schemas.author import AuthorCreate, AuthorUpdate
from app.services.permission_service import PermissionService
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload


class AuthorService:
    """Business logic service for Author"""

    def __init__(self, db: Session):
        self.db = db

    def get_author_by_id(self, author_id: int, user: User) -> Author:
        """Get author by ID with permission check"""
        author = self.db.query(Author).filter(Author.id == author_id).first()

        if not author:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Author not found"
            )

        # Check permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "read", "author", author.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
            )

        return author

    def create_author(self, author_data: AuthorCreate, user: User) -> Author:
        """Create new author with business logic"""
        # Check creation permissions
        if not PermissionService.check_permission(self.db, user.id, "create", "author"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to create author",
            )

        # Create the author
        author_dict = author_data.model_dump()

        # Add owner information if applicable
        if hasattr(Author, "user_id"):
            author_dict["user_id"] = user.id

        author = Author(**author_dict)
        self.db.add(author)
        self.db.commit()
        self.db.refresh(author)

        return author

    def update_author(
        self, author_id: int, author_data: AuthorUpdate, user: User
    ) -> Author:
        """Update author with business logic"""
        author = self.get_author_by_id(author_id, user)

        # Check update permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "update", "author", author.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to update this author",
            )

        # Update fields
        update_data = author_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(author, field, value)

        self.db.commit()
        self.db.refresh(author)

        return author

    def delete_author(self, author_id: int, user: User) -> bool:
        """Delete author with business logic"""
        author = self.get_author_by_id(author_id, user)

        # Check delete permissions
        if not PermissionService.check_resource_permission(
            self.db, user.id, "delete", "author", author.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to delete this author",
            )

        # Hard delete
        self.db.delete(author)
        self.db.commit()

        return True

    def list_authors(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        user: User = None,
    ) -> List[Author]:
        """Get list of authors with filtering"""
        query = self.db.query(Author)

        # Apply soft delete filter if applicable

        # Apply search if provided
        if search:
            # Search across searchable fields
            query = query.filter(
                db.or_(
                    Author.name.ilike(f"%{search}%"),
                    Author.description.ilike(f"%{search}%"),
                )
            )

        # Apply pagination
        authors = query.offset(skip).limit(limit).all()

        return authors
