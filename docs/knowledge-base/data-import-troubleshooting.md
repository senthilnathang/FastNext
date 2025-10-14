# Knowledge Base: Data Import Issues

## Problem: CSV Import Fails with "Invalid Format" Error

### Symptoms
- CSV import process stops with format validation errors
- "Column count mismatch" or "Invalid data type" messages
- Partial data import with some records skipped

### Solutions

#### File Format Issues
**Check CSV Structure:**
```csv
# Correct format
name,email,phone,company
John Doe,john@example.com,+1-555-0123,Acme Corp
Jane Smith,jane@example.com,+1-555-0456,Tech Inc
```

**Common Problems:**
- **Encoding Issues**: Ensure file is UTF-8 encoded
- **Line Endings**: Use consistent line endings (LF for Unix, CRLF for Windows)
- **Quotes**: Properly escape quotes in CSV fields
- **Headers**: First row must contain column headers

#### Data Type Validation
**Field Type Mapping:**
```json
{
  "text": "String fields",
  "number": "Numeric fields (integers, decimals)",
  "date": "ISO 8601 format: YYYY-MM-DD",
  "datetime": "ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ",
  "boolean": "true/false, 1/0, yes/no",
  "email": "Valid email format",
  "url": "Valid URL format"
}
```

**Validation Fixes:**
- **Date Formats**: Convert Excel dates to ISO format
- **Number Formats**: Remove currency symbols and thousand separators
- **Boolean Values**: Standardize to true/false

#### File Size and Performance
**Size Limits:**
- Maximum file size: 100MB
- Maximum rows: 1,000,000
- Recommended chunk size: 10,000 rows

**Performance Optimization:**
```bash
# For large files, split into chunks
split -l 10000 large_file.csv chunk_
# Import each chunk separately
```

### Prevention
- Use CSV validation tools before import
- Test with small sample files first
- Document data format requirements
- Implement data quality checks

---

## Problem: Excel Import Shows "Corrupted File" Error

### Symptoms
- Excel files (.xlsx, .xls) fail to import
- "File appears to be corrupted" message
- Import works for some files but not others

### Solutions

#### File Compatibility
**Supported Formats:**
- Excel 2007+ (.xlsx) - Recommended
- Excel 97-2003 (.xls) - Limited support
- CSV UTF-8 - Most reliable

**Conversion Steps:**
```bash
# Convert Excel to CSV using command line
# Install xlsx2csv: pip install xlsx2csv
xlsx2csv input.xlsx output.csv
```

#### Excel-Specific Issues
**Common Problems:**
- **Password Protection**: Remove password protection before import
- **Macros**: Disable macros and save as clean file
- **Hidden Sheets**: Ensure data is on visible sheets
- **Merged Cells**: Unmerge cells before import

#### Memory and Performance
**Large Excel Files:**
- Split into multiple sheets or files
- Remove unnecessary formatting
- Use CSV export for large datasets

### Prevention
- Standardize on CSV for data import
- Train users on Excel best practices
- Implement file type validation
- Provide Excel templates with proper formatting

---

## Problem: API Import Returns "Rate Limited" Errors

### Symptoms
- Bulk API imports fail with 429 status codes
- "Too many requests" error messages
- Import process slows down significantly

### Solutions

#### Rate Limiting Configuration
**API Limits:**
```json
{
  "requests_per_minute": 60,
  "burst_limit": 10,
  "backoff_multiplier": 2,
  "max_retry_attempts": 5
}
```

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1638360000
```

#### Import Optimization
**Batch Processing:**
```python
# Implement exponential backoff
import time
import requests

def import_with_retry(data, max_retries=5):
    for attempt in range(max_retries):
        try:
            response = requests.post('/api/v1/data/bulk', json=data)
            if response.status_code == 429:
                wait_time = 2 ** attempt  # Exponential backoff
                time.sleep(wait_time)
                continue
            return response
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(2 ** attempt)
```

**Chunking Strategy:**
- Split large imports into smaller batches
- Process in parallel with rate limiting
- Monitor queue depth and adjust batch sizes

### Prevention
- Implement client-side rate limiting
- Use bulk import endpoints for large datasets
- Monitor API usage and adjust limits as needed
- Provide import scheduling tools

---

## Problem: Database Constraint Violations During Import

### Symptoms
- Import fails with foreign key or unique constraint errors
- "Duplicate key value" or "Foreign key violation" messages
- Partial imports with some records failing

### Solutions

#### Data Integrity Checks
**Pre-Import Validation:**
```sql
-- Check for duplicates before import
SELECT email, COUNT(*) as count
FROM temp_import_table
GROUP BY email
HAVING COUNT(*) > 1;

-- Validate foreign keys
SELECT ti.*
FROM temp_import_table ti
LEFT JOIN users u ON ti.user_id = u.id
WHERE u.id IS NULL;
```

**Constraint Types:**
- **Primary Key**: Unique identifier conflicts
- **Foreign Key**: References to non-existent records
- **Unique Constraints**: Duplicate values in unique columns
- **Check Constraints**: Values outside allowed ranges

#### Import Order
**Dependency Order:**
1. Import reference data first (users, categories, etc.)
2. Import main data with foreign key references
3. Import related data (comments, attachments, etc.)

**Circular Dependencies:**
- Use temporary IDs and update after import
- Split into multiple passes
- Disable constraints temporarily (with caution)

### Prevention
- Validate data before import
- Use staging tables for complex imports
- Implement referential integrity checks
- Provide import templates with validation

---

## Problem: Character Encoding Issues

### Symptoms
- Special characters display as gibberish (�)
- Import fails with encoding errors
- Data appears corrupted after import

### Solutions

#### Encoding Detection and Conversion
**Common Encodings:**
- UTF-8: Universal standard (recommended)
- UTF-16: Windows Unicode
- ISO-8859-1: Western European
- Windows-1252: Windows default

**Conversion Tools:**
```bash
# Convert file encoding
iconv -f windows-1252 -t utf-8 input.csv > output.csv

# Check file encoding
file input.csv
# Output: input.csv: UTF-8 Unicode text

# Python conversion
import pandas as pd
df = pd.read_csv('input.csv', encoding='windows-1252')
df.to_csv('output.csv', encoding='utf-8', index=False)
```

#### Database Configuration
**PostgreSQL Encoding:**
```sql
-- Check database encoding
SHOW SERVER_ENCODING;

-- Set client encoding for session
SET CLIENT_ENCODING TO 'UTF8';

-- Create database with proper encoding
CREATE DATABASE fastnext
    WITH ENCODING 'UTF8'
    LC_COLLATE='en_US.UTF-8'
    LC_CTYPE='en_US.UTF-8';
```

### Prevention
- Standardize on UTF-8 for all data
- Validate file encoding before import
- Configure database for Unicode support
- Train users on encoding best practices

---

## Related Articles
- [Data Export Best Practices](data-export-guide.md)
- [Bulk Import API Reference](bulk-import-api.md)
- [Data Validation Rules](data-validation-rules.md)
- [Import Performance Optimization](import-performance-optimization.md)

## Support
For complex import issues:
1. Provide sample data file (anonymized)
2. Include exact error messages
3. Specify FastNext version and import method
4. Note file size and record count

---

*Last updated: December 2024*
*Applies to: FastNext Framework v1.5*