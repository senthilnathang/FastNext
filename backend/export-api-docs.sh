#!/bin/bash

# FastNext Framework API Documentation Export Script
# This script exports the OpenAPI documentation in multiple formats

set -e

echo "🚀 FastNext Framework - API Documentation Export"
echo "=================================================="

# Check if virtual environment exists and activate it
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
elif [ -d "../venv" ]; then
    echo "📦 Activating virtual environment..."
    source ../venv/bin/activate
else
    echo "⚠️  No virtual environment found. Using system Python..."
fi

# Check if required packages are installed
echo "🔍 Checking dependencies..."
python -c "import yaml, fastapi" 2>/dev/null || {
    echo "❌ Missing required packages. Installing..."
    pip install pyyaml fastapi
}

# Create exports directory if it doesn't exist
mkdir -p exports

# Run the export script
echo "📄 Exporting API documentation..."
python scripts/export_openapi.py

echo ""
echo "✅ Export completed successfully!"
echo ""
echo "📁 Available files in exports/ directory:"
ls -la exports/ | grep -E '\.(json|yaml)$' || echo "   No export files found"

echo ""
echo "🔧 Next steps:"
echo "   1. Import the collection files into Postman or Insomnia"
echo "   2. Set up authentication using the login endpoint"
echo "   3. Start testing your API endpoints!"
echo ""
echo "📚 For more information, see the API documentation at:"
echo "   http://localhost:8000/docs (when server is running)"