#!/bin/bash

# FastNext Framework Deployment Script
# Comprehensive deployment automation for Docker environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"

# Default values
ENVIRONMENT="development"
SKIP_BUILD=false
SKIP_MIGRATE=false
PROFILES=""
SERVICES=""
SCALE=""

# Help function
show_help() {
    cat << EOF
FastNext Framework Deployment Script

Usage: $0 [OPTIONS] COMMAND

COMMANDS:
    dev         Start development environment
    prod        Start production environment  
    build       Build all images
    stop        Stop all services
    down        Stop and remove all containers
    logs        Show service logs
    ps          Show running services
    restart     Restart services
    migrate     Run database migrations
    backup      Create database backup
    restore     Restore database from backup
    test        Run test suite
    health      Check service health

OPTIONS:
    -e, --env ENV           Environment (development|production) [default: development]
    -f, --file FILE         Docker compose file [default: auto-select]
    -p, --profile PROFILE   Docker compose profiles (tools,backup,monitoring,nginx)
    -s, --service SERVICE   Specific service(s) to operate on
    -S, --scale SERVICE=NUM Scale specific service
    --skip-build           Skip building images
    --skip-migrate         Skip database migrations
    -h, --help             Show this help

EXAMPLES:
    $0 dev                 # Start development environment
    $0 prod                # Start production environment
    $0 dev -p tools        # Start with pgAdmin and Redis Insight
    $0 logs backend        # Show backend logs
    $0 restart frontend    # Restart frontend service
    $0 migrate             # Run database migrations
    $0 backup              # Create database backup

EOF
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -f|--file)
                COMPOSE_FILE="$2"
                shift 2
                ;;
            -p|--profile)
                PROFILES="--profile $2"
                shift 2
                ;;
            -s|--service)
                SERVICES="$2"
                shift 2
                ;;
            -S|--scale)
                SCALE="$2"
                shift 2
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-migrate)
                SKIP_MIGRATE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                COMMAND="$1"
                shift
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Determine compose command
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi
    
    log_success "Prerequisites check passed"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment: $ENVIRONMENT"
    
    # Auto-select compose file based on environment
    if [[ "$COMPOSE_FILE" == "docker-compose.yml" ]]; then
        if [[ "$ENVIRONMENT" == "production" ]]; then
            COMPOSE_FILE="$PROD_COMPOSE_FILE"
        fi
    fi
    
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "Docker compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Setup environment file
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f "${ENV_FILE}.example" ]]; then
            log_warning "Environment file not found. Copying from example..."
            cp "${ENV_FILE}.example" "$ENV_FILE"
            log_warning "Please edit $ENV_FILE with your configuration"
        else
            log_error "Environment file not found: $ENV_FILE"
            exit 1
        fi
    fi
    
    # Load environment variables
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    log_success "Environment setup complete"
}

# Build images
build_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_info "Skipping image build"
        return
    fi
    
    log_info "Building Docker images..."
    
    if [[ -n "$SERVICES" ]]; then
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" build $SERVICES
    else
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" build
    fi
    
    log_success "Images built successfully"
}

# Start services
start_services() {
    log_info "Starting FastNext Framework ($ENVIRONMENT)..."
    
    local cmd="$DOCKER_COMPOSE -f $COMPOSE_FILE $PROFILES up -d"
    
    if [[ -n "$SERVICES" ]]; then
        cmd="$cmd $SERVICES"
    fi
    
    if [[ -n "$SCALE" ]]; then
        cmd="$cmd --scale $SCALE"
    fi
    
    eval $cmd
    
    log_success "Services started successfully"
    
    # Show service status
    show_services
}

# Stop services
stop_services() {
    log_info "Stopping services..."
    
    if [[ -n "$SERVICES" ]]; then
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" stop $SERVICES
    else
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" stop
    fi
    
    log_success "Services stopped"
}

# Remove services
down_services() {
    log_info "Stopping and removing services..."
    
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" down -v
    
    log_success "Services removed"
}

# Show logs
show_logs() {
    if [[ -n "$SERVICES" ]]; then
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs -f $SERVICES
    else
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" logs -f
    fi
}

# Show services
show_services() {
    log_info "Running services:"
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps
}

# Restart services
restart_services() {
    log_info "Restarting services..."
    
    if [[ -n "$SERVICES" ]]; then
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" restart $SERVICES
    else
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" restart
    fi
    
    log_success "Services restarted"
}

# Run database migrations
run_migrations() {
    if [[ "$SKIP_MIGRATE" == "true" ]]; then
        log_info "Skipping database migrations"
        return
    fi
    
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec backend python -c "
import time
import psycopg2
import os

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_SERVER', 'postgres'),
            port=os.getenv('POSTGRES_PORT', '5432'),
            database=os.getenv('POSTGRES_DB', 'fastnext'),
            user=os.getenv('POSTGRES_USER', 'fastnext'),
            password=os.getenv('POSTGRES_PASSWORD')
        )
        conn.close()
        print('Database is ready!')
        break
    except psycopg2.OperationalError:
        retry_count += 1
        print(f'Database not ready, retrying... ({retry_count}/{max_retries})')
        time.sleep(2)
else:
    print('Database connection failed after maximum retries')
    exit(1)
"
    
    # Run migrations
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec backend alembic upgrade head
    
    log_success "Database migrations completed"
}

# Create backup
create_backup() {
    log_info "Creating database backup..."
    
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="fastnext_backup_${timestamp}.sql"
    
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec postgres pg_dump -U fastnext -d fastnext > "backups/${backup_file}"
    
    log_success "Backup created: backups/${backup_file}"
}

# Restore backup
restore_backup() {
    if [[ -z "$1" ]]; then
        log_error "Please specify backup file to restore"
        exit 1
    fi
    
    backup_file="$1"
    
    if [[ ! -f "backups/${backup_file}" ]]; then
        log_error "Backup file not found: backups/${backup_file}"
        exit 1
    fi
    
    log_warning "This will replace the current database. Are you sure? (y/N)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "Restoring database from backup: $backup_file"
        
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T postgres psql -U fastnext -d fastnext < "backups/${backup_file}"
        
        log_success "Database restored successfully"
    else
        log_info "Restore cancelled"
    fi
}

# Run tests
run_tests() {
    log_info "Running test suite..."
    
    # Backend tests
    log_info "Running backend tests..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec backend python test_runner.py
    
    # Frontend tests (if available)
    if $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec frontend npm run test --version &> /dev/null; then
        log_info "Running frontend tests..."
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec frontend npm run test
    fi
    
    log_success "Tests completed"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    services=(backend frontend postgres redis)
    
    for service in "${services[@]}"; do
        log_info "Checking $service..."
        
        if $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec "$service" true &> /dev/null; then
            log_success "$service is running"
        else
            log_error "$service is not running"
        fi
    done
    
    # Check backend health endpoint
    if curl -f http://localhost:8000/health &> /dev/null; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 &> /dev/null; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
    fi
}

# Main execution
main() {
    parse_args "$@"
    
    # Show banner
    echo -e "${BLUE}"
    echo "============================================"
    echo "    FastNext Framework Deployment Tool"
    echo "============================================"
    echo -e "${NC}"
    
    check_prerequisites
    setup_environment
    
    case "$COMMAND" in
        dev|development)
            ENVIRONMENT="development"
            build_images
            start_services
            if [[ "$SKIP_MIGRATE" != "true" ]]; then
                sleep 10  # Wait for services to start
                run_migrations
            fi
            log_success "Development environment is ready!"
            log_info "Frontend: http://localhost:3000"
            log_info "Backend API: http://localhost:8000"
            log_info "API Docs: http://localhost:8000/docs"
            ;;
        prod|production)
            ENVIRONMENT="production"
            COMPOSE_FILE="$PROD_COMPOSE_FILE"
            build_images
            start_services
            if [[ "$SKIP_MIGRATE" != "true" ]]; then
                sleep 15  # Wait for services to start
                run_migrations
            fi
            log_success "Production environment is ready!"
            ;;
        build)
            build_images
            ;;
        stop)
            stop_services
            ;;
        down)
            down_services
            ;;
        logs)
            show_logs
            ;;
        ps)
            show_services
            ;;
        restart)
            restart_services
            ;;
        migrate)
            run_migrations
            ;;
        backup)
            create_backup
            ;;
        restore)
            restore_backup "$2"
            ;;
        test)
            run_tests
            ;;
        health)
            health_check
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Create necessary directories
mkdir -p backups logs

# Run main function
main "$@"