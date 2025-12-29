"""API v1 routes"""

from fastapi import APIRouter

from app.api.v1 import (
    auth,
    users,
    companies,
    roles,
    permissions,
    groups,
    notifications,
    rbac,
    activity,
    messages,
    inbox,
    reactions,
    templates,
    bookmarks,
    labels,
    attachments,
    ws,
    push,
    notification_preferences,
    messaging_config,
    conversations,
    modules,
    # Security endpoints
    security,
    rls,
    acls,
    csp,
)

# Import module routers
from modules.marketplace import router as marketplace_router
from modules.crm.api import router as crm_router

api_router = APIRouter()

# Include all routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(companies.router, prefix="/companies", tags=["Companies"])
api_router.include_router(roles.router, prefix="/roles", tags=["Roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["Permissions"])
api_router.include_router(groups.router, prefix="/groups", tags=["Groups"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(rbac.router, tags=["RBAC"])
api_router.include_router(activity.router, prefix="/activity-logs", tags=["Activity Logs"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])
api_router.include_router(inbox.router, prefix="/inbox", tags=["Inbox"])
api_router.include_router(reactions.router, prefix="/messages", tags=["Reactions"])
api_router.include_router(templates.router, prefix="/templates", tags=["Templates"])
api_router.include_router(bookmarks.router, prefix="/bookmarks", tags=["Bookmarks"])
api_router.include_router(labels.router, prefix="/labels", tags=["Labels"])
api_router.include_router(attachments.router, prefix="/attachments", tags=["Attachments"])
api_router.include_router(ws.router, tags=["WebSocket"])
api_router.include_router(push.router, prefix="/push", tags=["Push Notifications"])
api_router.include_router(notification_preferences.router, prefix="/notification-preferences", tags=["Notification Preferences"])
api_router.include_router(messaging_config.router, prefix="/messaging-config", tags=["Messaging Config"])
api_router.include_router(conversations.router, tags=["Conversations"])
api_router.include_router(modules.router, tags=["Modules"])
api_router.include_router(marketplace_router, tags=["Marketplace"])
api_router.include_router(crm_router, tags=["CRM"])

# Security routes
api_router.include_router(security.router, prefix="/security", tags=["Security"])
api_router.include_router(rls.router, prefix="/rls", tags=["Row-Level Security"])
api_router.include_router(acls.router, prefix="/acls", tags=["Access Control Lists"])
api_router.include_router(csp.router, prefix="/csp", tags=["Content Security Policy"])
