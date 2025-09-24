"""
GraphQL Schema Generation for Backend Scaffolding

Generates GraphQL schemas and resolvers including:
- Type definitions from SQLAlchemy models
- Query and Mutation resolvers
- DataLoader integration for N+1 prevention
- Subscription support for real-time updates
- Field-level permissions integration
"""

from typing import Dict, List, Optional, Any
from pathlib import Path
from .backend_generator import ModelDefinition, FieldDefinition, FieldType


class GraphQLGenerator:
    """Generate GraphQL schemas and resolvers"""
    
    def __init__(self, model_def: ModelDefinition, base_path: str = "."):
        self.model_def = model_def
        self.base_path = Path(base_path)
        self.model_name = model_def.name
        self.snake_name = model_def.name.lower()
        
    def generate_all_graphql(self):
        """Generate complete GraphQL implementation"""
        print(f"🚀 Generating GraphQL schemas for {self.model_name}...")
        
        # Generate type definitions
        self.generate_type_definitions()
        
        # Generate resolvers
        self.generate_resolvers()
        
        # Generate DataLoaders
        self.generate_dataloaders()
        
        # Generate subscriptions
        self.generate_subscriptions()
        
        print(f"✅ GraphQL implementation generated for {self.model_name}")
    
    def generate_type_definitions(self):
        """Generate GraphQL type definitions"""
        content = f'''"""
Auto-generated GraphQL type definitions for {self.model_name}
"""

import strawberry
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

from app.graphql.scalars import DateTime, Date, JSON


@strawberry.type
class {self.model_name}Type:
    """GraphQL type for {self.model_name}"""
    
    id: int
    created_at: DateTime
    updated_at: DateTime
'''
        
        # Add custom fields
        for field in self.model_def.fields:
            graphql_type = self._get_graphql_type(field)
            optional = "Optional[" if not field.required or field.nullable else ""
            closing = "]" if optional else ""
            
            content += f"    {field.name}: {optional}{graphql_type}{closing}\n"
        
        content += f'''

@strawberry.input
class {self.model_name}Input:
    """GraphQL input type for creating {self.model_name}"""
'''
        
        # Add input fields (excluding auto-generated ones)
        for field in self.model_def.fields:
            if field.name in ['id', 'created_at', 'updated_at']:
                continue
            
            graphql_type = self._get_graphql_type(field)
            optional = "Optional[" if not field.required else ""
            closing = "]" if optional else ""
            
            content += f"    {field.name}: {optional}{graphql_type}{closing}\n"
        
        content += f'''

@strawberry.input
class {self.model_name}UpdateInput:
    """GraphQL input type for updating {self.model_name}"""
'''
        
        # Add update fields (all optional)
        for field in self.model_def.fields:
            if field.name in ['id', 'created_at', 'updated_at']:
                continue
            
            graphql_type = self._get_graphql_type(field)
            content += f"    {field.name}: Optional[{graphql_type}] = None\n"
        
        # Add filter and pagination inputs
        content += f'''

@strawberry.input
class {self.model_name}Filter:
    """GraphQL filter input for {self.model_name}"""
    
    # Text search
    search: Optional[str] = None
    
    # Pagination
    limit: Optional[int] = 50
    offset: Optional[int] = 0
    
    # Sorting
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[str] = "desc"
    
    # Field-specific filters
'''
        
        # Add field-specific filters
        for field in self.model_def.fields:
            if field.type in [FieldType.STRING, FieldType.TEXT, FieldType.EMAIL]:
                content += f"    {field.name}_contains: Optional[str] = None\n"
                content += f"    {field.name}_exact: Optional[str] = None\n"
            elif field.type in [FieldType.INTEGER, FieldType.FLOAT]:
                content += f"    {field.name}_min: Optional[{self._get_graphql_type(field)}] = None\n"
                content += f"    {field.name}_max: Optional[{self._get_graphql_type(field)}] = None\n"
            elif field.type == FieldType.BOOLEAN:
                content += f"    {field.name}: Optional[bool] = None\n"
            elif field.type in [FieldType.DATE, FieldType.DATETIME]:
                content += f"    {field.name}_from: Optional[DateTime] = None\n"
                content += f"    {field.name}_to: Optional[DateTime] = None\n"
        
        content += f'''

@strawberry.type
class {self.model_name}Connection:
    """GraphQL connection type for paginated {self.model_name} results"""
    
    items: List[{self.model_name}Type]
    total_count: int
    has_next_page: bool
    has_previous_page: bool
    page_info: PageInfo


@strawberry.type
class PageInfo:
    """Pagination information"""
    
    has_next_page: bool
    has_previous_page: bool
    start_cursor: Optional[str] = None
    end_cursor: Optional[str] = None


@strawberry.type
class {self.model_name}Mutation:
    """GraphQL mutations for {self.model_name}"""
    
    @strawberry.mutation
    async def create_{self.snake_name}(
        self,
        info: strawberry.Info,
        input: {self.model_name}Input
    ) -> {self.model_name}Type:
        from app.graphql.context import get_context
        from app.services.{self.snake_name}_service import {self.model_name}Service
        
        context = get_context(info)
        service = {self.model_name}Service(context.db)
        
        # Check permissions
        if not context.user.has_permission("create_{self.model_def.permission_category or self.snake_name}"):
            raise Exception("Permission denied")
        
        result = await service.create(input.__dict__, context.user)
        return {self.model_name}Type(**result.__dict__)
    
    @strawberry.mutation
    async def update_{self.snake_name}(
        self,
        info: strawberry.Info,
        id: int,
        input: {self.model_name}UpdateInput
    ) -> {self.model_name}Type:
        from app.graphql.context import get_context
        from app.services.{self.snake_name}_service import {self.model_name}Service
        
        context = get_context(info)
        service = {self.model_name}Service(context.db)
        
        # Check permissions
        if not context.user.has_permission("update_{self.model_def.permission_category or self.snake_name}"):
            raise Exception("Permission denied")
        
        # Filter None values from input
        update_data = {{k: v for k, v in input.__dict__.items() if v is not None}}
        
        result = await service.update(id, update_data, context.user)
        return {self.model_name}Type(**result.__dict__)
    
    @strawberry.mutation
    async def delete_{self.snake_name}(
        self,
        info: strawberry.Info,
        id: int
    ) -> bool:
        from app.graphql.context import get_context
        from app.services.{self.snake_name}_service import {self.model_name}Service
        
        context = get_context(info)
        service = {self.model_name}Service(context.db)
        
        # Check permissions
        if not context.user.has_permission("delete_{self.model_def.permission_category or self.snake_name}"):
            raise Exception("Permission denied")
        
        await service.delete(id, context.user)
        return True


@strawberry.type
class {self.model_name}Query:
    """GraphQL queries for {self.model_name}"""
    
    @strawberry.field
    async def {self.snake_name}(
        self,
        info: strawberry.Info,
        id: int
    ) -> Optional[{self.model_name}Type]:
        from app.graphql.context import get_context
        from app.services.{self.snake_name}_service import {self.model_name}Service
        
        context = get_context(info)
        service = {self.model_name}Service(context.db)
        
        # Check permissions
        if not context.user.has_permission("read_{self.model_def.permission_category or self.snake_name}"):
            raise Exception("Permission denied")
        
        result = await service.get_by_id(id, context.user)
        if result:
            return {self.model_name}Type(**result.__dict__)
        return None
    
    @strawberry.field
    async def {self.snake_name}s(
        self,
        info: strawberry.Info,
        filter: Optional[{self.model_name}Filter] = None
    ) -> {self.model_name}Connection:
        from app.graphql.context import get_context
        from app.services.{self.snake_name}_service import {self.model_name}Service
        
        context = get_context(info)
        service = {self.model_name}Service(context.db)
        
        # Check permissions
        if not context.user.has_permission("read_{self.model_def.permission_category or self.snake_name}"):
            raise Exception("Permission denied")
        
        if not filter:
            filter = {self.model_name}Filter()
        
        results, total = await service.get_list(
            limit=filter.limit,
            offset=filter.offset,
            search=filter.search,
            sort_by=filter.sort_by,
            sort_order=filter.sort_order,
            filters=filter.__dict__,
            user=context.user
        )
        
        items = [{self.model_name}Type(**item.__dict__) for item in results]
        
        return {self.model_name}Connection(
            items=items,
            total_count=total,
            has_next_page=(filter.offset + filter.limit) < total,
            has_previous_page=filter.offset > 0,
            page_info=PageInfo(
                has_next_page=(filter.offset + filter.limit) < total,
                has_previous_page=filter.offset > 0
            )
        )
'''
        
        self._write_file(f"app/graphql/types/{self.snake_name}_types.py", content)
    
    def generate_resolvers(self):
        """Generate GraphQL resolvers"""
        content = f'''"""
GraphQL resolvers for {self.model_name}
Handles complex field resolution and relationship loading
"""

import strawberry
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.{self.snake_name} import {self.model_name}
from app.graphql.types.{self.snake_name}_types import {self.model_name}Type
from app.graphql.dataloaders.{self.snake_name}_loaders import {self.model_name}DataLoaders


@strawberry.type
class {self.model_name}Resolver:
    """Resolver for {self.model_name} complex fields"""
    
'''
        
        # Add relationship resolvers
        for field in self.model_def.fields:
            if field.type == FieldType.FOREIGN_KEY and field.relationship:
                target_model = field.relationship.target_model
                content += f'''    @strawberry.field
    async def {field.name.replace('_id', '')}(
        self,
        info: strawberry.Info,
        root: {self.model_name}Type
    ) -> Optional[{target_model}Type]:
        """Resolve {field.name} relationship"""
        if not hasattr(root, '{field.name}') or getattr(root, '{field.name}') is None:
            return None
        
        from app.graphql.context import get_context
        context = get_context(info)
        
        # Use DataLoader for efficient loading
        loader = context.dataloaders.get_{target_model.lower()}_by_id
        return await loader.load(getattr(root, '{field.name}'))
    
'''
        
        # Add computed field resolvers
        content += f'''    @strawberry.field
    async def display_name(
        self,
        info: strawberry.Info,
        root: {self.model_name}Type
    ) -> str:
        """Compute display name for {self.model_name}"""
        # Customize this based on your model's fields
'''
        
        # Generate display name logic based on available fields
        name_fields = [f for f in self.model_def.fields if 'name' in f.name.lower()]
        title_fields = [f for f in self.model_def.fields if 'title' in f.name.lower()]
        
        if name_fields:
            content += f'        return getattr(root, "{name_fields[0].name}", f"{self.model_name} #{"{root.id}"})")\n'
        elif title_fields:
            content += f'        return getattr(root, "{title_fields[0].name}", f"{self.model_name} #{"{root.id}"})")\n'
        else:
            content += f'        return f"{self.model_name} #{"{root.id}"}}"\n'
        
        content += f'''
    @strawberry.field
    async def permissions(
        self,
        info: strawberry.Info,
        root: {self.model_name}Type
    ) -> List[str]:
        """Get user's permissions for this specific resource"""
        from app.graphql.context import get_context
        from app.auth.permissions.{self.snake_name}_permissions import {self.model_name}Permissions
        
        context = get_context(info)
        permissions = []
        
        # Check each permission type
        permission_checks = [
            ("read", {self.model_name}Permissions.READ.name),
            ("update", {self.model_name}Permissions.UPDATE.name),
            ("delete", {self.model_name}Permissions.DELETE.name),
            ("admin", {self.model_name}Permissions.ADMIN.name),
        ]
        
        for perm_name, perm_key in permission_checks:
            if context.user.has_permission(perm_key):
                permissions.append(perm_name)
        
        return permissions
    
    @strawberry.field
    async def audit_trail(
        self,
        info: strawberry.Info,
        root: {self.model_name}Type
    ) -> List[AuditLogType]:
        """Get audit trail for this resource"""
        from app.graphql.context import get_context
        from app.models.audit_trail import AuditTrail
        
        context = get_context(info)
        
        # Check if user can view audit trails
        if not context.user.has_permission("read_audit_trails"):
            return []
        
        audit_logs = context.db.query(AuditTrail).filter(
            AuditTrail.resource_type == "{self.model_name}",
            AuditTrail.resource_id == root.id
        ).order_by(AuditTrail.created_at.desc()).limit(50).all()
        
        return [AuditLogType(**log.__dict__) for log in audit_logs]


# Field-level resolvers for sensitive data
@strawberry.type
class {self.model_name}FieldResolver:
    """Field-level resolvers with permission checks"""
    
'''
        
        # Add sensitive field resolvers
        for field in self.model_def.fields:
            if field.name in ['password', 'secret', 'token', 'key'] or field.type == FieldType.EMAIL:
                content += f'''    @strawberry.field
    async def {field.name}(
        self,
        info: strawberry.Info,
        root: {self.model_name}Type
    ) -> Optional[str]:
        """Resolve {field.name} with permission check"""
        from app.graphql.context import get_context
        
        context = get_context(info)
        
        # Check field-level permission
        if not context.user.has_permission("read_{self.model_def.permission_category or self.snake_name}_{field.name}"):
            return "[REDACTED]"
        
        return getattr(root, '{field.name}', None)
    
'''
        
        self._write_file(f"app/graphql/resolvers/{self.snake_name}_resolvers.py", content)
    
    def generate_dataloaders(self):
        """Generate DataLoader implementations for N+1 prevention"""
        content = f'''"""
DataLoaders for {self.model_name} to prevent N+1 queries
"""

from typing import List, Optional, Dict, Any
from collections import defaultdict
import asyncio
from sqlalchemy.orm import Session

from app.models.{self.snake_name} import {self.model_name}
from app.graphql.types.{self.snake_name}_types import {self.model_name}Type


class {self.model_name}DataLoader:
    """DataLoader for efficient {self.model_name} loading"""
    
    def __init__(self, db: Session):
        self.db = db
        self._cache: Dict[int, {self.model_name}] = {{}}
        self._batch_load_queue: List[int] = []
        self._batch_load_promise: Optional[asyncio.Future] = None
    
    async def load(self, id: int) -> Optional[{self.model_name}Type]:
        """Load single {self.model_name} by ID"""
        if id in self._cache:
            result = self._cache[id]
            return {self.model_name}Type(**result.__dict__) if result else None
        
        self._batch_load_queue.append(id)
        
        if self._batch_load_promise is None:
            self._batch_load_promise = asyncio.create_task(self._batch_load())
        
        await self._batch_load_promise
        
        result = self._cache.get(id)
        return {self.model_name}Type(**result.__dict__) if result else None
    
    async def load_many(self, ids: List[int]) -> List[Optional[{self.model_name}Type]]:
        """Load multiple {self.model_name}s by IDs"""
        tasks = [self.load(id) for id in ids]
        return await asyncio.gather(*tasks)
    
    async def _batch_load(self):
        """Perform batch loading of queued IDs"""
        if not self._batch_load_queue:
            return
        
        ids = list(set(self._batch_load_queue))  # Remove duplicates
        self._batch_load_queue.clear()
        
        # Load from database
        results = self.db.query({self.model_name}).filter({self.model_name}.id.in_(ids)).all()
        
        # Cache results
        for result in results:
            self._cache[result.id] = result
        
        # Cache None for missing IDs
        found_ids = {{result.id for result in results}}
        for id in ids:
            if id not in found_ids:
                self._cache[id] = None
        
        self._batch_load_promise = None


class {self.model_name}RelationshipDataLoaders:
    """DataLoaders for {self.model_name} relationships"""
    
    def __init__(self, db: Session):
        self.db = db
        self._caches: Dict[str, Dict[int, List]] = defaultdict(dict)
    
'''
        
        # Generate relationship DataLoaders
        for field in self.model_def.fields:
            if field.type == FieldType.FOREIGN_KEY and field.relationship:
                target_model = field.relationship.target_model
                relationship_name = field.relationship.back_populates or f"{self.snake_name}s"
                
                content += f'''    async def load_{relationship_name}(self, {self.snake_name}_id: int) -> List[{target_model}Type]:
        """Load {relationship_name} for {self.model_name}"""
        cache_key = "{relationship_name}"
        
        if {self.snake_name}_id in self._caches[cache_key]:
            results = self._caches[cache_key][{self.snake_name}_id]
            return [{target_model}Type(**item.__dict__) for item in results]
        
        from app.models.{target_model.lower()} import {target_model}
        
        results = self.db.query({target_model}).filter(
            {target_model}.{field.name} == {self.snake_name}_id
        ).all()
        
        self._caches[cache_key][{self.snake_name}_id] = results
        return [{target_model}Type(**item.__dict__) for item in results]
    
'''
        
        content += f'''

class {self.model_name}DataLoaders:
    """Container for all {self.model_name} DataLoaders"""
    
    def __init__(self, db: Session):
        self.db = db
        self.by_id = {self.model_name}DataLoader(db)
        self.relationships = {self.model_name}RelationshipDataLoaders(db)
        
'''
        
        # Add convenience methods for relationships
        for field in self.model_def.fields:
            if field.type == FieldType.FOREIGN_KEY and field.relationship:
                relationship_name = field.relationship.back_populates or f"{self.snake_name}s"
                content += f'''        
    async def get_{relationship_name}(self, {self.snake_name}_id: int):
        """Get {relationship_name} for {self.model_name}"""
        return await self.relationships.load_{relationship_name}({self.snake_name}_id)
'''
        
        self._write_file(f"app/graphql/dataloaders/{self.snake_name}_loaders.py", content)
    
    def generate_subscriptions(self):
        """Generate GraphQL subscriptions for real-time updates"""
        content = f'''"""
GraphQL subscriptions for {self.model_name} real-time updates
"""

import strawberry
from typing import AsyncGenerator, Optional
import asyncio
from datetime import datetime

from app.graphql.types.{self.snake_name}_types import {self.model_name}Type
from app.graphql.pubsub import pubsub


@strawberry.type
class {self.model_name}Subscription:
    """GraphQL subscriptions for {self.model_name}"""
    
    @strawberry.subscription
    async def {self.snake_name}_created(
        self,
        info: strawberry.Info,
        project_id: Optional[int] = None
    ) -> AsyncGenerator[{self.model_name}Type, None]:
        """Subscribe to {self.model_name} creation events"""
        from app.graphql.context import get_context
        
        context = get_context(info)
        
        # Check permissions
        if not context.user.has_permission("read_{self.model_def.permission_category or self.snake_name}"):
            raise Exception("Permission denied")
        
        # Subscribe to creation events
        channel = f"{self.snake_name}_created"
        if project_id:
            channel += f"_project_{{{project_id}}}"
        
        async for message in pubsub.subscribe(channel):
            # Verify user still has permission to see this resource
            if context.user.can_access_resource(message):
                yield {self.model_name}Type(**message.__dict__)
    
    @strawberry.subscription
    async def {self.snake_name}_updated(
        self,
        info: strawberry.Info,
        id: int
    ) -> AsyncGenerator[{self.model_name}Type, None]:
        """Subscribe to specific {self.model_name} update events"""
        from app.graphql.context import get_context
        
        context = get_context(info)
        
        # Check permissions
        if not context.user.has_permission("read_{self.model_def.permission_category or self.snake_name}"):
            raise Exception("Permission denied")
        
        # Subscribe to update events for specific resource
        channel = f"{self.snake_name}_updated_{{{id}}}"
        
        async for message in pubsub.subscribe(channel):
            # Verify user still has permission to see this resource
            if context.user.can_access_resource(message):
                yield {self.model_name}Type(**message.__dict__)
    
    @strawberry.subscription
    async def {self.snake_name}_deleted(
        self,
        info: strawberry.Info,
        project_id: Optional[int] = None
    ) -> AsyncGenerator[int, None]:
        """Subscribe to {self.model_name} deletion events"""
        from app.graphql.context import get_context
        
        context = get_context(info)
        
        # Check permissions
        if not context.user.has_permission("read_{self.model_def.permission_category or self.snake_name}"):
            raise Exception("Permission denied")
        
        # Subscribe to deletion events
        channel = f"{self.snake_name}_deleted"
        if project_id:
            channel += f"_project_{{{project_id}}}"
        
        async for message in pubsub.subscribe(channel):
            # Return the ID of the deleted resource
            yield message.get("id")
    
    @strawberry.subscription
    async def {self.snake_name}_activity(
        self,
        info: strawberry.Info,
        id: int
    ) -> AsyncGenerator[str, None]:
        """Subscribe to activity updates for specific {self.model_name}"""
        from app.graphql.context import get_context
        
        context = get_context(info)
        
        # Check permissions
        if not context.user.has_permission("read_{self.model_def.permission_category or self.snake_name}"):
            raise Exception("Permission denied")
        
        # Subscribe to activity events
        channel = f"{self.snake_name}_activity_{{{id}}}"
        
        async for message in pubsub.subscribe(channel):
            yield message.get("activity", "Unknown activity")


# Publisher functions for triggering subscriptions
class {self.model_name}Publisher:
    """Publisher for {self.model_name} subscription events"""
    
    @staticmethod
    async def publish_created(resource: {self.model_name}Type, project_id: Optional[int] = None):
        """Publish {self.model_name} creation event"""
        channel = f"{self.snake_name}_created"
        if project_id:
            await pubsub.publish(f"{channel}_project_{{{project_id}}}", resource)
        else:
            await pubsub.publish(channel, resource)
    
    @staticmethod
    async def publish_updated(resource: {self.model_name}Type):
        """Publish {self.model_name} update event"""
        await pubsub.publish(f"{self.snake_name}_updated_{{{resource.id}}}", resource)
    
    @staticmethod
    async def publish_deleted(resource_id: int, project_id: Optional[int] = None):
        """Publish {self.model_name} deletion event"""
        channel = f"{self.snake_name}_deleted"
        message = {{"id": resource_id, "deleted_at": datetime.utcnow().isoformat()}}
        
        if project_id:
            await pubsub.publish(f"{channel}_project_{{{project_id}}}", message)
        else:
            await pubsub.publish(channel, message)
    
    @staticmethod
    async def publish_activity(resource_id: int, activity: str):
        """Publish activity event for {self.model_name}"""
        await pubsub.publish(
            f"{self.snake_name}_activity_{{{resource_id}}}",
            {{"activity": activity, "timestamp": datetime.utcnow().isoformat()}}
        )
'''
        
        self._write_file(f"app/graphql/subscriptions/{self.snake_name}_subscriptions.py", content)
    
    def _get_graphql_type(self, field: FieldDefinition) -> str:
        """Convert field type to GraphQL type"""
        type_mapping = {
            FieldType.STRING: "str",
            FieldType.INTEGER: "int",
            FieldType.FLOAT: "float", 
            FieldType.BOOLEAN: "bool",
            FieldType.DATE: "Date",
            FieldType.DATETIME: "DateTime",
            FieldType.TEXT: "str",
            FieldType.EMAIL: "str",
            FieldType.URL: "str",
            FieldType.JSON: "JSON",
            FieldType.ENUM: "str",  # Could be enhanced with proper enum types
            FieldType.FOREIGN_KEY: "int"
        }
        return type_mapping.get(field.type, "str")
    
    def _write_file(self, relative_path: str, content: str):
        """Write content to file, creating directories as needed"""
        file_path = self.base_path / relative_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)