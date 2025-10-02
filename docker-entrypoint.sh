#!/bin/sh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting ShimmyServeAI Production Server${NC}"

# Create necessary directories
mkdir -p /app/data/logs /app/data/backups

# Initialize database if it doesn't exist
if [ ! -f "/app/data/shimmy.db" ]; then
    echo -e "${YELLOW}📊 Initializing database...${NC}"
    cd /app/backend && node dist/scripts/init-db.js
    echo -e "${GREEN}✅ Database initialized${NC}"
fi

# Start nginx in background for frontend
echo -e "${YELLOW}🌐 Starting nginx for frontend...${NC}"
nginx -g "daemon off;" &
NGINX_PID=$!

# Function to handle shutdown
shutdown() {
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    kill $NGINX_PID $BACKEND_PID 2>/dev/null || true
    wait $NGINX_PID $BACKEND_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Shutdown complete${NC}"
    exit 0
}

# Set up signal handlers
trap 'shutdown' TERM INT

# Start backend server
echo -e "${YELLOW}⚙️ Starting backend server...${NC}"
cd /app/backend && node dist/server.js &
BACKEND_PID=$!

echo -e "${GREEN}🎉 ShimmyServeAI is ready!${NC}"
echo -e "${GREEN}📊 Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}🔧 Backend API: http://localhost:3001/api${NC}"

# Wait for any process to exit
wait $NGINX_PID $BACKEND_PID