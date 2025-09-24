from fastapi import APIRouter
from app.api import products
from app.api import blog_posts
from app.api import categorys
from app.api import authors
from app.api.routes import (
    auth, auth_routes, users, projects, pages, components, roles, permissions, project_members,
    profile, security, activity_logs, audit_trails, assets, user_roles,
    workflow_types, workflow_states, workflow_templates, workflow_instances
)

api_router = APIRouter()
api_router.include_router(auth_routes.router, prefix="/auth", tags=["authentication"])
api_router.include_router(authors.router, prefix="/authors", tags=["authors"])
api_router.include_router(categorys.router, prefix="/categorys", tags=["categorys"])
api_router.include_router(blog_posts.router, prefix="/blog_posts", tags=["blog_posts"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(security.router, prefix="/security", tags=["security"])
api_router.include_router(activity_logs.router, prefix="/activity-logs", tags=["activity-logs"])
api_router.include_router(audit_trails.router, prefix="/audit-trails", tags=["audit-trails"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(pages.router, prefix="/pages", tags=["pages"])
api_router.include_router(components.router, prefix="/components", tags=["components"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(project_members.router, prefix="/project-members", tags=["project-members"])
api_router.include_router(assets.router, prefix="/assets", tags=["assets"])
api_router.include_router(user_roles.router, prefix="/user-roles", tags=["user-roles"])
api_router.include_router(workflow_types.router, prefix="/workflow-types", tags=["workflow-types"])
api_router.include_router(workflow_states.router, prefix="/workflow-states", tags=["workflow-states"])
api_router.include_router(workflow_templates.router, prefix="/workflow-templates", tags=["workflow-templates"])
api_router.include_router(workflow_instances.router, prefix="/workflow-instances", tags=["workflow-instances"])