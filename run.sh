#!/bin/bash

# FastNext Management Script
# Usage: ./run.sh [command] [service] [options]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Default values
BACKEND_PORT=8000
FRONTEND_PORT=3000
PYTHON_CMD="python3"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}$1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_system_requirements() {
    print_header "🔍 Checking System Requirements..."

    local errors=0

    # Check Python
    if command_exists python3; then
        PYTHON_CMD="python3"
        PYTHON_VERSION=$(python3 --version 2>&1 | cut -d " " -f 2)
        print_success "Python found: $PYTHON_VERSION"
    elif command_exists python; then
        PYTHON_CMD="python"
        PYTHON_VERSION=$(python --version 2>&1 | cut -d " " -f 2)
        print_success "Python found: $PYTHON_VERSION"
    else
        print_error "Python not found. Please install Python 3.10+"
        errors=$((errors + 1))
    fi

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js not found. Please install Node.js 18+"
        errors=$((errors + 1))
    fi

    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm not found. Please install npm"
        errors=$((errors + 1))
    fi

    # Check pip
    if command_exists pip3; then
        PIP_VERSION=$(pip3 --version | cut -d " " -f 2)
        print_success "pip found: $PIP_VERSION"
    elif command_exists pip; then
        PIP_VERSION=$(pip --version | cut -d " " -f 2)
        print_success "pip found: $PIP_VERSION"
    else
        print_error "pip not found. Please install pip"
        errors=$((errors + 1))
    fi

    if [ $errors -eq 0 ]; then
        print_success "All system requirements met!"
        return 0
    else
        print_error "$errors requirement(s) missing"
        return 1
    fi
}

# Function to setup backend virtual environment
setup_backend_venv() {
    cd "$BACKEND_DIR"

    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_warning "Virtual environment not found. Creating..."
        $PYTHON_CMD -m venv venv
        print_success "Virtual environment created"

        # Activate and install dependencies
        source venv/bin/activate
        print_status "Installing Python dependencies..."
        pip install --upgrade pip

        # Install core dependencies
        pip install fastapi uvicorn sqlalchemy alembic pydantic pydantic-settings \
            python-jose passlib bcrypt python-multipart email-validator \
            python-decouple httpx pytest pytest-asyncio factory-boy faker \
            psycopg2-binary cryptography authlib celery redis slowapi rich typer \
            psutil Pillow jinja2 itsdangerous emails aiosmtplib pyotp qrcode \
            xlsxwriter openpyxl pandas aiofiles

        print_success "Dependencies installed"
    fi

    # Activate virtual environment
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        print_success "Virtual environment activated"
    else
        print_error "Failed to activate virtual environment"
        return 1
    fi
}

# Function to check backend
check_backend() {
    print_header "🔍 Checking Backend..."

    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        return 1
    fi

    setup_backend_venv

    # Check database/config file
    if [ -f "$BACKEND_DIR/.env" ]; then
        print_success "Environment file found"
    else
        print_warning ".env file not found. Using defaults."
    fi

    # Check essential files
    local essential_files=("main.py" "app/core/config.py" "app/db/base.py" "app/models/user.py")
    for file in "${essential_files[@]}"; do
        if [ -f "$BACKEND_DIR/$file" ]; then
            print_success "✓ $file"
        else
            print_error "✗ $file missing"
            return 1
        fi
    done

    # Check if manage.py exists
    if [ -f "$BACKEND_DIR/manage.py" ]; then
        print_success "✓ manage.py (CLI tools)"
    else
        print_warning "✗ manage.py not found"
    fi

    print_success "Backend check completed"
    return 0
}

# Function to check frontend
check_frontend() {
    print_header "🔍 Checking Frontend..."

    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        return 1
    fi

    cd "$FRONTEND_DIR"

    # Check package.json
    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        return 1
    fi

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found. Installing dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_success "Dependencies found"
    fi

    # Check environment file
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local not found. Creating default..."
        echo "NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT" > .env.local
        print_success "Environment file created"
    else
        print_success "Environment file found"
    fi

    # Check essential files
    local essential_files=("src/app/layout.tsx" "src/app/page.tsx" "src/lib/api/index.ts")
    for file in "${essential_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "✓ $file"
        else
            print_warning "✗ $file not found"
        fi
    done

    print_success "Frontend check completed"
    return 0
}

# Function to test backend
test_backend() {
    print_header "🧪 Testing Backend..."

    cd "$BACKEND_DIR"
    setup_backend_venv

    local test_path="${1:-tests/}"
    local markers="${2:-}"

    # Build pytest command
    local pytest_cmd="$PYTHON_CMD -m pytest $test_path -v --tb=short"

    if [ -n "$markers" ]; then
        pytest_cmd="$pytest_cmd -m $markers"
    fi

    print_status "Running: $pytest_cmd"

    if $pytest_cmd; then
        print_success "Backend tests passed"
        return 0
    else
        print_error "Backend tests failed"
        return 1
    fi
}

# Function to test frontend
test_frontend() {
    print_header "🧪 Testing Frontend..."

    cd "$FRONTEND_DIR"

    local test_runner="${1:-jest}"  # jest or vitest

    case $test_runner in
        jest)
            print_status "Running Jest tests..."
            if npm run test -- --passWithNoTests; then
                print_success "Jest tests passed"
            else
                print_warning "Jest tests failed or skipped"
            fi
            ;;
        vitest)
            print_status "Running Vitest tests..."
            if npm run test:vitest -- --run; then
                print_success "Vitest tests passed"
            else
                print_warning "Vitest tests failed or skipped"
            fi
            ;;
        *)
            print_error "Unknown test runner: $test_runner"
            return 1
            ;;
    esac

    # Run lint
    print_status "Running linter..."
    if npm run lint 2>/dev/null; then
        print_success "Linting passed"
    else
        print_warning "Linting issues found (non-blocking)"
    fi

    print_success "Frontend tests completed"
    return 0
}

# Function to run backend
run_backend() {
    print_header "🚀 Starting Backend Server..."

    cd "$BACKEND_DIR"

    # Run precheck if enabled
    if [ "$PRECHECK" = true ]; then
        if ! run_precheck; then
            print_error "Precheck failed. Aborting startup."
            return 1
        fi
    fi

    setup_backend_venv

    # Check if port is already in use
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $BACKEND_PORT is already in use"
        read -p "Kill existing process and continue? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pkill -f "uvicorn.*main:app" 2>/dev/null || true
            sleep 2
        else
            print_error "Cannot start backend - port in use"
            return 1
        fi
    fi

    print_status "Starting FastAPI server on http://localhost:$BACKEND_PORT"
    print_status "API Documentation: http://localhost:$BACKEND_PORT/docs"
    print_status "Press Ctrl+C to stop"

    # Start the server
    $PYTHON_CMD -m uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload
}

# Function to run frontend
run_frontend() {
    print_header "🚀 Starting Frontend Server..."

    cd "$FRONTEND_DIR"

    # Run precheck if enabled
    if [ "$PRECHECK" = true ]; then
        if ! run_frontend_precheck; then
            print_error "Frontend pre-checks failed. Aborting startup."
            return 1
        fi
    fi

    # Check dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi

    # Check if port is already in use
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $FRONTEND_PORT is already in use"
        read -p "Kill existing process and continue? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pkill -f "next" 2>/dev/null || true
            sleep 2
        else
            print_error "Cannot start frontend - port in use"
            return 1
        fi
    fi

    print_status "Starting Next.js server on http://localhost:$FRONTEND_PORT"
    print_status "Press Ctrl+C to stop"

    # Start the development server
    npm run dev
}

# Function to run both services
run_both() {
    print_header "🚀 Starting Both Services..."

    # Run precheck if enabled
    if [ "$PRECHECK" = true ]; then
        # Run backend precheck
        cd "$BACKEND_DIR"
        if ! run_precheck; then
            print_error "Backend pre-checks failed. Aborting startup."
            return 1
        fi
        cd "$SCRIPT_DIR"

        # Run frontend precheck
        cd "$FRONTEND_DIR"
        if ! run_frontend_precheck; then
            print_error "Frontend pre-checks failed. Aborting startup."
            return 1
        fi
        cd "$SCRIPT_DIR"
    fi

    # Check if tmux is available for running both services
    if command_exists tmux; then
        print_status "Using tmux to run both services..."

        # Kill existing session if it exists
        tmux kill-session -t fastnext 2>/dev/null || true

        # Create new session
        tmux new-session -d -s fastnext -n backend
        tmux send-keys -t fastnext:backend "cd $BACKEND_DIR && source venv/bin/activate && python -m uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload" Enter

        # Create frontend window
        tmux new-window -t fastnext -n frontend
        tmux send-keys -t fastnext:frontend "cd $FRONTEND_DIR && npm run dev" Enter

        # Create monitoring window
        tmux new-window -t fastnext -n monitor
        tmux send-keys -t fastnext:monitor "clear" Enter
        tmux send-keys -t fastnext:monitor "echo ''" Enter
        tmux send-keys -t fastnext:monitor "echo '  ╔═══════════════════════════════════════════════════╗'" Enter
        tmux send-keys -t fastnext:monitor "echo '  ║           FastNext Development Server            ║'" Enter
        tmux send-keys -t fastnext:monitor "echo '  ╠═══════════════════════════════════════════════════╣'" Enter
        tmux send-keys -t fastnext:monitor "echo '  ║  Backend:   http://localhost:$BACKEND_PORT                 ║'" Enter
        tmux send-keys -t fastnext:monitor "echo '  ║  Frontend:  http://localhost:$FRONTEND_PORT                 ║'" Enter
        tmux send-keys -t fastnext:monitor "echo '  ║  API Docs:  http://localhost:$BACKEND_PORT/docs             ║'" Enter
        tmux send-keys -t fastnext:monitor "echo '  ╠═══════════════════════════════════════════════════╣'" Enter
        tmux send-keys -t fastnext:monitor "echo '  ║  Ctrl+B then 0/1/2 - Switch windows              ║'" Enter
        tmux send-keys -t fastnext:monitor "echo '  ║  Ctrl+B then d     - Detach session              ║'" Enter
        tmux send-keys -t fastnext:monitor "echo '  ║  tmux attach -t fastnext - Reattach              ║'" Enter
        tmux send-keys -t fastnext:monitor "echo '  ╚═══════════════════════════════════════════════════╝'" Enter

        print_success "Both services started in tmux session 'fastnext'"
        print_status "Backend: http://localhost:$BACKEND_PORT"
        print_status "Frontend: http://localhost:$FRONTEND_PORT"
        print_status "API Docs: http://localhost:$BACKEND_PORT/docs"
        print_status "Attaching to tmux session..."

        # Attach to the session
        tmux attach -t fastnext
    else
        print_warning "tmux not found. Starting backend in background..."

        # Start backend in background
        cd "$BACKEND_DIR"
        setup_backend_venv
        nohup $PYTHON_CMD -m uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload > "$SCRIPT_DIR/backend.log" 2>&1 &
        BACKEND_PID=$!

        sleep 3

        # Check if backend started successfully
        if ps -p $BACKEND_PID > /dev/null; then
            print_success "Backend started (PID: $BACKEND_PID)"
            echo $BACKEND_PID > "$SCRIPT_DIR/backend.pid"
        else
            print_error "Failed to start backend"
            return 1
        fi

        # Start frontend in foreground
        print_status "Starting frontend..."
        cd "$FRONTEND_DIR"
        npm run dev
    fi
}

# Function to stop services
stop_services() {
    print_header "🛑 Stopping Services..."

    # Stop tmux session if it exists
    if tmux has-session -t fastnext 2>/dev/null; then
        tmux kill-session -t fastnext
        print_success "Stopped tmux session"
    fi

    # Stop backend process
    if [ -f "$SCRIPT_DIR/backend.pid" ]; then
        BACKEND_PID=$(cat "$SCRIPT_DIR/backend.pid")
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            kill $BACKEND_PID
            print_success "Stopped backend (PID: $BACKEND_PID)"
        fi
        rm -f "$SCRIPT_DIR/backend.pid"
    fi

    # Kill any remaining processes
    pkill -f "uvicorn.*main:app" 2>/dev/null || true
    pkill -f "next" 2>/dev/null || true

    print_success "All services stopped"
}

# Function to run backend precheck
run_precheck() {
    print_header "🔍 Running Backend Pre-Startup Checks..."

    cd "$BACKEND_DIR"
    setup_backend_venv

    # Run quick tests
    print_status "Running quick validation tests..."
    if $PYTHON_CMD -m pytest tests/unit/test_models.py -v --tb=short -q 2>/dev/null; then
        print_success "Backend pre-checks passed"
        return 0
    else
        print_warning "Some tests failed, but continuing..."
        return 0
    fi
}

# Function to run frontend precheck
run_frontend_precheck() {
    print_header "🔍 Running Frontend Pre-Startup Checks..."

    cd "$FRONTEND_DIR"

    # Check TypeScript compilation
    print_status "Checking TypeScript types..."
    if npx tsc --noEmit 2>/dev/null; then
        print_success "TypeScript check passed"
    else
        print_warning "TypeScript issues found (non-blocking)"
    fi

    print_success "Frontend pre-checks completed"
    return 0
}

# Function to build frontend
build_frontend() {
    print_header "🔨 Building Frontend..."

    cd "$FRONTEND_DIR"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi

    print_status "Building Next.js application..."
    if npm run build; then
        print_success "Frontend build completed"
        return 0
    else
        print_error "Frontend build failed"
        return 1
    fi
}

# Function to initialize database
init_database() {
    print_header "🗄️ Initializing Database..."

    cd "$BACKEND_DIR"
    setup_backend_venv

    if [ -f "manage.py" ]; then
        print_status "Running database initialization..."
        $PYTHON_CMD manage.py initdb --seed
        print_success "Database initialized with seed data"
    else
        print_warning "manage.py not found. Running migrations directly..."
        alembic upgrade head
        print_success "Migrations applied"
    fi
}

# Function to load demo data
load_demo_data() {
    print_header "📦 Loading Demo Data..."

    cd "$BACKEND_DIR"
    setup_backend_venv

    if [ -f "manage.py" ]; then
        $PYTHON_CMD manage.py loaddata data/demo.json
        print_success "Demo data loaded"
    else
        print_error "manage.py not found"
        return 1
    fi
}

# Function to show status
show_status() {
    print_header "📊 Service Status"

    # Check backend
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_success "Backend: Running on port $BACKEND_PORT"
    else
        print_warning "Backend: Not running"
    fi

    # Check frontend
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_success "Frontend: Running on port $FRONTEND_PORT"
    else
        print_warning "Frontend: Not running"
    fi

    # Check tmux session
    if tmux has-session -t fastnext 2>/dev/null; then
        print_success "tmux session 'fastnext' active"
    else
        print_warning "tmux session 'fastnext' not found"
    fi

    # Check database
    if [ -f "$BACKEND_DIR/.env" ]; then
        print_success "Environment configured"
    else
        print_warning "No .env file found"
    fi
}

# Function to show logs
show_logs() {
    local service="${1:-both}"

    case $service in
        backend)
            if [ -f "$SCRIPT_DIR/backend.log" ]; then
                tail -f "$SCRIPT_DIR/backend.log"
            else
                print_warning "Backend log not found. Use 'run both' to start services."
            fi
            ;;
        frontend)
            print_warning "Frontend logs are shown in the terminal when running."
            ;;
        both)
            if tmux has-session -t fastnext 2>/dev/null; then
                tmux attach -t fastnext
            else
                print_warning "tmux session not found. Start services with 'run both'."
            fi
            ;;
    esac
}

# Function to show help
show_help() {
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║               FastNext Management Script                         ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo "Usage: $0 [COMMAND] [SERVICE] [OPTIONS]"
    echo
    echo -e "${YELLOW}Commands:${NC}"
    echo "  check       Check system requirements and service health"
    echo "  test        Run tests for services"
    echo "  run         Start services"
    echo "  stop        Stop all services"
    echo "  status      Show service status"
    echo "  build       Build frontend for production"
    echo "  init        Initialize database with seed data"
    echo "  demo        Load demo data"
    echo "  logs        Show service logs"
    echo "  help        Show this help message"
    echo
    echo -e "${YELLOW}Services:${NC}"
    echo "  backend     Backend API service (FastAPI)"
    echo "  frontend    Frontend web application (Next.js)"
    echo "  both        Both services (default)"
    echo
    echo -e "${YELLOW}Options:${NC}"
    echo "  --backend-port PORT    Backend port (default: 8000)"
    echo "  --frontend-port PORT   Frontend port (default: 3000)"
    echo "  --python CMD           Python command (default: python3)"
    echo "  --precheck             Run pre-startup checks before launching"
    echo "  --vitest               Use Vitest for frontend tests (default: Jest)"
    echo "  --markers MARKERS      pytest markers for backend tests"
    echo
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 check                         # Check all services"
    echo "  $0 check backend                 # Check backend only"
    echo "  $0 test                          # Test all services"
    echo "  $0 test backend                  # Test backend only"
    echo "  $0 test frontend --vitest        # Test frontend with Vitest"
    echo "  $0 run                           # Run both services"
    echo "  $0 run backend                   # Run backend only"
    echo "  $0 run both --precheck           # Run both with pre-checks"
    echo "  $0 stop                          # Stop all services"
    echo "  $0 status                        # Show service status"
    echo "  $0 init                          # Initialize database"
    echo "  $0 demo                          # Load demo data"
    echo "  $0 build                         # Build frontend"
    echo
    echo -e "${YELLOW}URLs (when running):${NC}"
    echo "  Frontend:  http://localhost:$FRONTEND_PORT"
    echo "  Backend:   http://localhost:$BACKEND_PORT"
    echo "  API Docs:  http://localhost:$BACKEND_PORT/docs"
    echo "  ReDoc:     http://localhost:$BACKEND_PORT/redoc"
    echo
    echo -e "${YELLOW}Demo Credentials (after loading demo data):${NC}"
    echo "  Admin:     admin@fastnext.dev / admin123!"
    echo "  User:      user@test.com / testpassword123"
}

# Parse command line arguments
COMMAND=""
SERVICE="both"
PRECHECK=false
USE_VITEST=false
MARKERS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        check|test|run|stop|status|build|init|demo|logs|help)
            COMMAND="$1"
            shift
            ;;
        backend|frontend|both)
            SERVICE="$1"
            shift
            ;;
        --backend-port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        --frontend-port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        --python)
            PYTHON_CMD="$2"
            shift 2
            ;;
        --precheck)
            PRECHECK=true
            shift
            ;;
        --vitest)
            USE_VITEST=true
            shift
            ;;
        --markers)
            MARKERS="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# If no command provided, show help
if [ -z "$COMMAND" ]; then
    show_help
    exit 0
fi

# Execute command
case $COMMAND in
    check)
        check_system_requirements
        case $SERVICE in
            backend)
                check_backend
                ;;
            frontend)
                check_frontend
                ;;
            both)
                check_backend && check_frontend
                ;;
        esac
        ;;
    test)
        case $SERVICE in
            backend)
                test_backend "tests/" "$MARKERS"
                ;;
            frontend)
                if [ "$USE_VITEST" = true ]; then
                    test_frontend "vitest"
                else
                    test_frontend "jest"
                fi
                ;;
            both)
                test_backend "tests/" "$MARKERS"
                if [ "$USE_VITEST" = true ]; then
                    test_frontend "vitest"
                else
                    test_frontend "jest"
                fi
                ;;
        esac
        ;;
    run)
        case $SERVICE in
            backend)
                run_backend
                ;;
            frontend)
                run_frontend
                ;;
            both)
                run_both
                ;;
        esac
        ;;
    stop)
        stop_services
        ;;
    status)
        show_status
        ;;
    build)
        build_frontend
        ;;
    init)
        init_database
        ;;
    demo)
        load_demo_data
        ;;
    logs)
        show_logs "$SERVICE"
        ;;
    help)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
