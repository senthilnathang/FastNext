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
│   │   ├── hooks/            # Authentication hooks
│   │   ├── services/         # Auth context and services
│   │   ├── types/           # Authentication types
│   │   └── index.ts         # Module barrel exports
│   ├── admin/               # Administration module
│   │   ├── components/      # Admin UI components
│   │   ├── hooks/          # Admin management hooks
│   │   ├── types/          # Admin type definitions
│   │   └── index.ts
│   ├── api-docs/           # API documentation module
│   │   ├── components/     # Swagger UI components
│   │   ├── types/         # API documentation types
│   │   └── index.ts
│   ├── workflow/         # ReactFlow-based workflow system
│   │   ├── components/    # Workflow UI components (ReactFlow nodes/edges)
│   │   ├── hooks/        # Workflow state management
│   │   ├── types/       # Workflow type definitions
│   │   ├── templates/   # Workflow template system
│   │   └── index.ts
│   ├── projects/         # Project management
│   │   ├── hooks/       # Project management hooks
│   │   ├── types/      # Project types
│   │   └── index.ts
│   └── settings/        # User settings module
├── shared/             # Shared resources across modules
│   ├── components/    # Reusable UI components
│   │   ├── ui/       # Base UI components (Button, Card, etc.)
│   │   └── layout/   # Layout components
│   ├── hooks/        # Shared custom hooks
│   ├── services/     # API client and shared services
│   │   └── api/     # API service layer
│   ├── types/       # Global type definitions
│   ├── constants/   # Application constants
│   ├── utils/      # Utility functions
│   └── index.ts    # Shared barrel exports
├── features/       # Cross-cutting features
├── tests/        # Test organization
│   └── e2e/     # End-to-end tests with Playwright
│       ├── auth/           # Authentication e2e tests
│       ├── admin/          # Admin panel e2e tests
│       ├── workflow/       # Workflow e2e tests
│       ├── api/            # Direct API e2e tests
│       └── utils/          # Test utilities and helpers
├── __dev__/      # Development tools
│   └── stories/  # Storybook stories
└── app/         # Next.js app directory (pages and layouts)
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
import { useAuth, LoginForm } from '@/modules/auth'
import { UserManager, RoleEditor } from '@/modules/admin'
import { WorkflowBuilder, WorkflowStateNode } from '@/modules/workflow'

// Shared imports
import { Button, Card, Input } from '@/shared/components'
import { apiClient, formatDate } from '@/shared/services'
import { User, Project } from '@/shared/types'
```

## Features

### Core Framework
- **Authentication & Security**: JWT-based authentication, password hashing, CORS middleware, protected routes
- **Database & ORM**: PostgreSQL setup, SQLAlchemy ORM, Alembic migrations
- **Frontend Foundation**: Next.js with TypeScript, Tailwind CSS, ShadcnUI components
- **Testing & Quality**: Comprehensive testing with pytest (backend) and Playwright (e2e), Jest testing, Storybook documentation, code linting

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
- **[Coding Standards](CODING_STANDARDS.md)** - Code quality guidelines and best practices
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

## Recent Updates & Improvements

### Latest Changes ✅
- **Comprehensive Testing Infrastructure**: Added pytest for backend testing and Playwright for e2e testing with complete documentation
- **Test Coverage Requirements**: Implemented 80% minimum coverage with HTML/XML reporting and CI/CD integration
- **Advanced Test Runner**: Built comprehensive test runner with multiple execution modes and cleanup utilities
- **E2E Testing Suite**: Complete Playwright setup with multi-browser testing and authentication state management
- **ReactFlow Workflow System**: Complete workflow management system with visual builder, custom nodes, and execution engine
- **Database-Driven Workflows**: Dynamic workflow types, states, and templates stored in database instead of hardcoded
- **Workflow Builder Removal**: Removed incompatible /builder system and replaced with ReactFlow-based workflow system
- **Custom Node Types**: State, Conditional, Parallel Gateway, Timer, and User Task nodes for comprehensive workflow building
- **Workflow Engine**: Complete execution engine with state transitions, SLA monitoring, and role-based permissions
- **URL State Management**: Integrated nuqs for type-safe URL-based state management across the application
- **Backend Architecture Enhancements**: Improved API structure, enhanced CRUD operations, and better error handling
- **User, Role & Permission System**: Complete RBAC implementation with enhanced permission management
- **Modular Frontend Architecture**: Feature-based modules with clear separation of concerns and barrel exports
- **Code Quality & Standards**: Comprehensive coding standards, linting improvements, and documentation

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