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

### Development Tools
- **Jest** - JavaScript testing framework
- **Storybook** - Tool for building UI components in isolation
- **Pylint** - Python code analysis tool
- **Biome** - Fast formatter and linter for JavaScript/TypeScript
- **Swagger UI** - Interactive API documentation and testing interface

## Project Structure

```
FastNext/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── auth/         # Authentication logic
│   │   ├── core/         # Core configurations
│   │   ├── db/           # Database configurations
│   │   ├── models/       # SQLAlchemy models
│   │   └── schemas/      # Pydantic schemas
│   ├── main.py           # FastAPI application entry point
│   └── requirements.txt  # Python dependencies
├── frontend/             # Next.js frontend
│   ├── src/
│   │   ├── app/          # Next.js app directory
│   │   ├── components/   # React components
│   │   └── lib/          # Utility functions
│   ├── .storybook/       # Storybook configuration
│   └── package.json      # Node.js dependencies
└── README.md
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
- **Comprehensive Settings**: Complete user profile and security management
- **Activity Monitoring**: Real-time activity logging with detailed tracking
- **Audit Trail**: Complete change history with old/new value comparisons
- **Security Features**: 2FA support, session management, and threat monitoring
- **Visual Builder**: Complete drag-and-drop builder with component library
- **Dynamic Components**: Pre-built Text, Button, Image, Layout, and Form components
- **Property Editing**: Dynamic forms generated from component schemas
- **Nested Layouts**: Container components that can hold other components
- **Real-time Updates**: Immediate visual feedback for all changes
- **Enterprise Navigation**: Professional sidebar with breadcrumbs and role-based access
- **User Management**: Complete RBAC system with project collaboration

## Roadmap

### Recently Added ✅
- **Unified Navigation**: Responsive left sidebar with expandable sections
- **Settings Dashboard**: Complete user settings interface with tabbed navigation
- **Security Management**: 2FA setup, session controls, and notification preferences
- **Activity Monitoring**: Personal activity logs with filtering and export
- **Audit Trail System**: Comprehensive change tracking with value comparisons
- **Dashboard Conversion**: Transformed dashboard into user settings interface

### Upcoming Features
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