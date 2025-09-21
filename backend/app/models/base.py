from sqlalchemy import Column, Integer, DateTime, Boolean, String, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import declared_attr
from app.db.base import Base


class TimestampMixin:
    """Mixin for adding timestamp columns to models"""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SoftDeleteMixin:
    """Mixin for adding soft delete functionality"""
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class AuditMixin:
    """Mixin for adding audit fields"""
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    
    @declared_attr
    def created_by_user(cls):
        from sqlalchemy.orm import relationship
        from sqlalchemy import ForeignKey
        return relationship("User", foreign_keys=[cls.created_by])
    
    @declared_attr
    def updated_by_user(cls):
        from sqlalchemy.orm import relationship
        return relationship("User", foreign_keys=[cls.updated_by])


class MetadataMixin:
    """Mixin for adding metadata fields"""
    metadata_json = Column(JSON, default={}, nullable=False)
    tags = Column(JSON, default=[], nullable=False)
    version = Column(String(20), default="1.0.0", nullable=False)


class BaseModel(Base, TimestampMixin):
    """Base model class with common fields"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)


class AuditableModel(BaseModel, AuditMixin):
    """Base model with audit capabilities"""
    __abstract__ = True


class SoftDeletableModel(BaseModel, SoftDeleteMixin):
    """Base model with soft delete capabilities"""
    __abstract__ = True


class FullAuditModel(BaseModel, AuditMixin, SoftDeleteMixin, MetadataMixin):
    """Full-featured base model with all capabilities"""
    __abstract__ = True


class ResourcePrototype:
    """Prototype pattern for creating new resource types"""
    
    def __init__(
        self,
        name: str,
        table_name: str,
        base_class: type = BaseModel,
        mixins: list = None,
        fields: dict = None,
        relationships: dict = None
    ):
        self.name = name
        self.table_name = table_name
        self.base_class = base_class
        self.mixins = mixins or []
        self.fields = fields or {}
        self.relationships = relationships or {}
    
    def create_model(self):
        """Create a new model class based on the prototype"""
        # Combine base class and mixins
        bases = tuple([self.base_class] + self.mixins)
        
        # Create class attributes
        attrs = {
            '__tablename__': self.table_name,
            **self.fields
        }
        
        # Add relationships
        for rel_name, rel_config in self.relationships.items():
            attrs[rel_name] = rel_config
        
        # Create the model class dynamically
        model_class = type(self.name, bases, attrs)
        return model_class
    
    def clone(self, **overrides):
        """Create a copy of this prototype with modifications"""
        return ResourcePrototype(
            name=overrides.get('name', self.name),
            table_name=overrides.get('table_name', self.table_name),
            base_class=overrides.get('base_class', self.base_class),
            mixins=overrides.get('mixins', self.mixins.copy()),
            fields=overrides.get('fields', self.fields.copy()),
            relationships=overrides.get('relationships', self.relationships.copy())
        )


# Common prototype configurations
STANDARD_PROTOTYPES = {
    'basic_resource': ResourcePrototype(
        name='BasicResource',
        table_name='basic_resources',
        base_class=BaseModel,
        fields={
            'name': Column(String(255), nullable=False, index=True),
            'description': Column(Text, nullable=True),
            'is_active': Column(Boolean, default=True, nullable=False)
        }
    ),
    
    'user_owned_resource': ResourcePrototype(
        name='UserOwnedResource',
        table_name='user_owned_resources',
        base_class=AuditableModel,
        fields={
            'name': Column(String(255), nullable=False, index=True),
            'description': Column(Text, nullable=True),
            'is_active': Column(Boolean, default=True, nullable=False),
            'is_public': Column(Boolean, default=False, nullable=False)
        }
    ),
    
    'project_resource': ResourcePrototype(
        name='ProjectResource',
        table_name='project_resources',
        base_class=AuditableModel,
        fields={
            'name': Column(String(255), nullable=False, index=True),
            'description': Column(Text, nullable=True),
            'project_id': Column(Integer, nullable=False),
            'is_active': Column(Boolean, default=True, nullable=False)
        }
    ),
    
    'content_resource': ResourcePrototype(
        name='ContentResource',
        table_name='content_resources',
        base_class=FullAuditModel,
        fields={
            'title': Column(String(500), nullable=False, index=True),
            'content': Column(Text, nullable=True),
            'status': Column(String(50), default='draft', nullable=False),
            'category': Column(String(100), nullable=True),
            'slug': Column(String(255), unique=True, nullable=True)
        }
    )
}


def create_resource_from_prototype(prototype_name: str, custom_fields: dict = None, **kwargs):
    """Create a new resource model from a predefined prototype"""
    if prototype_name not in STANDARD_PROTOTYPES:
        raise ValueError(f"Unknown prototype: {prototype_name}")
    
    prototype = STANDARD_PROTOTYPES[prototype_name].clone(**kwargs)
    
    if custom_fields:
        prototype.fields.update(custom_fields)
    
    return prototype.create_model()


# Example usage functions for creating new tables
def create_task_model():
    """Example: Create a Task model using the project_resource prototype"""
    from sqlalchemy import Column, String, Text, DateTime, Enum
    import enum
    
    class TaskStatus(str, enum.Enum):
        TODO = "todo"
        IN_PROGRESS = "in_progress"
        DONE = "done"
        CANCELLED = "cancelled"
    
    custom_fields = {
        'title': Column(String(500), nullable=False),
        'description': Column(Text, nullable=True),
        'status': Column(Enum(TaskStatus), default=TaskStatus.TODO),
        'due_date': Column(DateTime(timezone=True), nullable=True),
        'priority': Column(String(20), default='medium'),
        'assignee_id': Column(Integer, nullable=True)
    }
    
    return create_resource_from_prototype(
        'project_resource',
        name='Task',
        table_name='tasks',
        custom_fields=custom_fields
    )


def create_document_model():
    """Example: Create a Document model using the content_resource prototype"""
    from sqlalchemy import Column, String, Integer, Boolean
    
    custom_fields = {
        'file_path': Column(String(1000), nullable=True),
        'file_size': Column(Integer, nullable=True),
        'mime_type': Column(String(100), nullable=True),
        'is_template': Column(Boolean, default=False),
        'template_category': Column(String(100), nullable=True)
    }
    
    return create_resource_from_prototype(
        'content_resource',
        name='Document',
        table_name='documents',
        custom_fields=custom_fields
    )