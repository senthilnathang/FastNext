"""
Row Level Security (RLS) Schemas

Pydantic schemas for RLS-related API endpoints and data transfer.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator

from app.models.row_level_security import RLSPolicy, RLSAction, RLSEntityType


# Base Schemas

class RLSPolicyBase(BaseModel):
    """Base schema for RLS policies"""
    name: str = Field(..., max_length=255, description="Policy name")
    description: Optional[str] = Field(None, description="Policy description")
    entity_type: RLSEntityType = Field(..., description="Entity type")
    table_name: str = Field(..., max_length=100, description="Database table name")
    policy_type: RLSPolicy = Field(..., description="Policy type")
    action: RLSAction = Field(..., description="Action type")
    condition_column: Optional[str] = Field(None, max_length=100, description="Condition column")
    condition_value_source: Optional[str] = Field(None, max_length=100, description="Condition value source")
    custom_condition: Optional[str] = Field(None, description="Custom SQL condition")
    required_roles: Optional[List[str]] = Field(None, description="Required roles")
    required_permissions: Optional[List[str]] = Field(None, description="Required permissions")
    priority: int = Field(100, ge=1, le=1000, description="Policy priority")
    organization_id: Optional[int] = Field(None, description="Organization ID")


class RLSPolicyCreate(RLSPolicyBase):
    """Schema for creating RLS policies"""
    is_active: bool = Field(True, description="Whether policy is active")


class RLSPolicyUpdate(BaseModel):
    """Schema for updating RLS policies"""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    policy_type: Optional[RLSPolicy] = None
    action: Optional[RLSAction] = None
    condition_column: Optional[str] = Field(None, max_length=100)
    condition_value_source: Optional[str] = Field(None, max_length=100)
    custom_condition: Optional[str] = None
    required_roles: Optional[List[str]] = None
    required_permissions: Optional[List[str]] = None
    priority: Optional[int] = Field(None, ge=1, le=1000)
    is_active: Optional[bool] = None


class RLSPolicyResponse(RLSPolicyBase):
    """Schema for RLS policy responses"""
    id: int
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Rule Assignment Schemas

class RLSRuleAssignmentBase(BaseModel):
    """Base schema for RLS rule assignments"""
    policy_id: int = Field(..., description="Policy ID")
    entity_type: RLSEntityType = Field(..., description="Entity type")
    entity_id: Optional[int] = Field(None, description="Specific entity ID")
    user_id: Optional[int] = Field(None, description="Specific user ID")
    role_id: Optional[int] = Field(None, description="Specific role ID")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Additional conditions")


class RLSRuleAssignmentCreate(RLSRuleAssignmentBase):
    """Schema for creating RLS rule assignments"""
    is_active: bool = Field(True, description="Whether assignment is active")
    
    @validator('*')
    def validate_assignment_target(cls, v, values):
        """Ensure at least one target is specified"""
        if 'user_id' in values and 'role_id' in values and 'entity_id' in values:
            if not any([values.get('user_id'), values.get('role_id'), values.get('entity_id')]):
                raise ValueError("At least one of user_id, role_id, or entity_id must be specified")
        return v


class RLSRuleAssignmentResponse(RLSRuleAssignmentBase):
    """Schema for RLS rule assignment responses"""
    id: int
    is_active: bool
    created_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Context Schemas

class RLSContextResponse(BaseModel):
    """Schema for RLS context responses"""
    id: int
    session_id: str
    user_id: int
    organization_id: Optional[int]
    tenant_id: Optional[str]
    project_ids: Optional[List[int]]
    roles: Optional[List[str]]
    permissions: Optional[List[str]]
    context_data: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Access Check Schemas

class RLSAccessCheckRequest(BaseModel):
    """Schema for access check requests"""
    entity_type: RLSEntityType = Field(..., description="Entity type")
    action: RLSAction = Field(..., description="Action to check")
    entity_id: Optional[int] = Field(None, description="Specific entity ID")
    table_name: Optional[str] = Field(None, description="Table name")


class RLSAccessCheckResponse(BaseModel):
    """Schema for access check responses"""
    access_granted: bool = Field(..., description="Whether access is granted")
    denial_reason: Optional[str] = Field(None, description="Reason for denial if access denied")
    entity_type: RLSEntityType
    action: RLSAction
    entity_id: Optional[int]
    checked_at: datetime


# Audit Log Schemas

class RLSAuditLogResponse(BaseModel):
    """Schema for RLS audit log responses"""
    id: int
    request_id: Optional[str]
    session_id: Optional[str]
    user_id: Optional[int]
    policy_id: Optional[int]
    entity_type: RLSEntityType
    entity_id: Optional[int]
    action: RLSAction
    access_granted: bool
    denial_reason: Optional[str]
    table_name: Optional[str]
    applied_conditions: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    request_method: Optional[str]
    request_path: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Organization Schemas

class OrganizationBase(BaseModel):
    """Base schema for organizations"""
    name: str = Field(..., max_length=255, description="Organization name")
    slug: str = Field(..., max_length=100, description="Organization slug")
    description: Optional[str] = Field(None, description="Organization description")
    settings: Optional[Dict[str, Any]] = Field(None, description="Organization settings")
    rls_enabled: bool = Field(True, description="Whether RLS is enabled")


class OrganizationCreate(OrganizationBase):
    """Schema for creating organizations"""
    
    @validator('slug')
    def validate_slug(cls, v):
        """Validate organization slug format"""
        import re
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return v


class OrganizationUpdate(BaseModel):
    """Schema for updating organizations"""
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    rls_enabled: Optional[bool] = None
    is_active: Optional[bool] = None


class OrganizationResponse(OrganizationBase):
    """Schema for organization responses"""
    id: int
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class OrganizationMemberResponse(BaseModel):
    """Schema for organization member responses"""
    id: int
    organization_id: int
    user_id: int
    role: str
    is_active: bool
    joined_at: datetime
    
    class Config:
        from_attributes = True


# Policy Application Schemas

class RLSPolicyApplication(BaseModel):
    """Schema for applying RLS policies to entities"""
    policy_id: int
    entity_type: RLSEntityType
    entity_ids: List[int] = Field(..., description="List of entity IDs to apply policy to")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Additional conditions")


class RLSPolicyApplicationResponse(BaseModel):
    """Schema for policy application responses"""
    policy_id: int
    entity_type: RLSEntityType
    applied_count: int
    failed_count: int
    errors: List[str] = Field(default_factory=list)


# Bulk Operations Schemas

class RLSBulkPolicyCreate(BaseModel):
    """Schema for bulk policy creation"""
    policies: List[RLSPolicyCreate] = Field(..., description="List of policies to create")
    apply_immediately: bool = Field(True, description="Whether to apply policies immediately")


class RLSBulkPolicyResponse(BaseModel):
    """Schema for bulk policy creation response"""
    created_count: int
    failed_count: int
    created_policies: List[RLSPolicyResponse] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


# Analysis Schemas

class RLSPolicyAnalysis(BaseModel):
    """Schema for RLS policy analysis"""
    policy_id: int
    entity_count: int = Field(..., description="Number of entities affected")
    user_count: int = Field(..., description="Number of users affected")
    potential_conflicts: List[str] = Field(default_factory=list)
    performance_impact: str = Field(..., description="Estimated performance impact")
    recommendations: List[str] = Field(default_factory=list)


class RLSSecurityAnalysis(BaseModel):
    """Schema for RLS security analysis"""
    total_policies: int
    active_policies: int
    coverage_percentage: float = Field(..., description="Percentage of entities covered by RLS")
    security_gaps: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    risk_level: str = Field(..., description="Overall security risk level")


# Configuration Schemas

class RLSConfiguration(BaseModel):
    """Schema for RLS configuration"""
    enabled: bool = Field(True, description="Whether RLS is globally enabled")
    default_policy: RLSPolicy = Field(RLSPolicy.OWNER_ONLY, description="Default policy for new entities")
    audit_enabled: bool = Field(True, description="Whether audit logging is enabled")
    cache_enabled: bool = Field(True, description="Whether RLS caching is enabled")
    cache_ttl_seconds: int = Field(300, ge=0, description="Cache TTL in seconds")
    strict_mode: bool = Field(False, description="Whether to use strict mode (deny by default)")
    
    class Config:
        use_enum_values = True


class RLSConfigurationResponse(RLSConfiguration):
    """Schema for RLS configuration responses"""
    updated_by: int
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Statistics Schemas

class RLSStatistics(BaseModel):
    """Schema for RLS statistics"""
    total_policies: int
    active_policies: int
    total_audit_logs: int
    access_attempts_today: int
    access_denied_today: int
    top_entities: List[Dict[str, Any]] = Field(default_factory=list)
    top_users: List[Dict[str, Any]] = Field(default_factory=list)
    recent_violations: List[Dict[str, Any]] = Field(default_factory=list)


# Import/Export Schemas

class RLSExportRequest(BaseModel):
    """Schema for RLS export requests"""
    include_policies: bool = Field(True, description="Include policies in export")
    include_assignments: bool = Field(True, description="Include rule assignments in export")
    include_audit_logs: bool = Field(False, description="Include audit logs in export")
    organization_id: Optional[int] = Field(None, description="Filter by organization")
    entity_types: Optional[List[RLSEntityType]] = Field(None, description="Filter by entity types")
    from_date: Optional[datetime] = Field(None, description="Export data from this date")
    to_date: Optional[datetime] = Field(None, description="Export data to this date")


class RLSImportRequest(BaseModel):
    """Schema for RLS import requests"""
    data: Dict[str, Any] = Field(..., description="RLS data to import")
    overwrite_existing: bool = Field(False, description="Whether to overwrite existing policies")
    validate_only: bool = Field(False, description="Only validate without importing")


class RLSImportResponse(BaseModel):
    """Schema for RLS import responses"""
    imported_policies: int
    imported_assignments: int
    skipped_items: int
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)