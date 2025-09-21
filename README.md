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
│   ├── builder/           # Visual page builder
│   │   ├── components/    # Builder UI components
│   │   ├── hooks/        # Builder state management
│   │   ├── types/       # Builder type definitions
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
├── __tests__/     # Test organization
│   ├── unit/     # Unit tests
│   ├── integration/ # Integration tests
│   └── e2e/     # End-to-end tests
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
import { ComponentLibrary, Canvas } from '@/modules/builder'

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
- **Testing & Quality**: Jest testing, Storybook documentation, code linting

### User Management & Settings
- **Unified Navigation**: Responsive left sidebar with expandable menu sections
- **User Settings Interface**: Comprehensive settings dashboard with tabbed navigation
- **Profile Management**: Update profile form with bio, location, website, and avatar
- **Security Settings**: 2FA setup, session management, email notifications, API access control
- **Password Management**: Password change with strength validation and visual feedback
- **Activity Monitoring**: Personal activity log viewer with filtering and export capabilities
- **Account Overview**: Real-time account status, verification, and member information

### Visual App Builder
- **Database Schema**: Complete data models for projects, pages, components, and instances
- **Component Management API**: Full CRUD operations for all builder entities
- **Drag-and-Drop Interface**: Visual builder with @dnd-kit integration
- **Component Library System**: Pre-built components (Text, Button, Image, Layout, Form)
- **Property Panel**: Dynamic form generation based on component schemas
- **Real-time Canvas**: Live preview and editing of component layouts

### Advanced Capabilities
- **Component Types**: Text, Button, Image, Layout containers, Form inputs
- **Dynamic Properties**: Schema-driven property panels with validation
- **Nested Components**: Support for container components with children
- **Component Reordering**: Drag-and-drop reordering within containers
- **Visual Feedback**: Selection highlighting, hover states, drag previews

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

## How to Use the Builder

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

#### **Projects & Builder**
- **Projects** (`/projects`): Manage and create new projects
- **Visual Builder** (`/builder`): Drag-and-drop interface for building applications

### Key Capabilities

- **Unified Navigation**: Responsive left sidebar with role-based menu filtering
- **URL State Management**: Type-safe URL-based state with shareable links and browser history support
- **Comprehensive Settings**: Complete user profile and security management
- **Activity Monitoring**: Real-time activity logging with detailed tracking and URL-based filtering
- **Audit Trail**: Complete change history with old/new value comparisons
- **Security Features**: 2FA support, session management, and threat monitoring
- **Visual Builder**: Complete drag-and-drop builder with component library
- **Dynamic Components**: Pre-built Text, Button, Image, Layout, and Form components
- **Property Editing**: Dynamic forms generated from component schemas
- **Nested Layouts**: Container components that can hold other components
- **Real-time Updates**: Immediate visual feedback for all changes
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

## Recent Updates & Improvements

### Latest Changes ✅
- **URL State Management**: Integrated nuqs for type-safe URL-based state management across the application
- **Backend Architecture Enhancements**: Improved API structure, enhanced CRUD operations, and better error handling
- **User, Role & Permission System**: Complete RBAC implementation with enhanced permission management
- **Project Model Improvements**: Enhanced project structure and data models for better scalability
- **Modular Frontend Architecture**: Feature-based modules with clear separation of concerns and barrel exports
- **Code Quality & Standards**: Comprehensive coding standards, linting improvements, and documentation
- **Import Path Optimization**: Systematic import path updates for better module organization
- **Enhanced Testing**: Improved test coverage and testing infrastructure
- **Documentation Updates**: Added comprehensive developer guides and API documentation

### Core Framework Features ✅
- **Unified Navigation**: Responsive left sidebar with expandable sections
- **Settings Dashboard**: Complete user settings interface with tabbed navigation
- **Security Management**: 2FA setup, session controls, and notification preferences
- **Activity Monitoring**: Personal activity logs with filtering and export
- **Audit Trail System**: Comprehensive change tracking with value comparisons
- **Swagger UI Integration**: Interactive API documentation with authentication support
- **Enhanced Backend Structure**: Organized API routes, services, and middleware layers

### Development & Code Quality ✅
- **Modular Code Organization**: Feature-based modules with clear boundaries
- **CRUD System Template**: Generic CRUD operations for rapid development
- **Code Standards**: Established coding standards and best practices
- **Import Path Structure**: Organized import paths with TypeScript path mapping
- **Testing Infrastructure**: Unit, integration, and E2E testing setup
- **Development Tools**: Enhanced development workflow with better tooling

## Upcoming Features
- **Advanced Security**: TOTP 2FA implementation and hardware key support
- **Data Visualization**: Activity and security analytics dashboards
- **Notification System**: Real-time in-app notifications and email alerts
- **App Preview & Deployment**: Live preview generation and one-click deployment
- **File Upload & Media Management**: Asset storage and media handling
- **App Templates**: Pre-built templates and starter kits
- **Advanced Components**: Charts, tables, and data visualization components
- **Mobile Application**: Native mobile app for platform management

## License

MIT License - see LICENSE file for details.