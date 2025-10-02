#!/bin/bash

# ShimmyServeAI Production Deployment Script
# Usage: ./scripts/deploy.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEPLOYMENT_TYPE="docker"
ENVIRONMENT="production"
SKIP_TESTS=false
SKIP_BUILD=false
SSL_ENABLED=false
DOMAIN=""

# Help function
show_help() {
    echo "ShimmyServeAI Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --type TYPE         Deployment type: docker, local, kubernetes (default: docker)"
    echo "  -e, --env ENV          Environment: production, staging (default: production)"
    echo "  -d, --domain DOMAIN    Domain name for SSL setup"
    echo "  -s, --ssl             Enable SSL/HTTPS setup"
    echo "  --skip-tests          Skip running tests before deployment"
    echo "  --skip-build          Skip building the application"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Basic Docker deployment"
    echo "  $0 -t docker -d example.com -s      # Docker with SSL"
    echo "  $0 -t local                         # Local deployment"
    echo "  $0 --skip-tests --skip-build        # Quick redeploy"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            DEPLOYMENT_TYPE="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -s|--ssl)
            SSL_ENABLED=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -d "backend" ]]; then
        log_error "Please run this script from the ShimmyServeAI root directory"
        exit 1
    fi
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 20 ]]; then
        log_error "Node.js version 20 or higher is required (current: $(node --version))"
        exit 1
    fi
    
    # Check Docker if needed
    if [[ "$DEPLOYMENT_TYPE" == "docker" ]] && ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log_warning "Skipping tests"
        return 0
    fi
    
    log_info "Running comprehensive test suite..."
    
    # Run the comprehensive UI tester
    if [[ -f "tests/e2e/comprehensive-ui-tester.js" ]]; then
        log_info "Running E2E tests..."
        node tests/e2e/comprehensive-ui-tester.js
        
        if [[ $? -ne 0 ]]; then
            log_error "E2E tests failed"
            exit 1
        fi
    fi
    
    # Run backend tests if they exist
    if [[ -f "backend/package.json" ]] && grep -q '"test"' backend/package.json; then
        log_info "Running backend tests..."
        cd backend && npm test && cd ..
    fi
    
    # Run frontend tests if they exist
    if grep -q '"test"' package.json; then
        log_info "Running frontend tests..."
        npm test -- --run
    fi
    
    log_success "All tests passed"
}

# Build application
build_application() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log_warning "Skipping build"
        return 0
    fi
    
    log_info "Building application..."
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm ci
    
    log_info "Installing backend dependencies..."
    cd backend && npm ci && cd ..
    
    # Build frontend
    log_info "Building frontend..."
    npm run build
    
    # Build backend
    log_info "Building backend..."
    cd backend && npm run build && cd ..
    
    log_success "Application built successfully"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    if [[ "$SSL_ENABLED" != true ]] || [[ -z "$DOMAIN" ]]; then
        return 0
    fi
    
    log_info "Setting up SSL for domain: $DOMAIN"
    
    # Create SSL directory
    mkdir -p ssl
    
    # Check if certificates already exist
    if [[ -f "ssl/cert.pem" ]] && [[ -f "ssl/key.pem" ]]; then
        log_warning "SSL certificates already exist"
        return 0
    fi
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y certbot
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot
        else
            log_error "Please install certbot manually"
            exit 1
        fi
    fi
    
    # Get SSL certificate
    log_info "Obtaining SSL certificate..."
    sudo certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN"
    
    # Copy certificates
    sudo cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem ssl/cert.pem
    sudo cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem ssl/key.pem
    sudo chown $(whoami):$(whoami) ssl/*.pem
    
    log_success "SSL certificates configured"
}

# Docker deployment
deploy_docker() {
    log_info "Deploying with Docker..."
    
    # Create necessary directories
    mkdir -p data logs backups nginx
    
    # Setup environment file
    if [[ ! -f ".env.${ENVIRONMENT}" ]]; then
        log_info "Creating environment file..."
        cp .env.production.example ".env.${ENVIRONMENT}"
        log_warning "Please edit .env.${ENVIRONMENT} with your production settings"
    fi
    
    # Build and start containers
    log_info "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build
    
    log_info "Starting containers..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 30
    
    # Check health
    if curl -f http://localhost:3001/api/health &> /dev/null; then
        log_success "Backend is healthy"
    else
        log_error "Backend health check failed"
        docker-compose -f docker-compose.prod.yml logs shimmyserveai
        exit 1
    fi
    
    if curl -f http://localhost:3000 &> /dev/null; then
        log_success "Frontend is healthy"
    else
        log_error "Frontend health check failed"
        exit 1
    fi
    
    log_success "Docker deployment completed successfully"
    
    # Display access information
    echo ""
    echo "🎉 Deployment Complete!"
    echo "📊 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:3001/api"
    if [[ "$SSL_ENABLED" == true ]]; then
        echo "🔒 HTTPS: https://$DOMAIN"
    fi
    echo ""
    echo "Default credentials:"
    echo "📧 Email: demo@example.com"
    echo "🔑 Password: demo123456"
}

# Local deployment
deploy_local() {
    log_info "Deploying locally..."
    
    # Setup environment
    if [[ ! -f "backend/.env" ]]; then
        cp backend/.env.example backend/.env
        log_warning "Please edit backend/.env with your settings"
    fi
    
    # Start backend
    log_info "Starting backend server..."
    cd backend
    nohup npm start > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend (serve built files)
    log_info "Starting frontend server..."
    nohup npx serve dist -l 3000 > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # Save PIDs for later management
    echo $BACKEND_PID > .backend.pid
    echo $FRONTEND_PID > .frontend.pid
    
    # Wait for services
    sleep 10
    
    # Check health
    if curl -f http://localhost:3001/api/health &> /dev/null; then
        log_success "Backend is running (PID: $BACKEND_PID)"
    else
        log_error "Backend failed to start"
        exit 1
    fi
    
    if curl -f http://localhost:3000 &> /dev/null; then
        log_success "Frontend is running (PID: $FRONTEND_PID)"
    else
        log_error "Frontend failed to start"
        exit 1
    fi
    
    log_success "Local deployment completed successfully"
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "📊 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:3001/api"
    echo ""
    echo "To stop services:"
    echo "kill \$(cat .backend.pid .frontend.pid)"
}

# Main deployment function
main() {
    echo "🚀 ShimmyServeAI Deployment Script"
    echo "=================================="
    echo "Deployment Type: $DEPLOYMENT_TYPE"
    echo "Environment: $ENVIRONMENT"
    echo "SSL Enabled: $SSL_ENABLED"
    if [[ -n "$DOMAIN" ]]; then
        echo "Domain: $DOMAIN"
    fi
    echo ""
    
    # Run deployment steps
    check_prerequisites
    run_tests
    build_application
    setup_ssl
    
    case $DEPLOYMENT_TYPE in
        docker)
            deploy_docker
            ;;
        local)
            deploy_local
            ;;
        kubernetes)
            log_error "Kubernetes deployment not implemented yet"
            exit 1
            ;;
        *)
            log_error "Unknown deployment type: $DEPLOYMENT_TYPE"
            exit 1
            ;;
    esac
    
    log_success "🎉 Deployment completed successfully!"
}

# Run main function
main "$@"