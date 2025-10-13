from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class PasswordHistory(Base):
    __tablename__ = "password_history"

    id = Column(Integer, primary_key=True, index=True)

    # User this history belongs to
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Hashed password
    hashed_password = Column(String(255), nullable=False)

    # When this password was set
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<PasswordHistory(user_id={self.user_id}, created_at={self.created_at})>"