# Data Import Examples

This directory contains example files and documentation for testing the FastNext data import functionality.

## 📁 Directory Structure

```
examples/data-import/
├── README.md                    # This file
├── DEMO_IMPORT_GUIDE.md        # Detailed guide for using demo data
├── projects_demo_readme.md     # Project-specific demo documentation
├── projects/                   # Project table demo data
│   ├── projects_simple_demo.csv
│   ├── projects_demo_data.csv
│   ├── projects_with_errors.csv
│   └── projects_demo_data.json
├── users/                      # User table demo data (future)
├── products/                   # Product table demo data (future)
├── validation-testing/         # Files for testing validation
└── scripts/                    # Test and validation scripts
    ├── test_demo_import.py
    └── validate_demo_data.py
```

## 🚀 Quick Start

1. **Read the detailed guide**: Start with [DEMO_IMPORT_GUIDE.md](./DEMO_IMPORT_GUIDE.md)
2. **Choose your test file**: Use `projects/projects_simple_demo.csv` for basic testing
3. **Access the import wizard**: Go to `/admin/data-import` in your application
4. **Test validation**: Upload a file and click "Validate Data"

## 📊 Available Demo Data

### Projects Table
- **projects_simple_demo.csv** - 20 clean records (recommended for first test)
- **projects_demo_data.csv** - 20 records with JSON settings
- **projects_with_errors.csv** - 10 records with validation errors
- **projects_demo_data.json** - 10 records in JSON format

## 🔧 Test Scripts

- **test_demo_import.py** - Tests the validation endpoint with demo data
- **validate_demo_data.py** - Validates demo file structure and content

## 📋 Prerequisites

- Backend server running on localhost:8000
- Users table with IDs 1, 2, 3, and 4
- Authentication token for API access

## 🎯 Testing Scenarios

1. **Successful Import**: Use `projects_simple_demo.csv`
2. **Validation Errors**: Use `projects_with_errors.csv`
3. **JSON Format**: Use `projects_demo_data.json`
4. **Complex Data**: Use `projects_demo_data.csv`

---

**For detailed instructions, see [DEMO_IMPORT_GUIDE.md](./DEMO_IMPORT_GUIDE.md)**