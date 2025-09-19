#!/bin/bash

# FastNext Project Management Script
# Usage: ./manage.sh [command]
# Commands: start, stop, restart, build, verify, dev, help

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
BACKEND_DIR="./backend"
FRONTEND_DIR="./frontend"
BACKEND_PID_FILE="/tmp/fastnext_backend.pid"
FRONTEND_PID_FILE="/tmp/fastnext_frontend.pid"

# Print colored output
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

# Check if process is running
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$pid_file"
            return 1
        fi
    fi
    return 1
}

# Start backend
start_backend() {
    if is_running "$BACKEND_PID_FILE"; then
        print_warning "Backend is already running"
        return
    fi

    print_status "Starting backend..."
    cd "$BACKEND_DIR"
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_error "Virtual environment not found. Please create one first: python -m venv venv"
        return 1
    fi
    
    # Activate virtual environment and start server
    source venv/bin/activate
    nohup python main.py > /dev/null 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
    cd ..
    print_success "Backend started (PID: $(cat $BACKEND_PID_FILE))"
}

# Start frontend
start_frontend() {
    if is_running "$FRONTEND_PID_FILE"; then
        print_warning "Frontend is already running"
        return
    fi

    print_status "Starting frontend..."
    cd "$FRONTEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    nohup npm start > /dev/null 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
    cd ..
    print_success "Frontend started (PID: $(cat $FRONTEND_PID_FILE))"
}

# Start development servers
start_dev() {
    print_status "Starting development servers..."
    
    # Start backend in dev mode
    if is_running "$BACKEND_PID_FILE"; then
        print_warning "Backend is already running"
    else
        cd "$BACKEND_DIR"
        if [ ! -d "venv" ]; then
            print_error "Virtual environment not found. Please create one first: python -m venv venv"
            return 1
        fi
        source venv/bin/activate
        nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > /dev/null 2>&1 &
        echo $! > "$BACKEND_PID_FILE"
        cd ..
        print_success "Backend dev server started (PID: $(cat $BACKEND_PID_FILE))"
    fi
    
    # Start frontend in dev mode
    if is_running "$FRONTEND_PID_FILE"; then
        print_warning "Frontend is already running"
    else
        cd "$FRONTEND_DIR"
        if [ ! -d "node_modules" ]; then
            print_status "Installing frontend dependencies..."
            npm install
        fi
        nohup npm run dev > /dev/null 2>&1 &
        echo $! > "$FRONTEND_PID_FILE"
        cd ..
        print_success "Frontend dev server started (PID: $(cat $FRONTEND_PID_FILE))"
    fi
}

# Stop backend
stop_backend() {
    if is_running "$BACKEND_PID_FILE"; then
        local pid=$(cat "$BACKEND_PID_FILE")
        print_status "Stopping backend (PID: $pid)..."
        kill "$pid"
        rm -f "$BACKEND_PID_FILE"
        print_success "Backend stopped"
    else
        print_warning "Backend is not running"
    fi
}

# Stop frontend
stop_frontend() {
    if is_running "$FRONTEND_PID_FILE"; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        print_status "Stopping frontend (PID: $pid)..."
        kill "$pid"
        rm -f "$FRONTEND_PID_FILE"
        print_success "Frontend stopped"
    else
        print_warning "Frontend is not running"
    fi
}

# Build project
build_project() {
    print_status "Building project..."
    
    # Build frontend
    print_status "Building frontend..."
    cd "$FRONTEND_DIR"
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    npm run build
    cd ..
    print_success "Frontend build completed"
    
    # Backend doesn't need building, but we can run tests
    print_status "Running backend tests..."
    cd "$BACKEND_DIR"
    if [ -d "venv" ]; then
        source venv/bin/activate
        if [ -f "requirements.txt" ]; then
            pip install -r requirements.txt > /dev/null 2>&1
        fi
        python -m pytest tests/ || print_warning "Some backend tests failed"
    else
        print_warning "Backend virtual environment not found, skipping tests"
    fi
    cd ..
    
    print_success "Build process completed"
}

# Verify project
verify_project() {
    print_status "Verifying project..."
    
    # Verify frontend
    print_status "Verifying frontend..."
    cd "$FRONTEND_DIR"
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    print_status "Running frontend linter..."
    npm run lint || print_warning "Frontend linting issues found"
    
    print_status "Running frontend tests..."
    npm run test || print_warning "Some frontend tests failed"
    
    cd ..
    
    # Verify backend
    print_status "Verifying backend..."
    cd "$BACKEND_DIR"
    if [ -d "venv" ]; then
        source venv/bin/activate
        if [ -f "requirements.txt" ]; then
            pip install -r requirements.txt > /dev/null 2>&1
        fi
        
        print_status "Running backend linter..."
        python -m pylint app/ || print_warning "Backend linting issues found"
        
        print_status "Running backend tests..."
        python -m pytest tests/ || print_warning "Some backend tests failed"
    else
        print_warning "Backend virtual environment not found, skipping verification"
    fi
    cd ..
    
    print_success "Project verification completed"
}

# Show status
show_status() {
    print_status "Project Status:"
    
    if is_running "$BACKEND_PID_FILE"; then
        print_success "Backend: Running (PID: $(cat $BACKEND_PID_FILE))"
    else
        print_warning "Backend: Stopped"
    fi
    
    if is_running "$FRONTEND_PID_FILE"; then
        print_success "Frontend: Running (PID: $(cat $FRONTEND_PID_FILE))"
    else
        print_warning "Frontend: Stopped"
    fi
}

# Show help
show_help() {
    echo "FastNext Project Management Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start        Start both backend and frontend (production mode)"
    echo "  stop         Stop both backend and frontend"
    echo "  restart      Restart both backend and frontend"
    echo "  dev          Start both services in development mode"
    echo "  build        Build the project"
    echo "  verify       Run linting and tests"
    echo "  status       Show current status"
    echo "  backend      Manage backend only (start-backend, stop-backend)"
    echo "  frontend     Manage frontend only (start-frontend, stop-frontend)"
    echo "  help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev       # Start development servers"
    echo "  $0 build     # Build the project"
    echo "  $0 verify    # Run all checks"
    echo "  $0 stop      # Stop all services"
}

# Main script logic
case "${1:-help}" in
    "start")
        start_backend
        start_frontend
        ;;
    "stop")
        stop_backend
        stop_frontend
        ;;
    "restart")
        stop_backend
        stop_frontend
        sleep 2
        start_backend
        start_frontend
        ;;
    "dev")
        start_dev
        ;;
    "build")
        build_project
        ;;
    "verify")
        verify_project
        ;;
    "status")
        show_status
        ;;
    "start-backend")
        start_backend
        ;;
    "stop-backend")
        stop_backend
        ;;
    "start-frontend")
        start_frontend
        ;;
    "stop-frontend")
        stop_frontend
        ;;
    "help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac