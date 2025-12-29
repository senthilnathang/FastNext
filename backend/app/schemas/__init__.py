"""Pydantic schemas for request/response validation"""

from app.schemas.user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserInDB,
    UserWithRoles,
)
from app.schemas.company import (
    CompanyBase,
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse,
)
from app.schemas.role import (
    RoleBase,
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    RoleWithPermissions,
)
from app.schemas.permission import (
    PermissionBase,
    PermissionCreate,
    PermissionResponse,
)
from app.schemas.group import (
    GroupBase,
    GroupCreate,
    GroupUpdate,
    GroupResponse,
)
from app.schemas.token import (
    Token,
    TokenPayload,
    TokenData,
)
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    TwoFactorSetup,
    TwoFactorVerify,
    PasswordReset,
    PasswordChange,
)
from app.schemas.notification import (
    NotificationBase,
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
    NotificationList,
    BulkReadRequest,
    BulkReadResponse,
    SendNotificationRequest,
    SendNotificationResponse,
    NotificationStats,
)
from app.schemas.label import (
    LabelBase,
    LabelCreate,
    LabelUpdate,
    LabelResponse,
    LabelListResponse,
    LabelSummary,
    AddLabelsRequest,
    RemoveLabelsRequest,
    BulkLabelRequest,
)

__all__ = [
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserInDB",
    "UserWithRoles",
    # Company
    "CompanyBase",
    "CompanyCreate",
    "CompanyUpdate",
    "CompanyResponse",
    # Role
    "RoleBase",
    "RoleCreate",
    "RoleUpdate",
    "RoleResponse",
    "RoleWithPermissions",
    # Permission
    "PermissionBase",
    "PermissionCreate",
    "PermissionResponse",
    # Group
    "GroupBase",
    "GroupCreate",
    "GroupUpdate",
    "GroupResponse",
    # Token
    "Token",
    "TokenPayload",
    "TokenData",
    # Auth
    "LoginRequest",
    "LoginResponse",
    "TwoFactorSetup",
    "TwoFactorVerify",
    "PasswordReset",
    "PasswordChange",
    # Notification
    "NotificationBase",
    "NotificationCreate",
    "NotificationUpdate",
    "NotificationResponse",
    "NotificationList",
    "BulkReadRequest",
    "BulkReadResponse",
    "SendNotificationRequest",
    "SendNotificationResponse",
    "NotificationStats",
    # Label
    "LabelBase",
    "LabelCreate",
    "LabelUpdate",
    "LabelResponse",
    "LabelListResponse",
    "LabelSummary",
    "AddLabelsRequest",
    "RemoveLabelsRequest",
    "BulkLabelRequest",
]
