# FastNext Framework

A comprehensive full-stack web application framework built with modern technologies for rapid development.

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

## Stage 1 Features ✅

### Authentication & Security
- JWT-based authentication
- Password hashing with bcrypt
- CORS middleware configuration
- Protected API routes

### Database & ORM
- PostgreSQL database setup
- SQLAlchemy ORM with models
- Alembic database migrations
- User model with CRUD operations

### Frontend Setup
- Next.js with TypeScript
- Tailwind CSS integration
- ShadcnUI component library
- Responsive design foundation

### Testing & Quality
- Jest configuration for unit testing
- Storybook for component documentation
- Pylint for Python code quality
- Biome for JavaScript/TypeScript linting

## Stage 2 Features ✅

### Custom App Builder Core
- **Database Schema**: Complete data models for projects, pages, components, and instances
- **Component Management API**: Full CRUD operations for all builder entities
- **Drag-and-Drop Interface**: Visual builder with @dnd-kit integration
- **Component Library System**: Pre-built components (Text, Button, Image, Layout, Form)
- **Property Panel**: Dynamic form generation based on component schemas
- **Real-time Canvas**: Live preview and editing of component layouts

### Advanced Features
- **Component Types**: Text, Button, Image, Layout containers, Form inputs
- **Dynamic Properties**: Schema-driven property panels with validation
- **Nested Components**: Support for container components with children
- **Component Reordering**: Drag-and-drop reordering within containers
- **Visual Feedback**: Selection highlighting, hover states, drag previews

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

## Next Steps

### Stage 3 (Upcoming)
- **App Preview & Deployment**: Live preview generation and one-click deployment
- **User Roles & Permissions**: Project ownership and collaboration features
- **File Upload & Media Management**: Asset storage and media handling
- **App Templates**: Pre-built templates and starter kits
- **Analytics & Tracking**: Usage metrics and performance monitoring

### How to Use the Builder

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
   - Click "🚀 Try Builder" to access the visual builder
   - Drag components from the left panel to the canvas
   - Select components to edit their properties in the right panel

### Key Features Demonstrated

- **Visual Interface**: Complete drag-and-drop builder with component library
- **Dynamic Components**: Pre-built Text, Button, Image, Layout, and Form components
- **Property Editing**: Dynamic forms generated from component schemas
- **Nested Layouts**: Container components that can hold other components
- **Real-time Updates**: Immediate visual feedback for all changes

## License

MIT License - see LICENSE file for details.