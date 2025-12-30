"""SQLAlchemy models for FastVue framework"""

# Base models and mixins
from app.models.base import (
    # Core base models
    BaseModel,
    AuditableModel,
    SoftDeletableModel,
    FullFeaturedModel,
    ActiveModel,
    CompanyScopedModel,
    ActivityModel,
    MailThreadModel,
    FullAuditModel,
    EnterpriseModel,
    # Mixins
    TimestampMixin,
    SoftDeleteMixin,
    AuditMixin,
    MetadataMixin,
    ActiveMixin,
    CompanyScopedMixin,
    VersionMixin,
    ActivityMixin,
    MailThreadMixin,
    URLMixin,
    # Enums
    ActivityAction,
    MessageLevel,
)

# Domain models
from app.models.user import User
from app.models.company import Company
from app.models.group import Group, UserGroup, GroupPermission
from app.models.role import Role, SystemRole
from app.models.permission import Permission, PermissionCategory, PermissionAction
from app.models.user_company_role import UserCompanyRole, RolePermission
from app.models.social_account import SocialAccount, OAuthProvider
from app.models.audit import AuditLog, AuditAction
from app.models.notification import Notification, NotificationLevel
from app.models.activity_log import ActivityLog, ActivityCategory, ActivityLevel
from app.models.message import Message, MessageType
from app.models.rbac import ContentType, MenuItem, UserMenuPermission, GroupMenuPermission, AccessRule
from app.models.inbox import InboxItem, InboxItemType, InboxPriority
from app.models.label import Label, InboxItemLabel
from app.models.reaction import MessageReaction
from app.models.mention import Mention
from app.models.text_template import TextTemplate
from app.models.bookmark import Bookmark, BookmarkType
from app.models.attachment import Attachment
from app.models.read_receipt import MessageReadReceipt
from app.models.push_subscription import PushSubscription
from app.models.notification_preference import NotificationPreference, DigestFrequency
from app.models.messaging_config import MessagingConfig, MessagingScope
from app.models.conversation import Conversation, ConversationParticipant, ConversationMessage

# Security Models
from app.models.row_level_security import (
    RLSContext,
    RLSPolicy,
    RLSEntityType,
    RLSAuditLog,
    RLSAction,
)
from app.models.security_setting import SecuritySetting

__all__ = [
    # Base Models
    "BaseModel",
    "AuditableModel",
    "SoftDeletableModel",
    "FullFeaturedModel",
    "ActiveModel",
    "CompanyScopedModel",
    "ActivityModel",
    "MailThreadModel",
    "FullAuditModel",
    "EnterpriseModel",
    # Mixins
    "TimestampMixin",
    "SoftDeleteMixin",
    "AuditMixin",
    "MetadataMixin",
    "ActiveMixin",
    "CompanyScopedMixin",
    "VersionMixin",
    "ActivityMixin",
    "MailThreadMixin",
    "URLMixin",
    # Enums from base
    "ActivityAction",
    "MessageLevel",
    # User & Auth
    "User",
    "SocialAccount",
    "OAuthProvider",
    # Company & Organization
    "Company",
    "Group",
    "UserGroup",
    "GroupPermission",
    # RBAC
    "Role",
    "SystemRole",
    "Permission",
    "PermissionCategory",
    "PermissionAction",
    "UserCompanyRole",
    "RolePermission",
    # Audit & Activity
    "AuditLog",
    "AuditAction",
    "ActivityLog",
    "ActivityCategory",
    "ActivityLevel",
    # Notifications & Messages
    "Notification",
    "NotificationLevel",
    "Message",
    "MessageType",
    # RBAC Database Models
    "ContentType",
    "MenuItem",
    "UserMenuPermission",
    "GroupMenuPermission",
    "AccessRule",
    # Inbox
    "InboxItem",
    "InboxItemType",
    "InboxPriority",
    # Labels
    "Label",
    "InboxItemLabel",
    # Reactions
    "MessageReaction",
    # Mentions
    "Mention",
    # Text Templates
    "TextTemplate",
    # Bookmarks
    "Bookmark",
    "BookmarkType",
    # Attachments
    "Attachment",
    # Read Receipts
    "MessageReadReceipt",
    # Push Notifications
    "PushSubscription",
    # Notification Preferences
    "NotificationPreference",
    "DigestFrequency",
    # Messaging Config
    "MessagingConfig",
    "MessagingScope",
    # Conversations
    "Conversation",
    "ConversationParticipant",
    "ConversationMessage",
    # Security Models
    "RLSContext",
    "RLSPolicy",
    "RLSEntityType",
    "RLSAuditLog",
    "RLSAction",
    "SecuritySetting",
]

# Initialize activity tracking after all models are loaded
from app.db.base import ensure_activity_tracking
ensure_activity_tracking()
