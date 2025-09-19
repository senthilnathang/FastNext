from fastapi import APIRouter
from app.api.routes import (
    auth, auth_routes, users, projects, pages, components, roles, permissions, project_members,
    profile, security, activity_logs, audit_trails
)

api_router = APIRouter()
api_router.include_router(auth_routes.router, prefix="/auth", tags=["authentication"])
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