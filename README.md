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

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- PostgreSQL 12+

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. Start the server:
   ```bash
   python main.py
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Available Scripts

#### Backend
- `python main.py` - Start FastAPI server
- `pylint app/` - Run Python linting

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run Jest tests
- `npm run storybook` - Start Storybook
- `npm run biome` - Run Biome linting
- `npm run biome:fix` - Fix Biome issues

## API Endpoints

### Authentication
- `POST /api/v1/auth/login/access-token` - Login user
- `POST /api/v1/auth/test-token` - Validate token

### Users
- `GET /api/v1/users/` - List users (protected)
- `POST /api/v1/users/` - Create user
- `GET /api/v1/users/me` - Get current user (protected)
- `PUT /api/v1/users/me` - Update current user (protected)

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

3. **Access the Builder**:
   - Visit `http://localhost:3000` for the main page
   - Navigate to `/builder` to access the visual builder
   - Drag components from the left panel to the canvas
   - Select components to edit their properties in the right panel
   - Use the enterprise navigation for role-based access to different modules

### Key Capabilities

- **Visual Interface**: Complete drag-and-drop builder with component library
- **Dynamic Components**: Pre-built Text, Button, Image, Layout, and Form components
- **Property Editing**: Dynamic forms generated from component schemas
- **Nested Layouts**: Container components that can hold other components
- **Real-time Updates**: Immediate visual feedback for all changes
- **Enterprise Navigation**: Professional sidebar with breadcrumbs and role-based access
- **User Management**: Complete RBAC system with project collaboration

## Roadmap

### Upcoming Features
- **App Preview & Deployment**: Live preview generation and one-click deployment
- **File Upload & Media Management**: Asset storage and media handling
- **App Templates**: Pre-built templates and starter kits
- **Analytics & Tracking**: Usage metrics and performance monitoring
- **Advanced Components**: Charts, tables, and data visualization components

## License

MIT License - see LICENSE file for details.