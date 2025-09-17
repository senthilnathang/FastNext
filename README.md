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

## Next Steps

Stage 1 provides a solid foundation. Future stages will include:
- Custom App Builder functionality
- Advanced ORM features
- Enhanced UI components
- Automated testing pipeline
- Deployment configurations

## License

MIT License - see LICENSE file for details.