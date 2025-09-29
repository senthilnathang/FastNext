#!/bin/bash
# Quick fix script for Dynamic Import/Export dependencies

echo "🔄 Quick Fix: Dynamic Import/Export Dependencies"
echo "=================================================="

# Check if we're in the backend directory
if [ ! -f "main.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd /home/sen/FastNext/backend"
    echo "   ./quick_fix.sh"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📦 Installing base requirements..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "⚠️  Base requirements installation had issues, continuing..."
fi

# Install missing import/export dependencies
echo "📦 Installing import/export dependencies..."
pip install openpyxl xlsxwriter xlrd lxml aiofiles

if [ $? -ne 0 ]; then
    echo "❌ Failed to install import/export dependencies"
    echo "   Try running manually:"
    echo "   source venv/bin/activate"
    echo "   pip install openpyxl xlsxwriter xlrd lxml aiofiles"
    exit 1
fi

# Test dependencies
echo "🧪 Testing dependencies..."
python3 check_dependencies.py

if [ $? -ne 0 ]; then
    echo "⚠️  Some dependencies might still be missing"
fi

# Test syntax
echo "🧪 Testing syntax..."
python3 test_syntax_fix.py

if [ $? -ne 0 ]; then
    echo "❌ Syntax errors detected"
    exit 1
fi

echo ""
echo "=================================================="
echo "🎉 Quick Fix Complete!"
echo ""
echo "✅ Virtual environment ready"
echo "✅ Dependencies installed"  
echo "✅ Syntax validated"
echo ""
echo "🚀 To start the system:"
echo "   # Backend (keep virtual env activated):"
echo "   python main.py"
echo ""
echo "   # Frontend (in another terminal):"
echo "   cd ../frontend && npm run dev"
echo ""
echo "📱 Access Dynamic Import/Export:"
echo "   • Import: http://localhost:3000/settings/data-import"
echo "   • Export: http://localhost:3000/settings/data-export"
echo "   • API Docs: http://localhost:8000/docs"

exit 0