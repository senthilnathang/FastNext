from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
from enum import Enum as PyEnum
from typing import Dict, Any, Optional


class RLSPolicy(str, PyEnum):
    """Row Level Security Policy Types"""
    OWNER_ONLY = "owner_only"                    # Only the owner can access
    ORGANIZATION_MEMBER = "organization_member"  # Organization members can access
    PROJECT_MEMBER = "project_member"           # Project members can access
    ROLE_BASED = "role_based"                   # Based on user roles
    CONDITIONAL = "conditional"                 # Custom conditions
    PUBLIC = "public"                          # Public access
    TENANT_ISOLATED = "tenant_isolated"        # Multi-tenant isolation


class RLSAction(str, PyEnum):
    """Actions that can be controlled by RLS"""
    SELECT = "select"      # Read access
    INSERT = "insert"      # Create access
    UPDATE = "update"      # Modify access
    DELETE = "delete"      # Delete access
    ALL = "all"           # All actions


class RLSEntityType(str, PyEnum):
    """Types of entities that can have RLS policies"""
    PROJECT = "project"
    PAGE = "page"
    COMPONENT = "component"
    USER = "user"
    ASSET = "asset"
    ROLE = "role"
    PERMISSION = "permission"
    ORGANIZATION = "organization"
    CUSTOM = "custom"


class RowLevelSecurityPolicy(Base):
    """
    Defines row-level security policies for different entities
    """
    __tablename__ = "rls_policies"

    id = Column(Integer, primary_key=True, index=True)
    
    # Policy identification
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    
    # Entity and table configuration
    entity_type = Column(Enum(RLSEntityType), nullable=False, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    
    # Policy configuration
    policy_type = Column(Enum(RLSPolicy), nullable=False, index=True)
    action = Column(Enum(RLSAction), nullable=False, index=True)
    
    # Condition configuration
    condition_column = Column(String(100), nullable=True)  # Column to check (e.g., 'user_id', 'organization_id')
    condition_value_source = Column(String(100), nullable=True)  # Source of value (e.g., 'current_user.id', 'session.tenant_id')
    
    # Advanced configuration
    custom_condition = Column(Text, nullable=True)  # Custom SQL condition
    required_roles = Column(JSON, nullable=True)   # Required roles for access
    required_permissions = Column(JSON, nullable=True)  # Required permissions
    
    # Policy metadata
    is_active = Column(Boolean, default=True, nullable=False)
    priority = Column(Integer, default=100, nullable=False)  # Higher priority = applied first
    
    # Organizational context
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    
    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    organization = relationship("Organization", foreign_keys=[organization_id])
    rule_assignments = relationship("RLSRuleAssignment", back_populates="policy")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert policy to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'entity_type': self.entity_type.value if self.entity_type else None,
            'table_name': self.table_name,
            'policy_type': self.policy_type.value if self.policy_type else None,
            'action': self.action.value if self.action else None,
            'condition_column': self.condition_column,
            'condition_value_source': self.condition_value_source,
            'custom_condition': self.custom_condition,
            'required_roles': self.required_roles,
            'required_permissions': self.required_permissions,
            'is_active': self.is_active,
            'priority': self.priority,
            'organization_id': self.organization_id,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class RLSRuleAssignment(Base):
    """
    Assigns RLS policies to specific entities or users
    """
    __tablename__ = "rls_rule_assignments"

    id = Column(Integer, primary_key=True, index=True)
    
    # Policy reference
    policy_id = Column(Integer, ForeignKey("rls_policies.id"), nullable=False, index=True)
    
    # Assignment target
    entity_type = Column(Enum(RLSEntityType), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True, index=True)  # Specific entity ID (null = applies to all)
    
    # User/Role specific assignments
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True, index=True)
    
    # Assignment metadata
    is_active = Column(Boolean, default=True, nullable=False)
    conditions = Column(JSON, nullable=True)  # Additional conditions
    
    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    policy = relationship("RowLevelSecurityPolicy", back_populates="rule_assignments")
    user = relationship("User", foreign_keys=[user_id])
    role = relationship("Role", foreign_keys=[role_id])
    creator = relationship("User", foreign_keys=[created_by])


class RLSContext(Base):
    """
    Stores RLS context for current session/request
    """
    __tablename__ = "rls_contexts"

    id = Column(Integer, primary_key=True, index=True)
    
    # Session identification
    session_id = Column(String(255), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Context data
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    tenant_id = Column(String(100), nullable=True, index=True)
    project_ids = Column(JSON, nullable=True)  # Accessible project IDs
    roles = Column(JSON, nullable=True)        # User roles
    permissions = Column(JSON, nullable=True)  # User permissions
    
    # Additional context
    context_data = Column(JSON, nullable=True)  # Additional context variables
    
    # Metadata
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    organization = relationship("Organization", foreign_keys=[organization_id])


class RLSAuditLog(Base):
    """
    Audit log for RLS policy enforcement and violations
    """
    __tablename__ = "rls_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Request identification
    request_id = Column(String(255), nullable=True, index=True)
    session_id = Column(String(255), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # RLS details
    policy_id = Column(Integer, ForeignKey("rls_policies.id"), nullable=True, index=True)
    entity_type = Column(Enum(RLSEntityType), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    action = Column(Enum(RLSAction), nullable=False, index=True)
    
    # Access result
    access_granted = Column(Boolean, nullable=False, index=True)
    denial_reason = Column(Text, nullable=True)
    
    # Request details
    table_name = Column(String(100), nullable=True)
    sql_query = Column(Text, nullable=True)
    applied_conditions = Column(JSON, nullable=True)
    
    # Context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    policy = relationship("RowLevelSecurityPolicy", foreign_keys=[policy_id])
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert audit log to dictionary"""
        return {
            'id': self.id,
            'request_id': self.request_id,
            'session_id': self.session_id,
            'user_id': self.user_id,
            'policy_id': self.policy_id,
            'entity_type': self.entity_type.value if self.entity_type else None,
            'entity_id': self.entity_id,
            'action': self.action.value if self.action else None,
            'access_granted': self.access_granted,
            'denial_reason': self.denial_reason,
            'table_name': self.table_name,
            'applied_conditions': self.applied_conditions,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'request_method': self.request_method,
            'request_path': self.request_path,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# Organization model for multi-tenancy support
class Organization(Base):
    """
    Organization model for multi-tenant RLS support
    """
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Organization details
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Configuration
    settings = Column(JSON, nullable=True)
    rls_enabled = Column(Boolean, default=True, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("OrganizationMember", back_populates="organization")
    rls_policies = relationship("RowLevelSecurityPolicy", back_populates="organization")
    rls_contexts = relationship("RLSContext", back_populates="organization")


class OrganizationMember(Base):
    """
    Organization membership for RLS context
    """
    __tablename__ = "organization_members"

    id = Column(Integer, primary_key=True, index=True)
    
    # Membership details
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(50), nullable=False, default="member")
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    creator = relationship("User", foreign_keys=[created_by])
    
    # Unique constraint
    __table_args__ = (
        {"sqlite_autoincrement": True},
    )