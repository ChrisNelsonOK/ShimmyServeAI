# Local Installation Guide

## Overview

This guide covers setting up ShimmyServeAI for local development and testing. Choose the method that best fits your needs.

## Prerequisites

- **Node.js** 20.0.0 or higher
- **npm** 10.0.0 or higher  
- **Git** for cloning the repository
- **Modern Browser** (Chrome, Firefox, Safari, Edge)

## Method 1: Quick Setup (Recommended)

### 1. Clone Repository
```bash
git clone https://github.com/your-org/shimmyserveai.git
cd shimmyserveai
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Set Up Environment
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables (optional for local development)
# nano .env
```

### 4. Initialize Database
```bash
cd backend
npm run setup-db
cd ..
```

### 5. Start Development Servers
```bash
# Start backend (in one terminal)
cd backend
npm run dev

# Start frontend (in another terminal)
npm run dev
```

### 6. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Default Credentials**:
  - Email: `demo@example.com`
  - Password: `demo123456`

## Method 2: Docker Development Setup

### 1. Prerequisites
- **Docker** 20.10+
- **Docker Compose** 2.0+

### 2. Quick Start
```bash
# Clone repository
git clone https://github.com/your-org/shimmyserveai.git
cd shimmyserveai

# Start with Docker Compose
docker-compose up -d

# Access at http://localhost:3000
```

### 3. Development with Docker
```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up -d

# Watch logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build
```

## Method 3: Manual Setup (Advanced)

### 1. Frontend Setup
```bash
# Clone and setup frontend
git clone https://github.com/your-org/shimmyserveai.git
cd shimmyserveai

# Install dependencies
npm install

# Start development server
npm run dev
# Frontend available at http://localhost:5173
```

### 2. Backend Setup (Separate Terminal)
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create database directory
mkdir -p data/logs

# Initialize SQLite database
npm run setup-db

# Start backend server
npm run dev
# Backend API available at http://localhost:3001/api
```

### 3. Verify Setup
```bash
# Test backend health
curl http://localhost:3001/api/health

# Test frontend loading
curl http://localhost:5173
```

## Environment Configuration

### Frontend Environment (.env)
```bash
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001

# Development Settings
VITE_DEV_MODE=true
VITE_DEBUG_LOGS=true

# Feature Flags
VITE_ENABLE_TERMINAL=true
VITE_ENABLE_MONITORING=true
```

### Backend Environment (backend/.env)
```bash
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Database
DATABASE_PATH=./data/shimmy.db

# Security
JWT_SECRET=dev-secret-key-change-in-production
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=./data/logs/app.log

# Development Features
ENABLE_MOCK_DATA=false
ENABLE_DEBUG_ROUTES=true
```

## Database Setup

### Automatic Setup
```bash
cd backend
npm run setup-db
```

### Manual Setup
```bash
# Create database directory
mkdir -p backend/data

# Initialize database with schema
cd backend
node scripts/init-db.js

# Create default admin user
npm run create-admin
```

### Reset Database
```bash
cd backend

# Backup existing database (optional)
cp data/shimmy.db data/shimmy.db.backup

# Reset to clean state
npm run reset-db

# Recreate with sample data
npm run seed-db
```

## Development Workflow

### Starting Development
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
npm run dev

# Terminal 3: Testing (optional)
npm run test:watch
```

### Code Quality
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck

# Format code
npm run format
```

### Testing
```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Run specific test file
npm run test -- --grep "auth"

# Generate test coverage
npm run test:coverage
```

## Common Development Tasks

### Create New User
```bash
cd backend
npm run create-user -- --email="user@example.com" --password="password123" --role="user"
```

### Reset Admin Password
```bash
cd backend
npm run reset-admin-password
```

### View Logs
```bash
# Application logs
tail -f backend/data/logs/app.log

# Development server logs
# Check terminal output where npm run dev is running
```

### Database Management
```bash
cd backend

# View database schema
npm run db:schema

# Export data
npm run db:export

# Import data
npm run db:import -- --file=backup.sql
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :3001
lsof -i :5173

# Kill processes
kill -9 <PID>

# Or change ports in configuration
```

#### Node.js Version Issues
```bash
# Check current version
node --version

# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 20
nvm install 20
nvm use 20
```

#### Database Connection Errors
```bash
# Check if database file exists
ls -la backend/data/shimmy.db

# Check file permissions
chmod 644 backend/data/shimmy.db

# Recreate database
cd backend && npm run setup-db
```

#### Frontend Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Check for TypeScript errors
npm run typecheck
```

#### CORS Issues
```bash
# Verify CORS configuration in backend/.env
CORS_ORIGIN=http://localhost:5173

# Check browser console for CORS errors
# Restart backend server after changing CORS settings
```

### Development Tools

#### VS Code Extensions (Recommended)
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense
- GitLens
- REST Client

#### Browser Extensions
- React Developer Tools
- Redux DevTools (if using Redux)
- Vue.js devtools (if using Vue)

### Performance Optimization

#### Development Server Performance
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max_old_space_size=4096"

# Use faster source maps
# Add to vite.config.ts:
# build: { sourcemap: 'cheap-module-source-map' }
```

#### Database Performance
```bash
# Enable SQLite performance mode
# Add to database connection:
# PRAGMA journal_mode=WAL;
# PRAGMA synchronous=NORMAL;
```

## IDE Setup

### VS Code Configuration
Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.format.enable": true,
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  }
}
```

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### Debug Configuration
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.ts",
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "sourceMaps": true
    },
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vite",
      "args": ["--host", "--port", "5173"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

## Next Steps

After successful local installation:

1. **Explore the Application**:
   - Test all major features
   - Try different user roles
   - Review the admin interface

2. **Read Documentation**:
   - Review API documentation in `/docs/api/`
   - Check development guides in `/docs/development/`

3. **Set Up Development Environment**:
   - Configure your IDE
   - Install recommended extensions
   - Set up debugging

4. **Contribute**:
   - Read CONTRIBUTING.md
   - Set up git hooks
   - Submit bug reports or features

5. **Deploy to Production**:
   - Review deployment guides
   - Configure production environment
   - Set up monitoring and backups

---

For additional help:
- Check `/docs/development/` for development guides
- Review test files for usage examples
- Open GitHub issues for support
- Join community discussions