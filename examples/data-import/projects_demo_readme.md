# Projects Demo Data Files

This directory contains demo data files for testing the data import functionality with the `projects` table.

## Files Created:

### 1. `projects_demo_data.csv` (Full Demo Data)
- **Contains:** 20 realistic project records with all fields including JSON settings
- **Fields:** name, description, user_id, is_public, settings
- **Use case:** Testing full import functionality with complex data types (JSON)

### 2. `projects_simple_demo.csv` (Simplified Demo Data) 
- **Contains:** 20 project records without JSON settings
- **Fields:** name, description, user_id, is_public
- **Use case:** Testing basic import functionality, easier to validate

### 3. `projects_demo_data.json` (JSON Format)
- **Contains:** 10 project records in JSON format
- **Use case:** Testing JSON file import functionality

### 4. `projects_with_errors.csv` (Error Testing)
- **Contains:** 10 records with various validation errors
- **Errors included:**
  - Missing required fields (empty name)
  - Invalid data types (text in user_id, invalid boolean values)
  - Null values
  - Special characters and Unicode
- **Use case:** Testing validation functionality and error reporting

## Project Table Schema:

Based on the `Project` model in `/backend/app/models/project.py`:

```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,           -- Required field
    description TEXT,                -- Optional field  
    user_id INTEGER NOT NULL,        -- Required, Foreign Key to users.id
    is_public BOOLEAN DEFAULT FALSE, -- Optional, defaults to false
    settings JSON DEFAULT '{}',      -- Optional, JSON object
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

## How to Use:

1. **Start with Simple Demo:** Use `projects_simple_demo.csv` for basic testing
2. **Test Validation:** Use `projects_with_errors.csv` to test error handling
3. **Test JSON Import:** Use `projects_demo_data.json` for JSON format testing
4. **Full Feature Test:** Use `projects_demo_data.csv` for complete functionality

## Prerequisites:

- Make sure you have users in the `users` table with IDs 1, 2, 3, and 4
- If not, either create test users or modify the `user_id` values in the files

## Expected Validation Results:

### For `projects_simple_demo.csv`:
- ✅ All records should be valid
- ✅ 20 total rows, 20 valid rows, 0 error rows

### For `projects_with_errors.csv`:
- ❌ Multiple validation errors expected
- Expected errors:
  - Row 2: Missing required field 'name'
  - Row 4: Invalid user_id data type
  - Row 5: Missing required fields
  - Row 9: Invalid boolean value
  - Row 10: Null values in required fields

This demonstrates the validation functionality working correctly!