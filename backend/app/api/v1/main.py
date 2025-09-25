"""
API v1 Router
Central router for all v1 API endpoints
"""
from fastapi import APIRouter

# Import v1 route modules
from . import (
    auth_routes, users, projects, pages, components, roles, permissions, 
    project_members, profile, security, activity_logs, audit_trails, 
    assets, user_roles, workflow_types, workflow_states, 
    workflow_templates, workflow_instances
)

# Import resource routes (move these to v1 structure later)
from app.api import products, blog_posts, categorys, authors, saless

# Create v1 router
v1_router = APIRouter(prefix="/v1")

# Authentication & User Management
v1_router.include_router(auth_routes.router, prefix="/auth", tags=["v1-auth"])
v1_router.include_router(users.router, prefix="/users", tags=["v1-users"])
v1_router.include_router(profile.router, prefix="/profile", tags=["v1-profile"])
v1_router.include_router(security.router, prefix="/security", tags=["v1-security"])

# Admin & Permissions
v1_router.include_router(roles.router, prefix="/roles", tags=["v1-roles"])
v1_router.include_router(permissions.router, prefix="/permissions", tags=["v1-permissions"])
v1_router.include_router(user_roles.router, prefix="/user-roles", tags=["v1-user-roles"])

# Project Management
v1_router.include_router(projects.router, prefix="/projects", tags=["v1-projects"])
v1_router.include_router(project_members.router, prefix="/project-members", tags=["v1-project-members"])

# Content Management
v1_router.include_router(pages.router, prefix="/pages", tags=["v1-pages"])
v1_router.include_router(components.router, prefix="/components", tags=["v1-components"])
v1_router.include_router(assets.router, prefix="/assets", tags=["v1-assets"])

# Workflow Management
v1_router.include_router(workflow_types.router, prefix="/workflow-types", tags=["v1-workflows"])
v1_router.include_router(workflow_states.router, prefix="/workflow-states", tags=["v1-workflows"])
v1_router.include_router(workflow_templates.router, prefix="/workflow-templates", tags=["v1-workflows"])
v1_router.include_router(workflow_instances.router, prefix="/workflow-instances", tags=["v1-workflows"])

# Business Resources (TODO: Move to v1 structure)
v1_router.include_router(products.router, prefix="/products", tags=["v1-products"])
v1_router.include_router(blog_posts.router, prefix="/blog-posts", tags=["v1-blog-posts"])
v1_router.include_router(categorys.router, prefix="/categories", tags=["v1-categories"])
v1_router.include_router(authors.router, prefix="/authors", tags=["v1-authors"])
v1_router.include_router(saless.router, prefix="/sales", tags=["v1-sales"])

# Audit & Monitoring
v1_router.include_router(activity_logs.router, prefix="/activity-logs", tags=["v1-audit"])
v1_router.include_router(audit_trails.router, prefix="/audit-trails", tags=["v1-audit"])