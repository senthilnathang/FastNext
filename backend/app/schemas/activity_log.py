from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ActivityLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ActivityAction(str, Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    IMPORT = "import"
    SHARE = "share"
    PERMISSION_CHANGE = "permission_change"


class ActivityLogBase(BaseModel):
    action: ActivityAction = Field(..., description="The action that was performed")
    entity_type: str = Field(..., max_length=100, description="Type of entity affected")
    entity_id: Optional[int] = Field(None, description="ID of the affected entity")
    entity_name: Optional[str] = Field(
        None, max_length=255, description="Name of the affected entity"
    )
    description: str = Field(..., description="Description of the activity")
    level: ActivityLevel = Field(
        default=ActivityLevel.INFO, description="Severity level of the activity"
    )
    extra_data: Optional[str] = Field(
        None, description="Additional metadata as JSON string"
    )


class ActivityLogCreate(ActivityLogBase):
    user_id: Optional[int] = Field(
        None, description="ID of the user who performed the action"
    )
    ip_address: Optional[str] = Field(
        None, max_length=45, description="IP address of the request"
    )
    user_agent: Optional[str] = Field(None, description="User agent of the request")
    request_method: Optional[str] = Field(
        None, max_length=10, description="HTTP method"
    )
    request_path: Optional[str] = Field(
        None, max_length=500, description="Request path"
    )
    status_code: Optional[int] = Field(None, description="HTTP status code")


class ActivityLogUpdate(BaseModel):
    description: Optional[str] = Field(None, description="Updated description")
    level: Optional[ActivityLevel] = Field(None, description="Updated severity level")
    extra_data: Optional[str] = Field(None, description="Updated metadata")


class ActivityLogResponse(ActivityLogBase):
    id: int
    user_id: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]
    request_method: Optional[str]
    request_path: Optional[str]
    status_code: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityLogFilter(BaseModel):
    user_id: Optional[int] = Field(None, description="Filter by user ID")
    action: Optional[ActivityAction] = Field(None, description="Filter by action type")
    entity_type: Optional[str] = Field(None, description="Filter by entity type")
    entity_id: Optional[int] = Field(None, description="Filter by entity ID")
    level: Optional[ActivityLevel] = Field(None, description="Filter by severity level")
    start_date: Optional[datetime] = Field(None, description="Filter from date")
    end_date: Optional[datetime] = Field(None, description="Filter to date")
    ip_address: Optional[str] = Field(None, description="Filter by IP address")


class ActivityLogStats(BaseModel):
    total_activities: int
    activities_by_action: Dict[str, int]
    activities_by_level: Dict[str, int]
    activities_by_entity_type: Dict[str, int]
    unique_users: int
    date_range: Dict[str, Optional[datetime]]
