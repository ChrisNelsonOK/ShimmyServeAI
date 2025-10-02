# ShimmyServeAI Development Commands

## Core Development Commands
```bash
npm run dev          # Start Vite development server with hot reload
npm run build        # Create production build in dist/
npm run preview      # Preview production build locally
npm run lint         # Run ESLint code quality checks
npm run typecheck    # Validate TypeScript types
```

## Testing Commands
```bash
npm run test         # Run tests with Vitest
npm run test:ui      # Run tests with UI interface
npm run test:run     # Run tests once (non-watch mode)
```

## Docker Commands
```bash
docker-compose up -d     # Start containerized application
docker-compose down      # Stop containers
docker build .           # Build production image
```

## System Commands (macOS/Darwin)
```bash
# File operations
ls -la              # List files with details
find . -name "*.ts" # Find TypeScript files
grep -r "pattern"   # Search in files
mdfind "filename"   # Spotlight search (fastest for exact filenames)

# Process management
ps aux             # List running processes
pkill -f "process" # Kill process by name
lsof -i :3000     # Check port usage

# Git operations
git status         # Check repository status
git branch         # List branches
git log --oneline  # Compact commit history
```

## Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install

# Start development
npm run dev
```

## MCP Server Management
- Access via web interface: MCP Server section
- Configuration in src/components/MCP/MCPServer.tsx
- Feature flag: VITE_ENABLE_MCP_SERVER=true
- No dedicated configuration files found - managed through UI