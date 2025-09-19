from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime


class AuditTrailBase(BaseModel):
    entity_type: str = Field(..., max_length=100, description="Type of entity being audited")
    entity_id: int = Field(..., description="ID of the audited entity")
    entity_name: Optional[str] = Field(None, max_length=255, description="Name of the audited entity")
    operation: str = Field(..., max_length=50, description="Operation performed (INSERT, UPDATE, DELETE)")
    reason: Optional[str] = Field(None, description="Reason for the change")


class AuditTrailCreate(AuditTrailBase):
    user_id: Optional[int] = Field(None, description="ID of the user who made the change")
    old_values: Optional[str] = Field(None, description="Previous values as JSON string")
    new_values: Optional[str] = Field(None, description="New values as JSON string")
    changed_fields: Optional[str] = Field(None, description="Changed fields as JSON array")
    ip_address: Optional[str] = Field(None, max_length=45, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    session_id: Optional[str] = Field(None, max_length=255, description="Session ID")
    extra_data: Optional[str] = Field(None, description="Additional metadata as JSON string")


class AuditTrailUpdate(BaseModel):
    reason: Optional[str] = Field(None, description="Updated reason for the change")
    extra_data: Optional[str] = Field(None, description="Updated metadata")


class AuditTrailResponse(AuditTrailBase):
    id: int
    user_id: Optional[int]
    old_values: Optional[str]
    new_values: Optional[str]
    changed_fields: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    session_id: Optional[str]
    extra_data: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuditTrailFilter(BaseModel):
    user_id: Optional[int] = Field(None, description="Filter by user ID")
    entity_type: Optional[str] = Field(None, description="Filter by entity type")
    entity_id: Optional[int] = Field(None, description="Filter by entity ID")
    operation: Optional[str] = Field(None, description="Filter by operation type")
    start_date: Optional[datetime] = Field(None, description="Filter from date")
    end_date: Optional[datetime] = Field(None, description="Filter to date")
    changed_fields_contain: Optional[str] = Field(None, description="Filter by field name")


class AuditTrailStats(BaseModel):
    total_changes: int
    changes_by_operation: Dict[str, int]
    changes_by_entity_type: Dict[str, int]
    changes_by_user: Dict[str, int]
    unique_entities: int
    date_range: Dict[str, Optional[datetime]]


class AuditTrailComparison(BaseModel):
    """Model for comparing old and new values in a structured way"""
    field_name: str
    old_value: Optional[Any]
    new_value: Optional[Any]
    change_type: str  # 'added', 'modified', 'removed'