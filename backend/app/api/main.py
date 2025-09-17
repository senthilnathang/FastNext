from fastapi import APIRouter
from app.api.routes import auth, users, projects, pages, components, roles, permissions, project_members

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(pages.router, prefix="/pages", tags=["pages"])
api_router.include_router(components.router, prefix="/components", tags=["components"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(project_members.router, prefix="/project-members", tags=["project-members"])