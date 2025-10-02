# Terminal Integration Guide

## Overview

The terminal service has been updated to use the real backend API for command execution instead of browser-based simulation. This provides actual system integration with fallback to browser simulation when the backend is unavailable.

## Architecture

### Frontend Components

1. **realTerminalService.ts** (`/src/services/realTerminalService.ts`)
   - Main terminal service that handles command execution
   - Automatically detects backend availability
   - Falls back to browser simulation when backend is unavailable
   - Maintains the same interface for Terminal component compatibility

2. **api.ts** (`/src/lib/api.ts`)
   - API client for backend communication
   - Handles authentication tokens
   - Provides typed interfaces for API responses
   - Includes health check for backend availability

### Backend Components

1. **terminal.ts** (`/backend/src/routes/terminal.ts`)
   - New API endpoint for terminal command execution
   - Handles both system commands and Shimmer AI commands
   - Implements safety controls for unauthenticated users
   - Integrates with existing system monitor and Shimmy services

## Features

### Backend Connected Mode
When the backend is available:
- Real system command execution
- Actual system metrics from the host
- Direct integration with Shimmy, Docker, Kubernetes, and Ollama
- Full system monitoring capabilities
- Authenticated users get full command access
- Unauthenticated users limited to safe commands

### Browser Simulation Mode
When backend is unavailable:
- Simulated file system and process information
- Browser-based performance metrics
- Local storage for configuration
- WebGL-based GPU utilization estimates
- Performance API for memory monitoring

## API Endpoints

### Terminal Execution
`POST /api/terminal/execute`

Request:
```json
{
  "command": "shimmer status",
  "isAuthenticated": true
}
```

Response:
```json
{
  "success": true,
  "data": {
    "command": "shimmer status",
    "output": "Shimmer AI Agent Status...",
    "isShimmerCommand": true,
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

## Configuration

### Environment Variables

Frontend (`.env`):
```env
VITE_API_URL=http://localhost:3001/api
```

Backend (`.env`):
```env
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Usage

### Starting the Services

1. Start the backend:
```bash
cd backend
npm install
npm run dev
```

2. Start the frontend:
```bash
cd ..
npm install
npm run dev
```

### Terminal Commands

#### Shimmer Commands
- `shimmer help` - Show available Shimmer commands
- `shimmer status` - Display system and service status
- `shimmer analyze` - Run comprehensive system analysis
- `shimmer optimize` - Apply performance optimizations
- `shimmer metrics` - Show real-time system metrics
- `shimmer logs [level]` - Display system logs
- `shimmer config` - Show configuration
- `shimmer restart|stop|start` - Control Shimmer service

#### System Commands (Safe Commands)
- `ls`, `pwd`, `whoami`, `date`, `uptime`
- `df -h`, `free -h`, `ps`, `top`
- `env`, `echo`, `which`, `hostname`

#### Advanced Commands (Require Authentication)
- Any command not in the safe list
- Direct file manipulation
- Service control commands
- Network operations

## Security

### Authentication
- Commands are executed with user's authentication status
- Unauthenticated users restricted to safe command whitelist
- Authentication token stored in localStorage
- Token included in API requests via Authorization header

### Command Safety
- Whitelist of safe commands for unauthenticated users
- Command timeout (10 seconds) to prevent hanging
- Output buffer limit (1MB) to prevent memory issues
- Error handling for invalid commands

## Monitoring

The terminal service logs all command executions:
- Command input and output
- Execution time
- Authentication status
- Backend availability
- Error conditions

These logs are stored via the realLoggingService and can be viewed with:
```
shimmer logs all
```

## Troubleshooting

### Backend Not Connecting
1. Check backend is running on correct port
2. Verify CORS settings in backend
3. Check browser console for network errors
4. Ensure VITE_API_URL is correctly set

### Commands Not Working
1. Check authentication status
2. Verify command is in safe list (for unauthenticated)
3. Check backend logs for execution errors
4. Try browser simulation with backend disconnected

### Performance Issues
1. Monitor command execution times in logs
2. Check for timeout errors (10s limit)
3. Verify network latency to backend
4. Consider command complexity

## Future Enhancements

1. WebSocket support for real-time command streaming
2. Command history persistence across sessions
3. Tab completion for commands
4. File upload/download support
5. Terminal multiplexing
6. SSH tunnel support
7. Container shell access