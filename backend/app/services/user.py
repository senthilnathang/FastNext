"""User service"""

from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models import User, UserCompanyRole, Company, Role
from app.schemas.user import UserCreate, UserUpdate
from app.services.base import BaseService


class UserService(BaseService[User]):
    """User business logic service"""

    def __init__(self, db: Session):
        super().__init__(db, User)

    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()

    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()

    def get_by_email_or_username(self, identifier: str) -> Optional[User]:
        """Get user by email or username"""
        return (
            self.db.query(User)
            .filter((User.email == identifier) | (User.username == identifier))
            .first()
        )

    def create_user(
        self,
        user_in: UserCreate,
        created_by: Optional[int] = None,
    ) -> User:
        """Create a new user"""
        user = User(
            email=user_in.email,
            username=user_in.username,
            full_name=user_in.full_name,
            hashed_password=get_password_hash(user_in.password),
            phone=user_in.phone,
            timezone=user_in.timezone,
            language=user_in.language,
            is_active=user_in.is_active,
            is_verified=user_in.is_verified,
            created_by=created_by,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def update_user(
        self,
        user: User,
        user_in: UserUpdate,
        updated_by: Optional[int] = None,
    ) -> User:
        """Update an existing user"""
        update_data = user_in.model_dump(exclude_unset=True)

        if updated_by:
            update_data["updated_by"] = updated_by

        for field, value in update_data.items():
            if hasattr(user, field):
                setattr(user, field, value)

        self.db.flush()
        return user

    def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> bool:
        """Change user password"""
        if not verify_password(current_password, user.hashed_password):
            return False

        user.hashed_password = get_password_hash(new_password)
        from datetime import datetime, timezone
        user.password_changed_at = datetime.now(timezone.utc)
        self.db.flush()
        return True

    def reset_password(self, user: User, new_password: str):
        """Reset user password (admin action)"""
        user.hashed_password = get_password_hash(new_password)
        from datetime import datetime, timezone
        user.password_changed_at = datetime.now(timezone.utc)
        user.must_change_password = True
        self.db.flush()

    def assign_to_company(
        self,
        user: User,
        company: Company,
        role: Role,
        is_default: bool = False,
        assigned_by: Optional[int] = None,
    ) -> UserCompanyRole:
        """Assign user to a company with a role"""
        # Check if already assigned
        existing = (
            self.db.query(UserCompanyRole)
            .filter(
                UserCompanyRole.user_id == user.id,
                UserCompanyRole.company_id == company.id,
            )
            .first()
        )

        if existing:
            # Update existing assignment
            existing.role_id = role.id
            existing.is_active = True
            if is_default:
                existing.is_default = True
        else:
            # Create new assignment
            existing = UserCompanyRole(
                user_id=user.id,
                company_id=company.id,
                role_id=role.id,
                is_default=is_default,
                assigned_by=assigned_by,
            )
            self.db.add(existing)

        # If this is the default, unset others
        if is_default:
            self.db.query(UserCompanyRole).filter(
                UserCompanyRole.user_id == user.id,
                UserCompanyRole.company_id != company.id,
            ).update({"is_default": False})

        self.db.flush()

        # Set current company if not set
        if not user.current_company_id:
            user.current_company_id = company.id
            self.db.flush()

        return existing

    def remove_from_company(self, user: User, company: Company) -> bool:
        """Remove user from a company"""
        assignment = (
            self.db.query(UserCompanyRole)
            .filter(
                UserCompanyRole.user_id == user.id,
                UserCompanyRole.company_id == company.id,
            )
            .first()
        )

        if assignment:
            self.db.delete(assignment)

            # Update current company if needed
            if user.current_company_id == company.id:
                # Find another company
                other = (
                    self.db.query(UserCompanyRole)
                    .filter(
                        UserCompanyRole.user_id == user.id,
                        UserCompanyRole.is_active == True,
                    )
                    .first()
                )
                user.current_company_id = other.company_id if other else None

            self.db.flush()
            return True

        return False

    def switch_company(self, user: User, company_id: int) -> bool:
        """Switch user's current company"""
        # Verify user has access to the company
        assignment = (
            self.db.query(UserCompanyRole)
            .filter(
                UserCompanyRole.user_id == user.id,
                UserCompanyRole.company_id == company_id,
                UserCompanyRole.is_active == True,
            )
            .first()
        )

        if not assignment:
            return False

        user.current_company_id = company_id
        self.db.flush()
        return True

    def get_user_companies(self, user: User) -> List[Company]:
        """Get all companies the user belongs to"""
        return [
            ucr.company
            for ucr in user.company_roles
            if ucr.is_active and ucr.company.is_active
        ]

    def get_users_by_company(
        self,
        company_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        """Get all users in a company"""
        return (
            self.db.query(User)
            .join(UserCompanyRole)
            .filter(
                UserCompanyRole.company_id == company_id,
                UserCompanyRole.is_active == True,
                User.is_active == True,
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
