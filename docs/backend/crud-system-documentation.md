# Comprehensive CRUD System with Generic Permissions

This document outlines the complete implementation of a secure, generic CRUD system with role-based permissions and reusable components for the FastNext application.

## 🎯 System Overview

The system provides:
- **Complete CRUD operations** for all database tables
- **Generic role-based permission system** with granular access control
- **Reusable UI components** (List View, Kanban View, Form View)
- **Inheritance-based prototype pattern** for creating new resource types
- **Type-safe APIs** with comprehensive validation

## 📊 Architecture

### Backend Architecture

```
Backend Structure:
├── models/
│   ├── base.py              # Base models and mixins
│   ├── user.py              # User model
│   ├── project.py           # Project model
│   ├── component.py         # Component models
│   ├── permission.py        # Permission model
│   ├── role.py              # Role model
│   ├── user_role.py         # User-Role relationships
│   └── asset.py             # Asset model
│
├── api/
│   ├── base_crud.py         # Generic CRUD controller
│   └── routes/
│       ├── users.py         # User CRUD endpoints
│       ├── projects.py      # Project CRUD endpoints
│       ├── components.py    # Component CRUD endpoints
│       ├── permissions.py   # Permission CRUD endpoints
│       ├── roles.py         # Role CRUD endpoints
│       ├── assets.py        # Asset CRUD endpoints
│       └── user_roles.py    # User-Role CRUD endpoints
│
└── services/
    └── permission_service.py # Enhanced permission service
```

### Frontend Architecture

```
Frontend Structure:
├── hooks/
│   └── useGenericPermissions.ts    # Permission management hook
│
├── components/
│   └── common/
│       ├── GenericListView.tsx     # Reusable list component
│       ├── GenericKanbanView.tsx   # Reusable kanban component
│       └── GenericFormView.tsx     # Reusable form component
│
├── lib/
│   ├── api/                        # API client modules
│   └── resource-factory.tsx        # Resource component factory
│
└── components/

```

## 🔐 Permission System

### Permission Structure

```typescript
interface Permission {
  id: number
  name: string           // Format: "resource:action" (e.g., "user:create")
  description: string
  category: string       // Resource type (user, project, component, etc.)
  action: string        // CRUD action (create, read, update, delete, manage)
  resource?: string     // Optional specific resource
  is_system_permission: boolean
}
```

### Permission Actions

- **create**: Can create new resources
- **read**: Can view resources
- **update**: Can modify existing resources
- **delete**: Can remove resources
- **manage**: Full access (implies all other actions)

### Permission Categories

- `user`: User management
- `project`: Project management
- `component`: Component management
- `asset`: Asset/file management
- `role`: Role management
- `permission`: Permission management
- `system`: System-wide permissions

### Permission Checking

```python
# Backend - Check resource permission
PermissionService.check_resource_permission(
    db=db,
    user_id=user.id,
    action="create",
    resource_type="project",
    project_id=project_id  # Optional context
)

# Backend - Check project-specific permission
PermissionService.check_project_permission(
    db=db,
    user_id=user.id,
    project_id=project_id,
    action="update"
)
```

```typescript
// Frontend - Use permission hook
const permissions = useGenericPermissions('project', projectId)

// Check specific permissions
const canCreate = permissions.checkCreate('project')
const canEdit = permissions.checkUpdate('project', resourceId)
const canDelete = permissions.checkDelete('project', resourceId)
```

## 🗄️ Database Models

### Base Models and Mixins

The system uses mixins for common functionality:

```python
# TimestampMixin - adds created_at, updated_at
# SoftDeleteMixin - adds is_deleted, deleted_at
# AuditMixin - adds created_by, updated_by
# MetadataMixin - adds metadata_json, tags, version

class BaseModel(Base, TimestampMixin):
    """Standard base model"""
    id = Column(Integer, primary_key=True, index=True)

class AuditableModel(BaseModel, AuditMixin):
    """Model with audit trail"""
    pass

class FullAuditModel(BaseModel, AuditMixin, SoftDeleteMixin, MetadataMixin):
    """Full-featured model with all capabilities"""
    pass
```

### Resource Prototype System

Create new resource types using the prototype pattern:

```python
# Define a new resource prototype
task_prototype = ResourcePrototype(
    name='Task',
    table_name='tasks',
    base_class=AuditableModel,
    fields={
        'title': Column(String(500), nullable=False),
        'description': Column(Text, nullable=True),
        'status': Column(Enum(TaskStatus), default=TaskStatus.TODO),
        'project_id': Column(Integer, ForeignKey('projects.id'))
    }
)

# Create the model class
TaskModel = task_prototype.create_model()
```

## 🚀 API Endpoints

### Standard CRUD Endpoints

All resources follow the same pattern:

```
GET    /api/{resource}/              # List resources
POST   /api/{resource}/              # Create resource
GET    /api/{resource}/{id}          # Get specific resource
PUT    /api/{resource}/{id}          # Update resource
DELETE /api/{resource}/{id}          # Delete resource
```

### Available Endpoints

- `/api/users/` - User management
- `/api/projects/` - Project management
- `/api/components/` - Component management
- `/api/pages/` - Page management
- `/api/assets/` - Asset/file management
- `/api/roles/` - Role management
- `/api/permissions/` - Permission management
- `/api/user-roles/` - User-role assignments
- `/api/project-members/` - Project memberships

### Generic CRUD Controller

Create new endpoints easily:

```python
from app.api.base_crud import BaseCRUDController
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate

# Create controller
task_controller = BaseCRUDController(
    model=Task,
    resource_name="task",
    owner_field="created_by",
    project_field="project_id"
)

# Use in routes
@router.get("/")
def read_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return task_controller.get_list(db, current_user)
```

## 🎨 Frontend Components

### Generic List View

Displays data in a table format with built-in permissions, search, and pagination:

```typescript
<GenericListView
  data={users}
  columns={[
    { key: 'username', label: 'Username', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'is_active', label: 'Active', render: (value) => value ? 'Yes' : 'No' }
  ]}
  resourceName="user"
  onCreateClick={() => setShowForm(true)}
  onEditClick={(user) => setEditingUser(user)}
  onDeleteClick={handleDelete}
  title="User Management"
  searchable={true}
/>
```

### Generic Kanban View

Displays data in a kanban board format:

```typescript
<GenericKanbanView
  items={kanbanItems}
  columns={[
    { id: 'todo', title: 'To Do', color: '#ef4444' },
    { id: 'in_progress', title: 'In Progress', color: '#f59e0b' },
    { id: 'done', title: 'Done', color: '#10b981' }
  ]}
  resourceName="task"
  onCreateClick={(columnId) => createTask(columnId)}
  onMoveItem={handleMoveTask}
  cardFields={[
    { key: 'priority', label: 'Priority' },
    { key: 'due_date', label: 'Due Date' }
  ]}
/>
```

### Generic Form View

Creates forms with validation and permission checking:

```typescript
<GenericFormView
  fields={[
    { name: 'title', label: 'Task Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'status', label: 'Status', type: 'select', options: statusOptions },
    { name: 'due_date', label: 'Due Date', type: 'date' }
  ]}
  resourceName="task"
  mode="create"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  validationSchema={taskSchema}
/>
```

## 🏭 Resource Factory System

Create complete CRUD interfaces with minimal code:

```typescript
import { createResourceFactory } from '@/lib/resource-factory'

// Define resource configuration
const taskConfig: ResourceConfig = {
  name: 'task',
  displayName: 'Task',
  apiEndpoint: '/tasks',
  listColumns: [...],
  formFields: [...],
  kanbanConfig: {...},
  validationSchema: taskSchema
}

// Create factory
const TaskFactory = createResourceFactory(taskConfig)

// Use components
const TaskList = TaskFactory.createListView({ data, onCreateClick, onEditClick })
const TaskForm = TaskFactory.createFormView({ mode: 'create', onSubmit })
const TaskKanban = TaskFactory.createKanbanView({ items, onMoveItem })
```

## 📝 Usage Examples

### 1. Basic User Management

```typescript
function UserManagement() {
  const [users, setUsers] = useState([])
  const userApi = UserFactory.getApi()

  const loadUsers = async () => {
    const data = await userApi.getList()
    setUsers(data)
  }

  return UserFactory.createListView({
    data: users,
    onCreateClick: () => showCreateForm(),
    onEditClick: (user) => showEditForm(user),
    onDeleteClick: handleDelete,
    onRefresh: loadUsers
  })
}
```

### 2. Project-Scoped Task Management

```typescript
function TaskManagement({ projectId }: { projectId: number }) {
  const [tasks, setTasks] = useState([])
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')

  const kanbanItems = tasks.map(task => ({
    id: task.id,
    status: task.status,
    title: task.title,
    description: task.description,
    data: task
  }))

  return viewMode === 'list'
    ? TaskFactory.createListView({ data: tasks, projectId })
    : TaskFactory.createKanbanView({ items: kanbanItems, projectId })
}
```

### 3. Custom Resource Creation

```typescript
// Define new resource
const DocumentConfig: ResourceConfig = {
  name: 'document',
  displayName: 'Document',
  apiEndpoint: '/documents',
  listColumns: [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'category', label: 'Category' },
    { key: 'file_size', label: 'Size', render: formatFileSize }
  ],
  formFields: [
    { name: 'title', label: 'Document Title', type: 'text', required: true },
    { name: 'category', label: 'Category', type: 'select', options: categoryOptions },
    { name: 'file', label: 'File', type: 'file', accept: '.pdf,.doc,.docx' }
  ]
}

const DocumentFactory = createResourceFactory(DocumentConfig)
```

## 🔧 Setup and Configuration

### Backend Setup

1. **Install dependencies** (already in requirements.txt)
2. **Run migrations** to create new tables:
   ```bash
   cd backend
   alembic revision --autogenerate -m "Add generic CRUD system"
   alembic upgrade head
   ```

3. **Initialize permissions**:
   ```python
   from app.services.permission_service import PermissionService
   from app.db.session import SessionLocal

   db = SessionLocal()
   PermissionService.create_generic_permissions(db)
   db.close()
   ```

### Frontend Setup

1. **Import required components**:
   ```typescript
   import { GenericListView } from '@/components/common/GenericListView'
   import { GenericKanbanView } from '@/components/common/GenericKanbanView'
   import { GenericFormView } from '@/components/common/GenericFormView'
   import { useGenericPermissions } from '@/hooks/useGenericPermissions'
   ```

2. **Use resource factories** for rapid development
3. **Configure permissions** in your role management interface

## 🔒 Security Features

### Permission Enforcement

- **Backend**: All endpoints check permissions before allowing operations
- **Frontend**: UI elements are hidden/disabled based on user permissions
- **API**: Consistent permission checking across all resources

### Data Protection

- **Ownership checking**: Users can only access their own resources (unless they have manage permissions)
- **Project scoping**: Resources can be limited to specific projects
- **Audit trail**: All changes are tracked with user attribution

### Secure Defaults

- **Deny by default**: No access unless explicitly granted
- **Least privilege**: Users get minimal permissions needed
- **Superuser bypass**: Superusers have all permissions for administration

## 🧪 Testing

### Backend Testing

```python
def test_user_crud_permissions():
    # Test create permission
    response = client.post("/api/users/", json=user_data, headers=auth_headers)
    assert response.status_code == 201

    # Test read permission
    response = client.get("/api/users/", headers=auth_headers)
    assert response.status_code == 200

    # Test unauthorized access
    response = client.post("/api/users/", json=user_data)
    assert response.status_code == 401
```

### Frontend Testing

```typescript
import { render, screen } from '@testing-library/react'
import { GenericListView } from '@/components/common/GenericListView'

test('renders list view with data', () => {
  render(
    <GenericListView
      data={mockUsers}
      columns={userColumns}
      resourceName="user"
    />
  )

  expect(screen.getByText('Users')).toBeInTheDocument()
  expect(screen.getByText('Create User')).toBeInTheDocument()
})
```

## 🚀 Deployment

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost/fastnext
SECRET_KEY=your-secret-key
ALGORITHM=HS256

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Production Considerations

1. **Database indexing**: Ensure proper indexes on permission tables
2. **Caching**: Implement Redis caching for permission checks
3. **Rate limiting**: Add rate limiting to API endpoints
4. **Monitoring**: Set up logging and monitoring for permission violations

## 📚 Best Practices

### Backend

1. **Always use the permission service** for access control
2. **Follow the base controller pattern** for consistency
3. **Use appropriate mixins** for model capabilities
4. **Validate input data** with Pydantic schemas

### Frontend

1. **Use the resource factory** for new resource types
2. **Implement proper error handling** in components
3. **Follow the permission hook pattern** for access control
4. **Provide loading and error states** in UI

### Security

1. **Never bypass permission checks** in production code
2. **Use HTTPS** for all API communications
3. **Validate all user input** on both frontend and backend
4. **Log permission violations** for security monitoring

## 🔄 Future Enhancements

1. **Dynamic permission creation** through UI
2. **Advanced filtering and search** capabilities
3. **Bulk operations** with permission checking
4. **Export/import functionality** for data management
5. **Real-time updates** with WebSocket support
6. **Advanced audit logging** with detailed change tracking

---

This comprehensive system provides a solid foundation for building secure, scalable applications with consistent CRUD operations and fine-grained permission control.
