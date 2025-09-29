# FastNext Documentation

This directory contains comprehensive documentation for the FastNext framework. All documentation has been organized by category for easier navigation.

## 📚 Main Documentation

- [**Main README**](../README.md) - Complete project overview and quick start guide
- [**Contributing Guide**](CONTRIBUTING.md) - How to contribute to the project
- [**Code of Conduct**](CODE_OF_CONDUCT.md) - Community guidelines
- [**Coding Standards**](CODING_STANDARDS.md) - General coding standards across the project
- [**Testing Guide**](TESTING.md) - Testing strategies and best practices
- [**Docker Deployment**](DOCKER_DEPLOYMENT.md) - Deployment with Docker and Docker Compose

## 🔧 Backend Documentation

Located in [`docs/backend/`](backend/):

- [**Development Guide**](backend/DEVELOPMENT.md) - Backend development setup and guidelines
- [**Backend Coding Standards**](backend/BACKEND_CODING_STANDARDS.md) - Python/FastAPI specific standards
- [**Backend Structure Improvements**](backend/BACKEND_STRUCTURE_IMPROVEMENTS.md) - Architecture improvements
- [**CRUD System Documentation**](backend/CRUD_SYSTEM_DOCUMENTATION.md) - CRUD operations guide

## 🎨 Frontend Documentation

Located in [`docs/frontend/`](frontend/):

- [**Development Guide**](frontend/DEVELOPMENT.md) - Frontend development setup and guidelines
- [**Data Fetching Guide**](frontend/DATA_FETCHING_GUIDE.md) - Data fetching patterns and best practices
- [**API Migration Summary**](frontend/FRONTEND_API_MIGRATION_SUMMARY.md) - Frontend API integration guide
- [**Dynamic Import/Export Guide**](frontend/DYNAMIC_IMPORT_EXPORT.md) - New dynamic settings pages documentation

## 🔄 Workflow System

- [**Workflow System Overview**](WORKFLOW_SYSTEM.md) - Complete workflow system documentation
- [**Workflow API Guide**](WORKFLOW_API_GUIDE.md) - API reference for workflow endpoints
- [**Workflow Tutorial**](WORKFLOW_TUTORIAL.md) - Step-by-step workflow tutorial
- [**Workflow README**](WORKFLOW_README.md) - Workflow-specific setup and usage

## 📊 Data Management

- [**Import/Export Guide**](IMPORT_EXPORT_GUIDE.md) - Comprehensive import/export system documentation with **Dynamic Table Selection**
- [**API Export Guide**](API_EXPORT_GUIDE.md) - API documentation export and management
- [**Dynamic Import/Export Examples**](DYNAMIC_IMPORT_EXPORT_EXAMPLES.md) - Usage examples and troubleshooting

## 🆕 Latest Updates

### Dynamic Import/Export System (NEW!)

FastNext now includes a revolutionary Dynamic Import/Export system with the following features:

#### 🎯 Key Features
- **Auto-Discovery**: Automatically discover all database tables
- **Schema Detection**: Real-time table schema analysis
- **Smart Field Mapping**: Automatic field mapping based on table structure
- **Settings Integration**: Dedicated settings pages at `/settings/data-import` and `/settings/data-export`
- **Permission Control**: Table-specific permissions with real-time validation

#### 📱 User Interface
- **Dynamic Table Selection**: Choose any database table from dropdown
- **Live Data Preview**: Real-time data preview with search and filtering
- **Permission Display**: Clear indication of user permissions and limits
- **Integrated Components**: Full import/export functionality with field mapping

#### 🔗 API Endpoints
- `GET /api/v1/data/tables/available` - Get all available database tables
- `GET /api/v1/data/tables/{table_name}/schema` - Get table schema and structure
- `GET /api/v1/data/tables/{table_name}/permissions` - Get user permissions for table

#### 📖 Documentation
- [**Dynamic Import/Export Guide**](frontend/DYNAMIC_IMPORT_EXPORT.md) - Complete frontend implementation guide
- [**Usage Examples**](DYNAMIC_IMPORT_EXPORT_EXAMPLES.md) - Comprehensive examples and troubleshooting
- [**API Reference**](IMPORT_EXPORT_GUIDE.md#table-discovery-endpoints-new) - Updated API documentation

## 🏗️ Project Structure

```
docs/
├── README.md                    # This file - documentation index
├── CONTRIBUTING.md              # Contributing guidelines
├── CODE_OF_CONDUCT.md          # Community guidelines
├── CODING_STANDARDS.md         # General coding standards
├── TESTING.md                  # Testing documentation
├── DOCKER_DEPLOYMENT.md        # Docker deployment guide
│
├── backend/                    # Backend-specific documentation
│   ├── DEVELOPMENT.md         # Backend development guide
│   ├── BACKEND_CODING_STANDARDS.md # Python/FastAPI standards
│   ├── BACKEND_STRUCTURE_IMPROVEMENTS.md # Architecture improvements
│   └── CRUD_SYSTEM_DOCUMENTATION.md # CRUD system guide
│
├── frontend/                   # Frontend-specific documentation
│   ├── DEVELOPMENT.md         # Frontend development guide
│   ├── DATA_FETCHING_GUIDE.md # Data fetching patterns
│   ├── FRONTEND_API_MIGRATION_SUMMARY.md # API integration
│   └── DYNAMIC_IMPORT_EXPORT.md # Dynamic settings pages (NEW!)
│
├── WORKFLOW_SYSTEM.md         # Workflow system overview
├── WORKFLOW_API_GUIDE.md      # Workflow API reference
├── WORKFLOW_TUTORIAL.md       # Workflow tutorial
├── WORKFLOW_README.md         # Workflow setup guide
├── IMPORT_EXPORT_GUIDE.md     # Import/export system with dynamic features
├── API_EXPORT_GUIDE.md        # API documentation export
└── DYNAMIC_IMPORT_EXPORT_EXAMPLES.md # Usage examples (NEW!)
```

## 🚀 Quick Navigation

### For Developers New to the Project
1. Start with the [Main README](../README.md)
2. Read the [Contributing Guide](CONTRIBUTING.md)
3. Follow the appropriate development guide:
   - [Backend Development](backend/DEVELOPMENT.md)
   - [Frontend Development](frontend/DEVELOPMENT.md)

### For Backend Development
- [Backend Development Guide](backend/DEVELOPMENT.md)
- [Backend Coding Standards](backend/BACKEND_CODING_STANDARDS.md)
- [CRUD System Guide](backend/CRUD_SYSTEM_DOCUMENTATION.md)

### For Frontend Development
- [Frontend Development Guide](frontend/DEVELOPMENT.md)
- [Data Fetching Guide](frontend/DATA_FETCHING_GUIDE.md)
- [API Migration Guide](frontend/FRONTEND_API_MIGRATION_SUMMARY.md)
- [Dynamic Import/Export Guide](frontend/DYNAMIC_IMPORT_EXPORT.md) ⭐ **NEW!**

### For Dynamic Import/Export Features ⭐
- [Complete Guide](IMPORT_EXPORT_GUIDE.md) - System overview with dynamic features
- [Frontend Implementation](frontend/DYNAMIC_IMPORT_EXPORT.md) - Settings pages and components
- [Usage Examples](DYNAMIC_IMPORT_EXPORT_EXAMPLES.md) - Comprehensive examples and troubleshooting
- **Quick Start**: Navigate to `/settings/data-import` or `/settings/data-export`

### For Workflow Features
- [Workflow System Overview](WORKFLOW_SYSTEM.md)
- [Workflow API Guide](WORKFLOW_API_GUIDE.md)
- [Workflow Tutorial](WORKFLOW_TUTORIAL.md)

### For Data Management
- [Import/Export Guide](IMPORT_EXPORT_GUIDE.md) - Complete system with dynamic table selection
- [API Export Guide](API_EXPORT_GUIDE.md)
- [Usage Examples](DYNAMIC_IMPORT_EXPORT_EXAMPLES.md) - Real-world scenarios

### For DevOps/Deployment
- [Docker Deployment Guide](DOCKER_DEPLOYMENT.md)
- [Testing Guide](TESTING.md)

## 🤝 Contributing to Documentation

When adding new documentation:

1. **Backend docs**: Place in `docs/backend/`
2. **Frontend docs**: Place in `docs/frontend/`
3. **General docs**: Place in `docs/` root
4. **Update this index**: Add links to new documentation in this README
5. **Follow naming conventions**: Use clear, descriptive filenames
6. **Include table of contents**: For longer documents
7. **Cross-reference**: Link to related documentation

## 📋 Documentation Standards

- Use clear, descriptive headings
- Include code examples where applicable
- Add table of contents for documents over 100 lines
- Use consistent markdown formatting
- Include links to related documentation
- Keep documentation up-to-date with code changes

## 🎯 Recent Documentation Updates

### Dynamic Import/Export System Documentation
- ✅ Updated main README with dynamic features
- ✅ Enhanced IMPORT_EXPORT_GUIDE with table discovery
- ✅ Created frontend implementation guide
- ✅ Added comprehensive usage examples
- ✅ Updated API documentation with new endpoints

### Navigation Improvements
- ✅ Reorganized documentation structure
- ✅ Added cross-references between related docs
- ✅ Created quick navigation sections
- ✅ Added feature badges for new functionality

---

For the latest updates and additional resources, visit the [main project README](../README.md).