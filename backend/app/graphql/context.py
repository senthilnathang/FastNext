from typing import Any, Dict, Optional

import strawberry
from app.models.user import User
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession


@strawberry.type
class GraphQLContext:
    request: Request
    db: AsyncSession
    user: Optional[User] = None
    dataloaders: Optional[Dict[str, Any]] = None

    def __init__(
        self,
        request: Request,
        db: AsyncSession,
        user: Optional[User] = None,
        dataloaders: Optional[Dict[str, Any]] = None,
    ):
        self.request = request
        self.db = db
        self.user = user
        self.dataloaders = dataloaders or {}
