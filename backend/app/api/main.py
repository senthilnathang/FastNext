"""
Main API Router
Aggregates all API versions and routes
"""

from app.api.v1.main import v1_router
from fastapi import APIRouter

# Create main API router
api_router = APIRouter()

# Include versioned routers
api_router.include_router(v1_router, tags=["v1"])

# Include GraphQL router (mock implementation)
try:
    from app.graphql.schema import graphql_router

    api_router.include_router(graphql_router, prefix="/graphql", tags=["GraphQL"])
except ImportError:
    # Fallback to mock GraphQL implementation
    from app.graphql.mock_schema import mock_graphql_router

    api_router.include_router(mock_graphql_router, prefix="/graphql", tags=["GraphQL"])


# Health check endpoint at API root
@api_router.get("/health")
async def health_check():
    """API health check endpoint"""
    return {
        "status": "healthy",
        "message": "FastNext API is running",
        "version": "1.0.0",
    }
