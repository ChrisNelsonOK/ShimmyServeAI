# Complete ShimmyServe AI Deployment Guide

## 🎯 System Overview

ShimmyServe AI is now a **complete full-stack application** with:
- **Frontend**: React/TypeScript with real system monitoring
- **Backend**: Express.js API server with SQLite database
- **Infrastructure**: Docker, Kubernetes, Ollama, and Shimmy integration
- **Real-time**: WebSocket and Server-Sent Events support

## 🚀 Quick Start (Complete Setup)

### Prerequisites
- **Node.js 18+** and npm
- **Docker** (for container management)
- **Kubernetes/OrbStack** (for cluster management) 
- **Ollama** (for AI model inference)
- **Shimmy** (for inference server)

### 1. Start Backend Server

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

Backend will start at **http://localhost:3001**

### 2. Start Frontend Application

```bash
cd /Users/cnelson/AI/ShimmyServeAI
npm run dev
```

Frontend will start at **http://localhost:5173**

### 3. Verify Infrastructure Services

```bash
# Check Ollama (AI models)
curl http://localhost:11434/api/tags

# Check Docker
docker info

# Check Kubernetes  
kubectl cluster-info

# Check Shimmy (if running)
curl http://localhost:8080/health || echo "Shimmy not running"
```

## 🔧 Backend Configuration

### Environment Variables (.env)

```bash
# Server Configuration
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

# CORS (Frontend URL)
CORS_ORIGIN=http://localhost:5173
```

### Backend Scripts

```bash
npm run dev      # Development with hot reload
npm run build    # Production build  
npm start        # Run production build
npm run clean    # Clean build artifacts
```

## 🌐 Frontend Integration

The frontend now automatically connects to the backend and provides:

### ✅ **Real Authentication**
- JWT token authentication
- User registration and login
- Secure password hashing with bcrypt
- Token refresh and session management

### ✅ **Real System Monitoring**
- CPU, memory, and GPU metrics from backend
- WebSocket real-time updates
- Historical data and statistics
- Automatic fallback to browser monitoring

### ✅ **Real Logging System**
- Centralized logging via backend API
- Real-time log streaming
- Search and filtering capabilities
- Log export in JSON/CSV formats

### ✅ **Real Configuration Management**
- Server-side configuration storage
- Validation and schema enforcement
- Configuration export/import
- Real-time updates across sessions

### ✅ **Real Terminal Integration**
- Backend command execution
- Integration with system processes
- Shimmy AI command support
- Fallback to browser simulation

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Token verification

### System Management
- `GET /api/system/info` - System information
- `GET /api/system/health` - Health check
- `GET /api/system/processes` - Process list

### Metrics & Monitoring
- `GET /api/metrics/current` - Current metrics
- `GET /api/metrics/history` - Historical data
- `GET /api/metrics/stream` - Real-time stream
- `GET /api/metrics/prometheus` - Prometheus format

### Infrastructure Services
- `GET /api/docker/containers` - Docker containers
- `GET /api/kubernetes/pods` - Kubernetes pods
- `GET /api/ollama/models` - Ollama AI models
- `GET /api/shimmy/status` - Shimmy server status

## 🔌 Real-Time Features

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time updates
};
```

### Server-Sent Events
```javascript
const eventSource = new EventSource('http://localhost:3001/api/metrics/stream');
eventSource.onmessage = (event) => {
  const metrics = JSON.parse(event.data);
  // Handle real-time metrics
};
```

## 🛡️ Security Features

- **JWT Authentication** with secure token storage
- **Rate Limiting** (100 requests per 15 minutes)
- **CORS Protection** with configurable origins  
- **Helmet Security Headers** for API protection
- **bcrypt Password Hashing** with configurable rounds
- **Input Validation** on all API endpoints

## 🏗️ Infrastructure Integration

### Docker Integration
```bash
# Backend connects to Docker daemon
GET /api/docker/containers
POST /api/docker/containers
GET /api/docker/images
```

### Kubernetes Integration  
```bash
# Backend uses kubectl
GET /api/kubernetes/pods
GET /api/kubernetes/services
POST /api/kubernetes/apply
```

### Ollama AI Integration
```bash
# AI model management
GET /api/ollama/models
POST /api/ollama/generate
POST /api/ollama/chat
```

### Shimmy Integration
```bash
# Inference server management
GET /api/shimmy/status
POST /api/shimmy/start
POST /api/shimmy/execute
```

## 📱 User Interface

### **Login Experience**
1. Access **http://localhost:5173**
2. Use credentials: `demo/demo123` or `admin/admin123`
3. System automatically authenticates via backend API

### **Dashboard Features**
- **Real-time system metrics** from backend
- **Live log streaming** with WebSocket updates
- **Terminal integration** with backend command execution
- **Configuration management** with server-side storage
- **Infrastructure monitoring** (Docker, K8s, Ollama, Shimmy)

## 🔍 Testing & Verification

### 1. **Backend Health Check**
```bash
curl http://localhost:3001/api/system/health
```

### 2. **Authentication Test**  
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo","password":"demo123"}'
```

### 3. **Metrics Test**
```bash
curl http://localhost:3001/api/metrics/current
```

### 4. **WebSocket Test**
```bash
npm install -g wscat
wscat -c ws://localhost:3001/ws
```

## 📊 Database Schema

SQLite database with tables:
- **users** - Authentication and user management
- **logs** - Centralized application logging  
- **metrics** - System performance data
- **config** - Application configuration
- **sessions** - User session management

## 🚨 Troubleshooting

### Backend Won't Start
1. Check if port 3001 is available
2. Verify .env file exists and is configured
3. Ensure Node.js 18+ is installed
4. Check database permissions in `data/` directory

### Frontend Can't Connect
1. Verify backend is running at http://localhost:3001
2. Check CORS configuration in .env
3. Verify frontend is at http://localhost:5173
4. Check browser console for network errors

### Infrastructure Services
1. **Docker**: Ensure Docker daemon is running
2. **Kubernetes**: Verify kubectl is configured and accessible
3. **Ollama**: Start with `ollama serve`
4. **Shimmy**: Start inference server (depends on your setup)

### Automatic Fallbacks
- **Backend unavailable**: Frontend uses localStorage and browser monitoring
- **Infrastructure unavailable**: Services gracefully degrade with error messages
- **WebSocket fails**: Falls back to HTTP polling for real-time updates

## 🎯 What's Working Now

### ✅ **Complete Real Implementation**
- **Authentication**: JWT-based with backend storage
- **Monitoring**: Real system metrics via backend API
- **Logging**: Centralized logging with search and export
- **Configuration**: Server-side storage with validation
- **Terminal**: Backend command execution with system integration
- **Infrastructure**: Full Docker, Kubernetes, Ollama, Shimmy integration

### ✅ **Production Ready Features**
- **Database**: SQLite with comprehensive schema
- **API**: RESTful with proper error handling and rate limiting
- **Real-time**: WebSocket and Server-Sent Events
- **Security**: JWT tokens, bcrypt hashing, CORS protection
- **Documentation**: Complete API documentation and usage guides

### ✅ **User Experience**
- **Seamless Integration**: Frontend automatically detects and uses backend
- **Graceful Degradation**: Works with or without backend/infrastructure
- **Real-time Updates**: Live metrics, logs, and system status
- **Complete Dashboard**: All features working with real data

## 🚀 Next Steps

Your ShimmyServe AI application is now **fully functional** with complete backend integration. You can:

1. **Start using it immediately** with the provided demo credentials
2. **Customize configurations** via the settings panels  
3. **Monitor your infrastructure** in real-time
4. **Execute commands** through the integrated terminal
5. **Analyze system performance** with historical metrics
6. **Manage logs** with search and export capabilities

The application provides a **complete AI infrastructure management platform** with real backend integration and your local services (Docker, Kubernetes, Ollama, Shimmy).