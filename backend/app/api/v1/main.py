"""
API v1 Router
Central router for all v1 API endpoints
"""

# Import resource routes (move these to v1 structure later)
from app.api import saless
from . import authors, blog_posts, categorys, products
from fastapi import APIRouter

# Import v1 route modules
from . import (
    acls,
    activity_logs,
    assets,
    audit_trails,
    auth_routes,
    cache_management,
    collaboration,
    components,
    conversations,
    csp,
    data_import_export,
    database_performance,
    events,
    inbox,
    messages,
    notifications,
    pages,
    permissions,
    profile,
    project_members,
    projects,
    projects_rls,
    reactions,
    rls,
    roles,
    scaling_health,
    security,
    user_roles,
    users,
    workflow_instances,
    workflow_states,
    workflow_templates,
    workflow_types,
)

# Create v1 router
v1_router = APIRouter()

# Authentication & User Management
v1_router.include_router(auth_routes.router, prefix="/auth", tags=["v1-auth"])
v1_router.include_router(users.router, prefix="/users", tags=["v1-users"])
v1_router.include_router(profile.router, prefix="/profile", tags=["v1-profile"])
v1_router.include_router(security.router, prefix="/security", tags=["v1-security"])
v1_router.include_router(notifications.router, prefix="/notifications", tags=["v1-notifications"])

# Content Security Policy
v1_router.include_router(csp.router, prefix="/csp", tags=["v1-csp"])

# Admin & Permissions
v1_router.include_router(roles.router, prefix="/roles", tags=["v1-roles"])
v1_router.include_router(
    permissions.router, prefix="/permissions", tags=["v1-permissions"]
)
v1_router.include_router(
    user_roles.router, prefix="/user-roles", tags=["v1-user-roles"]
)
v1_router.include_router(acls.router, prefix="/acls", tags=["v1-acls"])

# Project Management
v1_router.include_router(projects.router, prefix="/projects", tags=["v1-projects"])
v1_router.include_router(
    project_members.router, prefix="/project-members", tags=["v1-project-members"]
)

# Content Management
v1_router.include_router(pages.router, prefix="/pages", tags=["v1-pages"])
v1_router.include_router(
    components.router, prefix="/components", tags=["v1-components"]
)
v1_router.include_router(assets.router, prefix="/assets", tags=["v1-assets"])

# Workflow Management
v1_router.include_router(
    workflow_types.router, prefix="/workflow-types", tags=["v1-workflows"]
)
v1_router.include_router(
    workflow_states.router, prefix="/workflow-states", tags=["v1-workflows"]
)
v1_router.include_router(
    workflow_templates.router, prefix="/workflow-templates", tags=["v1-workflows"]
)
v1_router.include_router(
    workflow_instances.router, prefix="/workflow-instances", tags=["v1-workflows"]
)

# Business Resources (TODO: Move to v1 structure)
v1_router.include_router(products.router, prefix="/products", tags=["v1-products"])
v1_router.include_router(
    blog_posts.router, prefix="/blog-posts", tags=["v1-blog-posts"]
)
v1_router.include_router(categorys.router, prefix="/categories", tags=["v1-categories"])
v1_router.include_router(authors.router, prefix="/authors", tags=["v1-authors"])
v1_router.include_router(saless.router, prefix="/sales", tags=["v1-sales"])

# Audit & Monitoring
v1_router.include_router(
    activity_logs.router, prefix="/activity-logs", tags=["v1-audit"]
)
v1_router.include_router(audit_trails.router, prefix="/audit-trails", tags=["v1-audit"])
v1_router.include_router(events.router, tags=["v1-events"])
v1_router.include_router(
    collaboration.router, prefix="/collaboration", tags=["v1-collaboration"]
)

# Data Import/Export
v1_router.include_router(
    data_import_export.router, prefix="/data", tags=["v1-data-import-export"]
)



# Row Level Security
v1_router.include_router(rls.router, prefix="/rls", tags=["v1-rls"])

# RLS-Enhanced Endpoints (Examples)
v1_router.include_router(
    projects_rls.router, prefix="/projects-rls", tags=["v1-projects-rls"]
)

# Performance & Caching
v1_router.include_router(
    database_performance.router, prefix="/database", tags=["v1-performance"]
)
v1_router.include_router(cache_management.router, prefix="/cache", tags=["v1-cache"])

# Horizontal Scaling & Health
v1_router.include_router(scaling_health.router, prefix="/scaling", tags=["v1-scaling"])

# Messaging System
v1_router.include_router(messages.router, tags=["v1-messages"])
v1_router.include_router(conversations.router, tags=["v1-conversations"])
v1_router.include_router(reactions.router, tags=["v1-reactions"])

# Unified Inbox
v1_router.include_router(inbox.router, tags=["v1-inbox"])
