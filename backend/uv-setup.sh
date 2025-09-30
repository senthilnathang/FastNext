#!/bin/bash
# FastNext Backend - UV Setup Script
# Simplified dependency management with UV

set -e

echo "🚀 FastNext Backend - UV Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    print_info "Installing uv package manager..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
else
    print_status "UV already installed: $(uv --version)"
fi

# Create or activate virtual environment
if [ ! -d ".venv" ]; then
    print_info "Creating virtual environment with Python 3.12..."
    uv venv --python 3.12
else
    print_status "Virtual environment already exists"
fi

# Activate virtual environment
print_info "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
print_info "Installing core dependencies..."
uv pip install \
    fastapi uvicorn \
    "sqlalchemy[asyncio]" asyncpg alembic \
    "python-jose[cryptography]" "passlib[bcrypt]" cryptography \
    "pydantic[email]" pydantic-settings \
    httpx \
    "redis[hiredis]" \
    "celery[redis]" \
    python-dateutil structlog typer rich

print_info "Installing development dependencies..."
uv pip install \
    pytest pytest-asyncio pytest-cov pytest-xdist \
    black isort mypy \
    pre-commit python-dotenv \
    factory-boy faker

print_status "All dependencies installed successfully!"

# Create activation script
cat > activate-uv.sh << 'EOF'
#!/bin/bash
# Activate FastNext Backend UV Environment
source .venv/bin/activate
echo "🐍 FastNext Backend Environment Activated"
echo "📦 UV Package Manager Ready"
echo ""
echo "Common commands:"
echo "  uv pip install <package>  - Install a package"
echo "  uv pip list               - List installed packages"
echo "  uv pip freeze             - Show pinned dependencies"
echo "  python main.py            - Start development server"
echo ""
EOF

chmod +x activate-uv.sh

print_status "Setup complete!"
print_info "To activate the environment, run: source activate-uv.sh"
print_info "Or manually: source .venv/bin/activate"

echo ""
echo "📋 UV Quick Reference:"
echo "  uv pip install <package>     Install package"
echo "  uv pip install -r requirements.txt  Install from requirements"
echo "  uv pip list                   List installed packages"
echo "  uv pip freeze                 Show all dependencies with versions"
echo "  uv pip uninstall <package>    Remove package"
echo "  uv venv                       Create virtual environment"
echo ""
echo "🚀 Ready to use UV for faster dependency management!"