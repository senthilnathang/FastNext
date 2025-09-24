# FastNext Framework

A comprehensive full-stack web application framework built with modern technologies for rapid development and enterprise-grade app building.

## Tech Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **PostgreSQL** - Powerful, open source object-relational database
- **SQLAlchemy** - Python SQL toolkit and Object-Relational Mapping

### Frontend
- **Next.js** - React framework for production
- **TypeScript** - Typed JavaScript at scale
- **Tailwind CSS** - Utility-first CSS framework
- **ShadcnUI** - Re-usable components built with Radix UI and Tailwind CSS
- **nuqs** - Type-safe URL state management for React

### Development Tools
- **pytest** - Python testing framework with coverage reporting
- **Playwright** - End-to-end testing framework for web applications
- **Jest** - JavaScript testing framework
- **Storybook** - Tool for building UI components in isolation
- **Pylint** - Python code analysis tool
- **Biome** - Fast formatter and linter for JavaScript/TypeScript
- **ESLint** - JavaScript/TypeScript linting and code quality
- **Swagger UI** - Interactive API documentation and testing interface

## Project Structure

The FastNext Framework follows a modular architecture pattern that promotes scalability, maintainability, and developer productivity. The codebase is organized into feature-based modules with clear separation of concerns.

### Backend Structure
```
backend/
├── app/
│   ├── api/              # API routes and endpoints
│   │   ├── routes/       # Feature-specific route modules
│   │   └── base_crud.py  # Base CRUD operations
│   ├── auth/             # Authentication and authorization
│   │   ├── deps.py       # Dependency injection
│   │   └── permissions.py # Permission system
│   ├── core/             # Core configurations
│   │   ├── config.py     # Application settings
│   │   ├── security.py   # Security utilities
│   │   └── swagger_config.py # API documentation config
│   ├── db/               # Database layer
│   │   ├── session.py    # Database sessions
│   │   └── init_db.py    # Database initialization
│   ├── models/           # SQLAlchemy data models
│   ├── schemas/          # Pydantic schemas for validation
│   ├── services/         # Business logic layer
│   ├── middleware/       # Custom middleware
│   └── utils/           # Utility functions
├── migrations/          # Alembic database migrations
├── tests/              # Backend test suite
│   ├── conftest.py     # Test configuration and fixtures
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── api/            # API endpoint tests
│   ├── auth/           # Authentication tests
│   ├── workflow/       # Workflow-specific tests
│   └── crud/           # CRUD operation tests
├── pytest.ini         # pytest configuration
├── test_runner.py      # Comprehensive test runner script
├── main.py             # FastAPI application entry point
└── requirements.txt    # Python dependencies
```

### Frontend Modular Architecture
```
frontend/src/
├── modules/                    # Feature-based modules
│   ├── auth/                  # Authentication module
│   │   ├── components/        # Auth-specific components
│   │   │   ├── ChangePasswordForm.tsx
│   │   │   ├── SecuritySettings.tsx
│   │   │   ├── UpdateProfileForm.tsx
│   │   │   └── index.ts
│   │   ├── hooks/            # Authentication hooks
│   │   │   └── useAuth.ts
│   │   ├── services/         # Auth context and services
│   │   │   └── AuthContext.tsx
│   │   ├── types/           # Authentication types
│   │   │   └── index.ts
│   │   ├── client.ts        # Client-side auth utilities
│   │   ├── server.ts        # Server-side auth utilities
│   │   └── index.ts         # Module barrel exports
│   ├── admin/               # Administration module
│   │   ├── components/      # Admin UI components
│   │   │   ├── ActivityLogViewer.tsx
│   │   │   ├── RoleCreateDialog.tsx
│   │   │   ├── RoleEditDialog.tsx
│   │   │   ├── UserCreateDialog.tsx
│   │   │   ├── UserEditDialog.tsx
│   │   │   └── index.ts
│   │   ├── hooks/          # Admin management hooks
│   │   │   ├── useGenericPermissions.ts
│   │   │   ├── usePermissions.ts
│   │   │   ├── useRoles.ts
│   │   │   ├── useUserRole.ts
│   │   │   └── useUsers.ts
│   │   ├── types/          # Admin type definitions
│   │   │   └── index.ts
│   │   ├── pages/          # Admin page components
│   │   ├── services/       # Admin services
│   │   └── index.ts
│   ├── api-docs/           # API documentation module
│   │   ├── components/     # Swagger UI components
│   │   │   ├── SwaggerErrorBoundary.tsx
│   │   │   ├── SwaggerUI.tsx
│   │   │   ├── SwaggerUINoStrict.tsx
│   │   │   ├── __tests__/
│   │   │   └── index.ts
│   │   ├── types/         # API documentation types
│   │   │   ├── swagger.d.ts
│   │   │   └── index.ts
│   │   ├── utils/         # API testing utilities
│   │   │   └── api-test.ts
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── index.ts
│   ├── workflow/         # ReactFlow-based workflow system
│   │   ├── components/    # Workflow UI components (ReactFlow nodes/edges)
│   │   │   ├── ConditionalNode.tsx
│   │   │   ├── ParallelGatewayNode.tsx
│   │   │   ├── TimerNode.tsx
│   │   │   ├── UserTaskNode.tsx
│   │   │   ├── WorkflowAnalytics.tsx
│   │   │   ├── WorkflowBuilder.tsx
│   │   │   ├── WorkflowStateNode.tsx
│   │   │   └── __tests__/
│   │   ├── hooks/        # Workflow state management
│   │   │   └── useWorkflow.ts
│   │   ├── types/       # Workflow type definitions
│   │   │   ├── reactflow.ts
│   │   │   └── index.ts
│   │   ├── templates/   # Workflow template system
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── projects/         # Project management
│   │   ├── components/   # Project components
│   │   │   └── ProjectsList.tsx
│   │   ├── hooks/       # Project management hooks
│   │   │   └── useProjects.ts
│   │   ├── types/      # Project types
│   │   │   └── index.ts
│   │   ├── pages/
│   │   ├── services/
│   │   └── index.ts
│   ├── dashboard/        # Dashboard module
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   └── settings/        # User settings module
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       ├── types/
│       └── index.ts
├── shared/             # Shared resources across modules
│   ├── components/    # Reusable UI components
│   │   ├── ui/       # Base UI components (Button, Card, etc.)
│   │   │   ├── button.tsx, card.tsx, input.tsx
│   │   │   ├── dialog.tsx, form.tsx, table.tsx
│   │   │   ├── theme-toggle.tsx, spinner.tsx
│   │   │   └── index.ts
│   │   ├── layout/   # Layout components
│   │   │   ├── AppLayout.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   └── index.ts
│   │   ├── navigation/  # Navigation components
│   │   │   ├── Sidebar.tsx, MobileSidebar.tsx
│   │   │   ├── Breadcrumb.tsx, UserMenu.tsx
│   │   │   ├── menuConfig.ts, menuUtils.ts
│   │   │   └── index.ts
│   │   ├── data-visualization/  # Data components
│   │   │   ├── data-table.tsx, kanban-board.tsx
│   │   │   ├── analytics-dashboard.tsx
│   │   │   └── index.ts
│   │   ├── feedback/    # Feedback components
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ConfirmationDialog.tsx
│   │   │   └── index.ts
│   │   ├── form-fields/ # Form field components
│   │   ├── media/       # Media components
│   │   ├── providers/   # Provider components
│   │   ├── views/       # Generic view components
│   │   └── index.ts
│   ├── hooks/        # Shared custom hooks
│   │   ├── useURLState.ts      # URL state management
│   │   ├── useApiQuery.ts      # API querying
│   │   ├── useInfiniteScroll.ts
│   │   ├── useAdvancedSearch.ts
│   │   ├── useSwipeGesture.ts
│   │   ├── useOfflineSync.ts
│   │   └── index.ts
│   ├── services/     # API client and shared services
│   │   ├── api/     # API service layer
│   │   │   ├── client.ts, config.ts
│   │   │   ├── users.ts, roles.ts, permissions.ts
│   │   │   ├── projects.ts, components.ts
│   │   │   ├── workflow.ts
│   │   │   └── index.ts
│   │   ├── ThemeContext.tsx
│   │   ├── swagger.ts
│   │   └── index.ts
│   ├── types/       # Global type definitions
│   │   ├── swagger-ui-react.d.ts
│   │   ├── swagger-ui.d.ts
│   │   └── index.ts
│   ├── constants/   # Application constants
│   │   └── index.ts
│   ├── utils/      # Utility functions
│   │   ├── theme-utils.ts
│   │   ├── utils.ts
│   │   └── index.ts
│   ├── providers/  # Global providers
│   │   └── EnhancedThemeProvider.tsx
│   └── index.ts    # Shared barrel exports
├── features/       # Cross-cutting features
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── utils/
├── lib/           # External library configurations
│   ├── api/
│   └── trpc/     # tRPC configuration
│       ├── client.ts, server.ts
│       ├── routers/
│       └── provider.tsx
├── contexts/      # React contexts
├── hooks/         # Legacy hooks (being migrated)
├── examples/      # Usage examples
├── types/         # Global type definitions
├── __tests__/     # Test organization
│   ├── unit/     # Unit tests
│   ├── integration/ # Integration tests
│   └── e2e/     # End-to-end tests
├── __dev__/      # Development tools
│   └── stories/  # Storybook stories
└── app/         # Next.js app directory (pages and layouts)
    ├── admin/           # Admin pages
    ├── api-docs/        # API documentation pages
    ├── dashboard/       # Dashboard pages
    ├── projects/        # Project pages
    ├── settings/        # Settings pages
    ├── workflows/       # Workflow pages
    ├── login/, register/
    └── layout.tsx, page.tsx
```

### Key Architectural Benefits

#### 1. **Modular Organization**
- **Feature-based modules**: Each major feature (auth, admin, builder) is self-contained
- **Clear boundaries**: Modules have explicit interfaces and dependencies
- **Scalable structure**: New features can be added as independent modules

#### 2. **Shared Resources**
- **Centralized UI components**: Reusable components in `/shared/components/`
- **Common services**: API clients and utilities available across modules
- **Type safety**: Shared type definitions ensure consistency

#### 3. **Developer Experience**
- **Barrel exports**: Clean imports using module index files
- **Predictable structure**: Consistent organization across all modules
- **Easy navigation**: Intuitive file locations and naming conventions

#### 4. **Import Patterns**
```typescript
// Module imports
import { useAuth, ChangePasswordForm, SecuritySettings } from '@/modules/auth'
import { useUsers, useRoles, ActivityLogViewer } from '@/modules/admin'
import { WorkflowBuilder, WorkflowStateNode, ConditionalNode } from '@/modules/workflow'
import { useProjects, ProjectsList } from '@/modules/projects'
import { SwaggerUI, SwaggerErrorBoundary } from '@/modules/api-docs'

// Shared component imports
import { Button, Card, Input, Dialog, Table } from '@/shared/components/ui'
import { Sidebar, Header, DashboardLayout } from '@/shared/components/layout'
import { Breadcrumb, UserMenu } from '@/shared/components/navigation'
import { DataTable, KanbanBoard } from '@/shared/components/data-visualization'

// Shared service imports
import { apiClient, usersApi, rolesApi, workflowApi } from '@/shared/services/api'
import { useURLState, useApiQuery, useInfiniteScroll } from '@/shared/hooks'
import { User, Project, Role, Permission } from '@/shared/types'

// Utility imports
import { cn, formatDate, themeUtils } from '@/shared/utils'
```

## Features

### Core Framework
- **Authentication & Security**: JWT-based authentication, password hashing, CORS middleware, protected routes
- **Database & ORM**: PostgreSQL setup, SQLAlchemy ORM, Alembic migrations, advanced query optimization
- **Frontend Foundation**: Next.js with TypeScript, Tailwind CSS, ShadcnUI components, React optimization patterns
- **Testing & Quality**: Comprehensive testing with pytest (backend) and Playwright (e2e), Jest testing, Storybook documentation, code linting
- **Performance Optimization**: Advanced caching, database optimization, response compression, async patterns

### User Management & Settings
- **Unified Navigation**: Responsive left sidebar with expandable menu sections
- **User Settings Interface**: Comprehensive settings dashboard with tabbed navigation
- **Profile Management**: Update profile form with bio, location, website, and avatar
- **Security Settings**: 2FA setup, session management, email notifications, API access control
- **Password Management**: Password change with strength validation and visual feedback
- **Activity Monitoring**: Personal activity log viewer with filtering and export capabilities
- **Account Overview**: Real-time account status, verification, and member information

### ReactFlow Workflow System
- **Database-Driven Workflows**: Complete data models for workflow types, states, templates, and instances
- **Visual Workflow Builder**: ReactFlow-based canvas with drag-and-drop node creation
- **Custom Node Types**: State, Conditional, Parallel Gateway, Timer, and User Task nodes
- **Workflow Engine**: Complete execution engine with state transitions and SLA monitoring
- **Dynamic Templates**: Database-defined workflow types instead of hardcoded processes
- **Real-time Workflow Canvas**: Live workflow building and editing interface

### Workflow Capabilities
- **Business Process Automation**: Sales, Purchase, Invoice, and Payment workflows
- **State Management**: New, Confirmed, Cancelled, Done, Paid, Pending states
- **Conditional Logic**: Decision nodes with true/false branching
- **Parallel Processing**: Split and merge nodes for concurrent workflow paths
- **Timer Integration**: Time-based delays and scheduling in workflows
- **User Task Management**: Manual approval and assignment workflows
- **Role-based Permissions**: Workflow actions restricted by user roles
- **SLA Monitoring**: Automatic escalation and deadline tracking

### Enterprise Features
- **Role-Based Access Control**: Complete RBAC implementation with roles and permissions
- **System Roles**: Admin, Editor, Viewer, Member with predefined permissions
- **Project Collaboration**: Multi-user project access with role-based permissions
- **Permission Categories**: System, Project, Page, Component, User permissions
- **Permission Actions**: Create, Read, Update, Delete, Manage, Publish, Deploy
- **Project Membership**: Invite users to projects with specific roles
- **Security Middleware**: Route protection with permission checks
- **Enterprise UI**: Professional navigation, breadcrumbs, role-based menus

### Performance & Optimization
- **Advanced Caching**: Multi-tier caching with Memory, Redis, and Hybrid backends
- **Database Optimization**: Query profiling, slow query detection, connection pooling
- **Response Optimization**: Compression, minification, ETag support, conditional requests
- **Async Patterns**: Task management, resource pooling, circuit breakers, retry mechanisms
- **Performance Monitoring**: Real-time metrics, system monitoring, alert management
- **Frontend Optimization**: React memoization, component lazy loading, virtual scrolling

### Audit & Security
- **Activity Logging**: Comprehensive activity tracking with IP addresses, user agents, and metadata
- **Audit Trail**: Complete change tracking with old/new value comparisons
- **Security Events**: Login attempts, password changes, and suspicious activity monitoring
- **Data Export**: Activity logs and audit trails export in JSON/CSV formats
- **Bulk Operations**: Bulk cleanup and management of historical data
- **Statistics Dashboard**: Real-time insights into user activities and security metrics

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- PostgreSQL 12+

### Quick Start
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FastNext
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env  # Edit with your database credentials
   python main.py
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Swagger UI: http://localhost:3000/api-docs (Interactive API documentation)

### Documentation
- **[Backend Development Guide](docs/BACKEND_DEV.md)** - Backend development, testing, and deployment
- **[Frontend Development Guide](docs/FRONTEND_DEV.md)** - Frontend development, Storybook, and testing
- **[Testing Guide](TESTING.md)** - Comprehensive testing documentation for pytest and Playwright
- **[Frontend Coding Standards](CODING_STANDARDS.md)** - Frontend code quality guidelines and optimization patterns
- **[Backend Coding Standards](BACKEND_CODING_STANDARDS.md)** - Backend optimization patterns and performance guidelines
- **[CRUD System Documentation](CRUD_SYSTEM_DOCUMENTATION.md)** - Generic CRUD operations guide

## API Documentation & Testing

### Swagger UI Integration
The application includes a comprehensive Swagger UI integration for interactive API documentation and testing:

#### Features
- **Interactive Documentation**: Browse and test all API endpoints directly from the browser
- **Authentication Support**: Automatic token injection for protected endpoints
- **Real-time API Testing**: Test API endpoints with live data and see responses
- **Connection Status**: Real-time API server connectivity monitoring
- **Request/Response Inspection**: Detailed request and response information

#### Access Points
- **Built-in Swagger UI**: Access at `http://localhost:3000/api-docs` (Frontend integration)
- **FastAPI Docs**: Native documentation at `http://localhost:8000/docs`
- **OpenAPI Spec**: Raw specification at `http://localhost:8000/api/v1/openapi.json`

#### Usage
1. Start both backend and frontend servers
2. Navigate to `http://localhost:3000/api-docs`
3. The interface will automatically check API connectivity
4. Login to your account to test protected endpoints
5. Use the "Try it out" feature to test endpoints with real data

#### Authentication
- Protected endpoints require authentication
- Token is automatically injected when logged in
- Authentication status is displayed in the UI toolbar
- Failed authentication attempts are clearly indicated

## API Endpoints

### Authentication
- `POST /api/v1/auth/login/access-token` - Login user
- `POST /api/v1/auth/test-token` - Validate token

### Users & Profile
- `GET /api/v1/users/` - List users (protected)
- `POST /api/v1/users/` - Create user
- `GET /api/v1/users/me` - Get current user (protected)
- `PUT /api/v1/users/me` - Update current user (protected)
- `GET /api/v1/profile/me` - Get user profile
- `PUT /api/v1/profile/me` - Update user profile
- `PUT /api/v1/profile/me/password` - Change password

### Security Settings
- `GET /api/v1/security/settings` - Get security settings
- `PUT /api/v1/security/settings` - Update security settings
- `GET /api/v1/security/overview` - Get security overview
- `POST /api/v1/security/2fa/disable` - Disable 2FA

### Activity Logs
- `GET /api/v1/activity-logs/` - List activity logs (with filtering)
- `GET /api/v1/activity-logs/me` - Get current user's activity logs
- `GET /api/v1/activity-logs/{id}` - Get specific activity log
- `POST /api/v1/activity-logs/` - Create activity log (admin only)
- `PUT /api/v1/activity-logs/{id}` - Update activity log (admin only)
- `DELETE /api/v1/activity-logs/{id}` - Delete activity log (admin only)
- `GET /api/v1/activity-logs/stats/summary` - Get activity statistics
- `DELETE /api/v1/activity-logs/bulk` - Bulk delete activity logs (admin only)

### Audit Trails
- `GET /api/v1/audit-trails/` - List audit trails (admin only)
- `GET /api/v1/audit-trails/entity/{type}/{id}` - Get entity audit history
- `GET /api/v1/audit-trails/{id}` - Get specific audit trail
- `GET /api/v1/audit-trails/{id}/comparison` - Get structured value comparison
- `POST /api/v1/audit-trails/` - Create audit trail (admin only)
- `PUT /api/v1/audit-trails/{id}` - Update audit trail (limited fields, admin only)
- `GET /api/v1/audit-trails/stats/summary` - Get audit statistics
- `DELETE /api/v1/audit-trails/bulk` - Bulk delete audit trails (admin only)
- `GET /api/v1/audit-trails/export/{format}` - Export audit trails (CSV/JSON)

### Projects
- `GET /api/v1/projects/` - List user projects
- `POST /api/v1/projects/` - Create project
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Pages
- `GET /api/v1/pages/project/{project_id}/pages` - List project pages
- `POST /api/v1/pages/` - Create page
- `GET /api/v1/pages/{id}` - Get page details
- `PUT /api/v1/pages/{id}` - Update page
- `DELETE /api/v1/pages/{id}` - Delete page

### Components
- `GET /api/v1/components/` - List components (global & project-specific)
- `POST /api/v1/components/` - Create component
- `GET /api/v1/components/{id}` - Get component details
- `PUT /api/v1/components/{id}` - Update component

### Component Instances
- `GET /api/v1/components/instances/page/{page_id}` - List page components
- `POST /api/v1/components/instances/` - Create component instance
- `PUT /api/v1/components/instances/{id}` - Update component instance
- `DELETE /api/v1/components/instances/{id}` - Delete component instance

### Roles & Permissions
- `GET /api/v1/roles/` - List all roles (admin only)
- `POST /api/v1/roles/` - Create new role (admin only)
- `GET /api/v1/roles/{id}` - Get role with permissions (admin only)
- `PUT /api/v1/roles/{id}` - Update role (admin only)
- `DELETE /api/v1/roles/{id}` - Delete role (admin only)
- `POST /api/v1/roles/{id}/permissions` - Assign permission to role (admin only)
- `DELETE /api/v1/roles/{id}/permissions/{permission_id}` - Remove permission from role (admin only)

### Permissions
- `GET /api/v1/permissions/` - List all permissions (admin only)
- `POST /api/v1/permissions/` - Create new permission (admin only)
- `GET /api/v1/permissions/{id}` - Get permission details (admin only)
- `PUT /api/v1/permissions/{id}` - Update permission (admin only)
- `DELETE /api/v1/permissions/{id}` - Delete permission (admin only)

### Project Members
- `GET /api/v1/project-members/project/{project_id}/members` - List project members
- `POST /api/v1/project-members/project/{project_id}/members` - Add project member
- `POST /api/v1/project-members/project/{project_id}/invite` - Invite user by email
- `PUT /api/v1/project-members/members/{member_id}` - Update project member
- `DELETE /api/v1/project-members/members/{member_id}` - Remove project member
- `GET /api/v1/project-members/user/projects` - Get user's accessible projects

### Workflow Management
- `GET /api/v1/workflow-types/` - List workflow types
- `POST /api/v1/workflow-types/` - Create workflow type
- `GET /api/v1/workflow-types/{id}` - Get workflow type details
- `PUT /api/v1/workflow-types/{id}` - Update workflow type
- `DELETE /api/v1/workflow-types/{id}` - Delete workflow type (soft delete)

### Workflow States
- `GET /api/v1/workflow-states/` - List workflow states
- `POST /api/v1/workflow-states/` - Create workflow state
- `GET /api/v1/workflow-states/{id}` - Get workflow state details
- `PUT /api/v1/workflow-states/{id}` - Update workflow state
- `DELETE /api/v1/workflow-states/{id}` - Delete workflow state

### Workflow Templates
- `GET /api/v1/workflow-templates/` - List workflow templates
- `POST /api/v1/workflow-templates/` - Create workflow template
- `GET /api/v1/workflow-templates/{id}` - Get workflow template details
- `PUT /api/v1/workflow-templates/{id}` - Update workflow template
- `DELETE /api/v1/workflow-templates/{id}` - Delete workflow template

### Workflow Instances
- `GET /api/v1/workflow-instances/` - List workflow instances
- `POST /api/v1/workflow-instances/` - Create workflow instance
- `GET /api/v1/workflow-instances/{id}` - Get workflow instance details
- `PUT /api/v1/workflow-instances/{id}` - Update workflow instance
- `POST /api/v1/workflow-instances/{id}/execute` - Execute workflow action
- `GET /api/v1/workflow-instances/{id}/history` - Get workflow history

### Performance & Optimization
- `GET /api/v1/optimized-example/users` - Optimized paginated users with caching
- `GET /api/v1/optimized-example/users/{id}` - Optimized single user retrieval
- `GET /api/v1/optimized-example/analytics` - User analytics with async optimization
- `GET /api/v1/optimized-example/health-check` - Health check with performance metrics
- `POST /api/v1/optimized-example/users/batch-process` - Batch processing with optimization

## How to Use the Workflow System

1. **Start the Backend**:
   ```bash
   cd backend
   python main.py
   ```

2. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the Application**:
   - Visit `http://localhost:3000` for the main page
   - Register or login to access the platform
   - Use the left sidebar navigation to access different sections

### Application Navigation

#### **Settings Dashboard** (`/settings`)
- **Profile Tab**: Update personal information, bio, location, website
- **Security Tab**: Configure 2FA, session settings, email notifications
- **Password Tab**: Change password with strength validation
- **Activity Tab**: View personal activity history with filtering

#### **Administration** (Admin users only)
- **User Management** (`/admin/users`): Manage all system users
- **Role Management** (`/admin/roles`): Configure user roles and permissions
- **Permission Management** (`/admin/permissions`): Manage system permissions

#### **Projects & Workflows**
- **Projects** (`/projects`): Manage and create new projects
- **Workflows** (`/workflows`): ReactFlow-based workflow management system

### Key Capabilities

- **Unified Navigation**: Responsive left sidebar with role-based menu filtering
- **URL State Management**: Type-safe URL-based state with shareable links and browser history support
- **Comprehensive Settings**: Complete user profile and security management
- **Activity Monitoring**: Real-time activity logging with detailed tracking and URL-based filtering
- **Audit Trail**: Complete change history with old/new value comparisons
- **Security Features**: 2FA support, session management, and threat monitoring
- **ReactFlow Workflow System**: Visual workflow builder with custom node types
- **Workflow Types & Templates**: Database-driven workflow configuration system
- **State Management**: Configurable workflow states with transitions and permissions
- **Business Process Automation**: Sales, Purchase, Invoice, and Payment workflows
- **Execution Engine**: Complete workflow lifecycle management with SLA monitoring
- **Real-time Canvas**: Interactive ReactFlow-based workflow building interface
- **Enterprise Navigation**: Professional sidebar with breadcrumbs and role-based access
- **User Management**: Complete RBAC system with project collaboration

## URL State Management

The FastNext Framework includes comprehensive URL state management using nuqs, providing type-safe state synchronization with the browser URL. This enables shareable links, browser history support, and persistent filter states.

### Features
- **Type-safe URL parameters**: Automatic parsing and validation of URL query parameters
- **Shareable links**: Share filtered views and application states via URL
- **Browser history support**: Navigate back/forward through different states
- **Persistent state**: Filters, pagination, and view modes persist across page refreshes

### Built-in URL State Hooks

```typescript
import { 
  useSearchState,
  usePaginationState,
  useSortState,
  useViewModeState,
  useTabState,
  useFilterArrayState,
  useBooleanFilterState
} from '@/shared/hooks'

// Search functionality
const [search, setSearch] = useSearchState()

// Pagination with page and limit
const { page, setPage, limit, offset } = usePaginationState(1, 20)

// Sorting with field and direction
const { sortBy, setSortBy, sortOrder, setSortOrder } = useSortState('name', 'asc')

// View mode switching (grid/list)
const [viewMode, setViewMode] = useViewModeState(['grid', 'list'], 'grid')

// Tab navigation
const [activeTab, setActiveTab] = useTabState(['profile', 'security'], 'profile')
```

### Implementation Examples

#### Activity Log Filtering
The activity log viewer demonstrates comprehensive URL state management:
- Search queries in URL
- Pagination state preservation
- Filter combinations (action, level, time range)
- Sort preferences maintained

#### Settings Tab Navigation
Settings pages use URL-based tab state:
- Direct navigation to specific tabs via URL
- Shareable links to specific settings sections
- Browser back/forward navigation between tabs

#### Project Management
Project lists showcase advanced filtering:
- Search, status filtering, and sorting in URL
- View mode (grid/list) preference stored
- Pagination state across page refreshes

## Testing Infrastructure

The FastNext Framework includes comprehensive testing capabilities covering both backend unit/integration testing and frontend end-to-end testing.

### Backend Testing (pytest)
- **Test Framework**: pytest with async support and comprehensive fixtures
- **Coverage Reporting**: 80% minimum coverage requirement with HTML/XML reports
- **Test Structure**: Organized unit, integration, API, auth, workflow, and CRUD tests
- **Test Runner**: Advanced test runner script with multiple execution modes
- **Database Testing**: SQLite test database with automatic cleanup
- **Authentication Testing**: JWT token testing with admin and user fixtures
- **API Testing**: Complete endpoint testing with httpx client
- **Mock Support**: Factory-boy for test data generation and pytest-mock for mocking

#### Running Backend Tests
```bash
# Using the test runner (recommended)
cd backend
python test_runner.py

# Run specific test types
python test_runner.py --type unit
python test_runner.py --type api
python test_runner.py --type auth

# Run with parallel execution
python test_runner.py --parallel

# Generate comprehensive report
python test_runner.py --report
```

### Frontend E2E Testing (Playwright)
- **Multi-Browser Support**: Chrome, Firefox, Safari testing
- **Authentication State**: Stored login sessions for different user roles
- **Test Organization**: Structured tests for auth, admin, workflow, and API
- **Test Utilities**: Comprehensive helper functions for common operations
- **Responsive Testing**: Multi-device viewport testing
- **API Testing**: Direct API endpoint testing through Playwright
- **Screenshot/Video**: Automatic capture on test failures
- **Parallel Execution**: Concurrent test execution for faster feedback

#### Running E2E Tests
```bash
# Install dependencies
cd frontend
npm install
npx playwright install

# Run all e2e tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/auth/login.test.ts

# Generate test report
npx playwright show-report
```

### Test Coverage & Quality
- **Backend Coverage**: Minimum 80% code coverage with detailed HTML reports
- **Critical Path Coverage**: 100% coverage for authentication and security
- **API Endpoint Coverage**: Complete testing of all public endpoints
- **E2E Workflow Testing**: Full user journey testing across the application
- **Performance Testing**: Response time monitoring and load testing capabilities
- **Security Testing**: Authentication, authorization, and input validation testing

## Frontend Code Restructuring

### Modular Architecture Implementation ✅

The FastNext Framework frontend has been completely restructured into a modular architecture that promotes scalability, maintainability, and developer productivity. The new structure organizes code into feature-based modules with clear separation of concerns.

#### Key Restructuring Benefits

- **Feature-based Organization**: Each major feature (auth, admin, workflow, etc.) is self-contained
- **Clear Module Boundaries**: Explicit interfaces and dependencies between modules
- **Shared Resource Management**: Centralized UI components, services, and utilities
- **Improved Developer Experience**: Predictable file locations and clean import patterns
- **Enhanced Scalability**: New features can be added as independent modules
- **Better Testing Structure**: Organized test files with clear separation by feature

#### Migration Status

The restructuring is complete with the following organization:
- ✅ **Modules Directory**: Feature-based modules (auth, admin, workflow, projects, api-docs, dashboard, settings)
- ✅ **Shared Directory**: Reusable components, hooks, services, types, and utilities
- ✅ **Component Organization**: UI components organized by category (ui, layout, navigation, data-visualization)
- ✅ **Service Layer**: Structured API services with clear separation
- ✅ **Type Definitions**: Centralized type management with module-specific types
- ✅ **Hook Organization**: Shared hooks for common functionality (URL state, API queries, etc.)
- ✅ **Testing Structure**: E2E tests organized by feature with comprehensive utilities

#### Development Workflow

With the new structure, developers can:
- Work on features in isolation within their respective modules
- Import components and services using clean, predictable paths
- Leverage shared resources across modules without duplication
- Add new features by creating new modules following established patterns
- Test features independently with organized test suites

For detailed information about the restructuring process, see `RESTRUCTURING_SUMMARY.md`.

## Recent Updates & Improvements

### Latest Changes ✅
- **🚀 Performance Optimization Framework**: Complete backend optimization with advanced caching, database optimization, and async patterns
- **⚡ Frontend Optimization**: React memoization patterns, component lazy loading, virtual scrolling, and performance monitoring
- **🔄 Advanced Caching System**: Multi-tier caching with Memory, Redis, and Hybrid backends with intelligent eviction
- **📊 Performance Monitoring**: Real-time metrics, system monitoring, alert management, and comprehensive analytics
- **🗄️ Database Optimization**: Query profiling, slow query detection, connection pooling, and batch processing
- **🌐 Response Optimization**: Compression, minification, ETag support, and conditional request handling
- **⚡ Async Optimization**: Task management, resource pooling, circuit breakers, and retry mechanisms
- **📈 Performance Budgets**: Automated performance thresholds with alerting and monitoring
- **🛠️ Optimization Patterns**: Comprehensive coding standards and best practices for both frontend and backend
- **Comprehensive Testing Infrastructure**: Added pytest for backend testing and Playwright for e2e testing with complete documentation
- **Test Coverage Requirements**: Implemented 80% minimum coverage with HTML/XML reporting and CI/CD integration
- **ReactFlow Workflow System**: Complete workflow management system with visual builder, custom nodes, and execution engine
- **Database-Driven Workflows**: Dynamic workflow types, states, and templates stored in database instead of hardcoded
- **URL State Management**: Integrated nuqs for type-safe URL-based state management across the application
- **Backend Architecture Enhancements**: Improved API structure, enhanced CRUD operations, and better error handling
- **Modular Frontend Architecture**: Complete restructuring into feature-based modules with clear separation of concerns

### Core Framework Features ✅
- **Unified Navigation**: Responsive left sidebar with expandable sections
- **Settings Dashboard**: Complete user settings interface with tabbed navigation
- **Security Management**: 2FA setup, session controls, and notification preferences
- **Activity Monitoring**: Personal activity logs with filtering and export
- **Audit Trail System**: Comprehensive change tracking with value comparisons
- **Swagger UI Integration**: Interactive API documentation with authentication support
- **Enhanced Backend Structure**: Organized API routes, services, and middleware layers

### ReactFlow Workflow System ✅
- **Visual Workflow Builder**: ReactFlow-based canvas with drag-and-drop interface
- **5 Custom Node Types**: State, Conditional, Parallel Gateway, Timer, User Task nodes
- **Database-Driven**: Workflow types, states, and templates stored in database
- **Execution Engine**: Complete workflow lifecycle with state transitions
- **Business Process Support**: Sales, Purchase, Invoice, Payment workflows
- **Role-Based Permissions**: Action restrictions based on user roles
- **SLA Monitoring**: Automatic escalation and deadline tracking
- **Comprehensive Testing**: Backend models, APIs, engine, and frontend components
- **Sidebar Integration**: Unified navigation with other application sections

### Development & Code Quality ✅
- **Modular Code Organization**: Feature-based modules with clear boundaries
- **CRUD System Template**: Generic CRUD operations for rapid development
- **Code Standards**: Established coding standards and best practices
- **Import Path Structure**: Organized import paths with TypeScript path mapping
- **Testing Infrastructure**: Complete pytest and Playwright testing setup with 80% coverage requirements
- **Test Documentation**: Comprehensive testing guide with examples and CI/CD integration
- **Development Tools**: Enhanced development workflow with better tooling

## Upcoming Features
- **Advanced Workflow Features**: Enhanced conditional logic, loops, and dynamic routing
- **Workflow Analytics**: Performance metrics, bottleneck analysis, and optimization insights
- **Integration Framework**: External system connectors and API integrations
- **Advanced Security**: TOTP 2FA implementation and hardware key support
- **Data Visualization**: Activity and security analytics dashboards
- **Notification System**: Real-time in-app notifications and email alerts
- **Workflow Templates Library**: Pre-built workflow templates for common business processes
- **Mobile Workflow Management**: Native mobile app for workflow monitoring and approvals
- **Advanced SLA Management**: Complex escalation rules and automated notifications

## License

MIT License - see LICENSE file for details.