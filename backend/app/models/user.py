from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Status fields
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    
    # Security fields
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Profile fields
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)

    # Relationships
    projects = relationship("Project", back_populates="owner")
    user_roles = relationship("UserRole", foreign_keys="UserRole.user_id", back_populates="user")
    project_memberships = relationship("ProjectMember", foreign_keys="ProjectMember.user_id", back_populates="user")
    
    # Workflow relationships
    created_workflow_types = relationship("WorkflowType", foreign_keys="WorkflowType.created_by", back_populates="creator")
    created_workflow_templates = relationship("WorkflowTemplate", foreign_keys="WorkflowTemplate.created_by", back_populates="creator")
    created_workflow_instances = relationship("WorkflowInstance", foreign_keys="WorkflowInstance.created_by", back_populates="creator")
    assigned_workflow_instances = relationship("WorkflowInstance", foreign_keys="WorkflowInstance.assigned_to", back_populates="assigned_user")
    workflow_history = relationship("WorkflowHistory", foreign_keys="WorkflowHistory.user_id", back_populates="user")
    
    def is_locked(self) -> bool:
        """Check if account is locked due to failed login attempts"""
        if not self.locked_until:
            return False
        return datetime.utcnow() < self.locked_until.replace(tzinfo=None)
    
    def reset_failed_attempts(self) -> None:
        """Reset failed login attempts and unlock account"""
        self.failed_login_attempts = 0
        self.locked_until = None