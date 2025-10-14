# Dependency Fix Guide - Dynamic Import/Export

## Issue Summary

**Problem**: Missing Python dependencies for Dynamic Import/Export system
**Error**: `ModuleNotFoundError: No module named 'aiofiles'` (and others)

## Root Cause

The system is missing several dependencies required by the Import/Export functionality:
- `aiofiles` - Async file operations
- `openpyxl` - Excel file handling
- `xlsxwriter` - Excel file writing
- `xlrd` - Excel file reading
- `lxml` - XML processing

## Solution Steps

### Step 1: Activate Virtual Environment

```bash
cd /home/sen/FastNext/backend
source venv/bin/activate
```

### Step 2: Install All Requirements

```bash
# Install all base requirements
pip install -r requirements.txt
```

### Step 3: Install Missing Import/Export Dependencies

```bash
# Install specific missing dependencies
pip install openpyxl xlsxwriter xlrd lxml aiofiles
```

### Step 4: Verify Installation

```bash
# Test dependency check
python3 check_dependencies.py

# Test syntax
python3 test_syntax_fix.py

# Test main import (optional, may need DB setup)
python3 -c "from app.api.v1.data_import_export import router; print('✅ Success')"
```

### Step 5: Start the Server

```bash
# Start backend server
python main.py
```

## Alternative: One-Command Setup

```bash
# Run this single command in the backend directory
cd /home/sen/FastNext/backend && \
source venv/bin/activate && \
pip install -r requirements.txt && \
pip install openpyxl xlsxwriter xlrd lxml aiofiles && \
echo "✅ Setup complete! Run: python main.py"
```

## Requirements Updated

The following dependencies have been added to `requirements/base.txt`:

```txt
# Data Import/Export
openpyxl==3.1.2  # Excel file handling
xlsxwriter==3.1.9  # Excel file writing
pandas==2.1.4  # Data manipulation and analysis
xlrd==2.0.1  # Excel file reading
lxml==4.9.3  # XML processing
PyYAML==6.0.1  # YAML processing
aiofiles==23.2.0  # Async file operations
```

## Verification Checklist

- [ ] Virtual environment activated
- [ ] All dependencies installed (`pip list` shows the packages)
- [ ] No import errors when running the test scripts
- [ ] Backend server starts without errors (`python main.py`)
- [ ] API documentation accessible (`http://localhost:8000/docs`)
- [ ] Dynamic import/export endpoints available

## Troubleshooting

### Issue: "externally-managed-environment" error
**Solution**: Use virtual environment (Step 1 above)

### Issue: Permission errors during installation
**Solution**: Make sure virtual environment is activated

### Issue: SSL or network errors during pip install
**Solution**:
```bash
pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org openpyxl xlsxwriter xlrd lxml aiofiles
```

### Issue: Import errors after installation
**Solution**: Check if packages are installed in the correct environment:
```bash
pip list | grep -E "(openpyxl|xlsxwriter|xlrd|lxml|aiofiles)"
```

## Testing Dynamic Import/Export

After successful setup:

1. **Start Backend**: `python main.py`
2. **Start Frontend**: `cd ../frontend && npm run dev`
3. **Test Import**: Navigate to `http://localhost:3000/settings/data-import`
4. **Test Export**: Navigate to `http://localhost:3000/settings/data-export`
5. **Test API**: Visit `http://localhost:8000/docs` and try:
   - `GET /api/v1/data/tables/available`
   - `GET /api/v1/data/tables/{table_name}/schema`

## Files Created/Modified

- ✅ `requirements/base.txt` - Added missing dependencies
- ✅ `check_dependencies.py` - Dependency verification script
- ✅ `setup_venv_and_deps.py` - Environment setup script
- ✅ `DEPENDENCY_FIX_GUIDE.md` - This guide
- ✅ Fixed syntax error in `app/api/v1/data_import_export.py`

## Success Indicators

When everything is working correctly, you should see:

```bash
✅ All dependencies are available!
✅ All syntax tests passed!
✅ Backend server starting on http://localhost:8000
✅ API documentation available at http://localhost:8000/docs
✅ Dynamic Import/Export pages accessible
```

## Next Steps After Fix

1. **Test Demo Data**: Use `python create_import_export_demo_data.py`
2. **Run Integration Tests**: Use `python test_dynamic_import_export.py`
3. **Explore Documentation**: Check updated README and guides
4. **Production Setup**: Follow deployment guide for production environment
