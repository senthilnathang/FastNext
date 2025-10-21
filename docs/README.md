# FastNext Documentation

This directory contains comprehensive documentation for the FastNext framework. All documentation has been organized by category for easier navigation.

## 📚 Main Documentation

- [**Main README**](../README.md) - Complete project overview and quick start guide
- [**Changelog**](../CHANGELOG.md) - Version history and recent updates
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

## 📈 Event Logging & Monitoring

Located in [`docs/features/`](features/):

- [**Event Logging System Guide**](features/EVENT_LOGGING_SYSTEM.md) - Comprehensive event logging and activity monitoring documentation
- [**Quick Start Guide**](QUICK_START_EVENT_LOGGING.md) - Get started with event logging in 5 minutes
- [**Authentication Verification**](features/AUTHENTICATION_VERIFICATION.md) - Authentication system verification and testing

## 🆕 Latest Updates

### 🔧 Recent Critical Fixes (October 2025)

**User Management UI Enhancements:**
- ✅ **Fixed Missing Action Buttons**: Resolved missing Edit/Delete buttons in admin/users List View and Card View
- ✅ **Type System Fixes**: Aligned ViewManager component types with User model for proper prop passing
- ✅ **Prop Passing Optimization**: Improved CommonFormViewManager prop handling for better component communication

**Impact**: Admin users can now properly edit and delete users through the web interface, with full CRUD functionality restored.

### Event Logging & Activity Monitoring System (NEW!) 🎉

FastNext now includes an enterprise-grade event logging and activity monitoring system inspired by VerifyWise's WatchTower Events:

#### 🎯 Key Features
- **Comprehensive Event Tracking**: Authentication, data operations, security events, API calls
- **Real-Time Dashboard**: Live event monitoring with auto-refresh and statistics
- **Advanced Analytics**: Event trends, user activity patterns, and risk assessment
- **Export Capabilities**: JSON and CSV export with advanced filtering
- **Risk Scoring**: Automatic risk assessment (0-100) based on event patterns
- **Geographic Tracking**: IP geolocation and session monitoring

#### 📱 User Interface
- **Admin Dashboard**: Navigate to **Admin → Event Logs** for real-time monitoring
- **Event Details**: Comprehensive drill-down with request info and metadata
- **Advanced Filtering**: Multi-level filtering by level, category, action, user, risk score
- **Auto-refresh**: Configurable refresh intervals (30s-5m) for real-time updates

#### 🔧 Technical Implementation
- **Dual Logging**: Database + file-based logging with daily rotation
- **Enhanced Models**: Extended ActivityLog with JSON metadata and indexing
- **Performance Optimized**: Efficient querying with proper database indexes
- **API Endpoints**: RESTful API with pagination and advanced filtering

#### 📖 Documentation
- [**Event Logging System Guide**](features/EVENT_LOGGING_SYSTEM.md) - Complete implementation documentation
- [**Quick Start Guide**](QUICK_START_EVENT_LOGGING.md) - Get started in 5 minutes
- **API Reference**: Available at `/docs#/v1-events` for API documentation

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
├── QUICK_START_EVENT_LOGGING.md # Event logging quick start (NEW!)
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
├── features/                   # Feature-specific documentation (NEW!)
│   ├── EVENT_LOGGING_SYSTEM.md # Complete event logging guide (NEW!)
│   └── AUTHENTICATION_VERIFICATION.md # Auth verification
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

### For Event Logging & Monitoring ⭐ **NEW!**
- [Complete Event Logging Guide](features/EVENT_LOGGING_SYSTEM.md) - System overview and implementation
- [Quick Start Guide](QUICK_START_EVENT_LOGGING.md) - Get started in 5 minutes
- **Admin Interface**: Navigate to **Admin → Event Logs** in the dashboard
- **API Reference**: Available at `/docs#/v1-events` for API documentation

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

### Event Logging & Activity Monitoring System Documentation (NEW!)
- ✅ Created comprehensive Event Logging System Guide
- ✅ Added Quick Start Guide for immediate usage
- ✅ Updated main README with event logging features
- ✅ Added project structure documentation
- ✅ Updated navigation and documentation index
- ✅ API reference available at `/docs#/v1-events`

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
- ✅ Created features/ directory for feature-specific docs

### User Management UI Fixes Documentation
- ✅ Updated main README with recent UI fixes
- ✅ Added documentation for ViewManager type system improvements
- ✅ Updated admin guide with user management interface enhancements

---

For the latest updates and additional resources, visit the [main project README](../README.md).
