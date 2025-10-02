# ShimmyServe Backend API

Real backend API server for ShimmyServe AI application with Docker, Kubernetes, Ollama, and Shimmy integration.

## Features

- **Complete REST API** with authentication and rate limiting
- **Real-time WebSocket** support for live updates
- **Docker Integration** for container management
- **Kubernetes Integration** for cluster management  
- **Ollama AI Integration** for model inference
- **Shimmy Integration** for inference server management
- **SQLite Database** with comprehensive metrics and logging
- **JWT Authentication** with bcrypt password hashing
- **Real System Monitoring** with performance metrics collection
- **TypeScript** with strict type checking

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (for container management)
- Kubernetes/OrbStack (for cluster management)
- Ollama (for AI model inference)
- Shimmy (for inference server)

### Installation

1. **Clone and setup:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   npm install
   ```

2. **Development mode:**
   ```bash
   npm run dev
   ```

3. **Production build:**
   ```bash
   npm run build
   npm start
   ```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=3001
HOST=localhost
NODE_ENV=development

# Database
DB_PATH=./data/shimmy.db

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# External Services
OLLAMA_HOST=http://localhost:11434
SHIMMY_HOST=http://localhost:8080

# CORS
CORS_ORIGIN=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification
- `POST /api/auth/refresh` - Token refresh

### System Management
- `GET /api/system/info` - System information
- `GET /api/system/health` - Health check
- `GET /api/system/processes` - Process list

### Docker Integration
- `GET /api/docker/containers` - List containers
- `POST /api/docker/containers` - Create container
- `GET /api/docker/images` - List images
- `POST /api/docker/build` - Build image

### Kubernetes Integration
- `GET /api/kubernetes/pods` - List pods
- `GET /api/kubernetes/services` - List services
- `GET /api/kubernetes/deployments` - List deployments
- `POST /api/kubernetes/apply` - Apply manifests

### Ollama AI Integration
- `GET /api/ollama/models` - List models
- `POST /api/ollama/generate` - Generate text
- `POST /api/ollama/chat` - Chat with model
- `POST /api/ollama/ask` - Ask questions

### Shimmy Integration
- `GET /api/shimmy/status` - Service status
- `POST /api/shimmy/start` - Start service
- `POST /api/shimmy/execute` - Execute commands
- `GET /api/shimmy/models` - List models

### Metrics & Monitoring
- `GET /api/metrics/current` - Current metrics
- `GET /api/metrics/history` - Historical data
- `GET /api/metrics/stream` - Real-time stream
- `GET /api/metrics/prometheus` - Prometheus format

### Logging
- `GET /api/logs` - Get logs
- `GET /api/logs/search` - Search logs
- `GET /api/logs/stream` - Real-time logs
- `GET /api/logs/export` - Export logs

### Configuration
- `GET /api/config` - Get configurations
- `PUT /api/config/:type` - Update config
- `POST /api/config/:type/validate` - Validate config

## WebSocket Events

Connect to `/ws` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  switch(event.type) {
    case 'metrics':
      // Handle metrics update
      break;
    case 'logs':
      // Handle new log entries
      break;
    case 'system':
      // Handle system events
      break;
  }
});
```

## Database Schema

SQLite database with tables for:
- **users** - User accounts and authentication
- **logs** - Application and system logs
- **metrics** - Performance and system metrics
- **config** - Application configuration
- **sessions** - User sessions and tokens

## Development

### Scripts
- `npm run dev` - Development with hot reload
- `npm run build` - Production build
- `npm run type-check` - TypeScript checking
- `npm run clean` - Clean build artifacts

### Architecture
```
src/
├── server.ts          # Main server entry point
├── services/          # Core business logic
│   ├── database.ts    # SQLite database service
│   ├── docker.ts      # Docker integration
│   ├── kubernetes.ts  # Kubernetes integration
│   ├── ollama.ts      # Ollama AI service
│   ├── shimmy.ts      # Shimmy service
│   ├── systemMonitor.ts # System monitoring
│   └── websocket.ts   # WebSocket service
├── routes/            # API route handlers
│   ├── auth.ts        # Authentication routes
│   ├── system.ts      # System management
│   ├── docker.ts      # Docker routes
│   ├── kubernetes.ts  # Kubernetes routes
│   ├── ollama.ts      # Ollama routes
│   ├── shimmy.ts      # Shimmy routes
│   ├── metrics.ts     # Metrics routes
│   ├── logs.ts        # Logging routes
│   └── config.ts      # Configuration routes
└── utils/             # Utility functions
    └── logger.ts      # Logging utility
```

## Integration

This backend is designed to work with the ShimmyServe AI frontend application. It replaces the browser-only localStorage mock implementations with real backend services.

### Frontend Integration

Update frontend services to use backend API:

```typescript
// Instead of localStorage
const response = await fetch('http://localhost:3001/api/metrics/current');
const data = await response.json();
```

### Docker Integration

Requires Docker daemon running:

```bash
# Check Docker status
docker info

# If using OrbStack on macOS
orbstack status
```

### Kubernetes Integration

Requires kubectl configured:

```bash
# Check cluster access
kubectl cluster-info

# Set namespace
kubectl config set-context --current --namespace=default
```

### Ollama Integration

Requires Ollama running:

```bash
# Start Ollama
ollama serve

# Check status
curl http://localhost:11434/api/tags
```

### Shimmy Integration

Requires Shimmy inference server:

```bash
# Start Shimmy (adjust for your setup)
shimmy --port 8080
```

## Security

- JWT token authentication
- bcrypt password hashing
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation on all endpoints

## Monitoring

- Real-time system metrics collection
- Performance monitoring
- Error tracking and logging
- Health check endpoints
- Prometheus metrics export

## License

MIT License - See LICENSE file for details.