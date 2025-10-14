from typing import Optional

import strawberry
from app.auth.deps import get_current_user_optional
from app.db.session import get_db
from app.graphql.context import GraphQLContext
from app.graphql.mutations import Mutation
from app.graphql.resolvers import Query
from app.models.user import User
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from strawberry.fastapi import GraphQLRouter


async def get_context(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
) -> GraphQLContext:
    """Create GraphQL context with request, database session, user, and dataloaders"""
    context = GraphQLContext(request=request, db=db, user=user)

    # Create DataLoaders for this request
    # Note: DataLoaders are per-request to ensure proper batching
    # Uncomment when strawberry-graphql is properly installed
    # from app.graphql.dataloaders import create_dataloaders
    # context.dataloaders = create_dataloaders(context)

    return context


# Create the GraphQL schema
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
)


# Create the GraphQL router
graphql_router = GraphQLRouter(
    schema,
    context_getter=get_context,
    graphiql=True,  # Enable GraphiQL interface in development
)
