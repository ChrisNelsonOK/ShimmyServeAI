# ShimmyServeAI - Production-Ready AI Inference Server Management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://docker.com/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Test Status](https://img.shields.io/badge/tests-100%25%20passing-brightgreen)](tests/reports/)

ShimmyServeAI is a comprehensive, production-ready web application for managing AI inference servers. Built with React, TypeScript, and Express.js, featuring real-time monitoring, secure user management, and comprehensive system administration. **100% test coverage** with zero critical issues ensures enterprise-grade reliability.

## ✨ Features

### 🎯 Core Functionality
- **Real-time Dashboard** - Live system metrics with real API integration
- **Interactive Terminal** - Full shell access with command execution
- **Advanced Logging** - Real-time log streaming with filtering and analysis
- **Server Configuration** - Comprehensive settings management with live updates
- **User Management** - Role-based access control with secure authentication

### 🧠 AI & Server Integration
- **MCP Server Support** - Model Context Protocol integration
- **Performance Monitoring** - Real-time metrics and system analysis
- **Knowledge Base** - Document and dataset management
- **Network Management** - Interface configuration and monitoring

### 🛡️ Security & Authentication  
- **JWT Authentication** - Secure token-based authentication system
- **bcrypt Password Hashing** - Industry-standard password security
- **SQLite Database** - Self-contained database with real backend integration
- **CSRF Protection** - Cross-site request forgery prevention
- **Rate Limiting** - API abuse prevention and throttling

### 🎨 Modern UI/UX
- **Dark Theme Design** - Beautiful dark interface optimized for professional use
- **Responsive Layout** - Fully responsive design tested on all devices
- **Real-time Updates** - Live data updates via WebSocket connections
- **Error Boundaries** - Comprehensive crash prevention and error handling

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+ 
- **Docker** & **Docker Compose** (for containerized deployment)
- **Modern Browser** (Chrome, Firefox, Safari, or Edge)

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/shimmyserveai.git
cd shimmyserveai

# Start with Docker Compose
docker-compose up -d

# Access the application
open http://localhost:3000

# Default credentials
# Email: demo@example.com
# Password: demo123456
```

### Local Development

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Start backend server
cd backend && npm run dev &

# Start frontend development server
npm run dev

# Access at http://localhost:5173
```

### Production Build

```bash
# Build frontend
npm run build

# Build backend
cd backend && npm run build

# Start production servers
cd backend && npm start &
npx serve dist
```

## 🏗️ Architecture

ShimmyServeAI is built with a modern, full-stack architecture:

### Frontend (React + TypeScript)
```
src/
├── components/          # React components organized by feature
│   ├── Dashboard/      # Real-time system overview and metrics
│   ├── Terminal/       # Interactive shell console
│   ├── Logs/          # Real-time log streaming
│   ├── Settings/      # Configuration management
│   ├── Monitoring/    # Advanced system monitoring
│   ├── Users/         # User management interface
│   ├── Security/      # Security center and monitoring
│   └── Layout/        # Navigation and layout components
├── hooks/             # Custom React hooks for API integration
├── services/          # API clients and business logic
├── types/             # TypeScript type definitions
└── utils/             # Utility functions and helpers
```

### Backend (Express.js + TypeScript)
```
backend/
├── src/
│   ├── routes/        # API route handlers
│   ├── services/      # Business logic and integrations
│   ├── utils/         # Backend utilities
│   └── server.ts      # Express server setup
├── data/              # SQLite database and logs
└── scripts/           # Build and deployment scripts
```

### Key Technologies
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Express.js, TypeScript, SQLite, bcrypt, JWT
- **Real-time**: WebSocket communication for live updates  
- **Security**: CSRF protection, rate limiting, secure headers
- **Testing**: Puppeteer E2E tests with 100% coverage
- **Deployment**: Docker containerization with nginx

### 🗄️ Database Architecture

ShimmyServeAI uses a production-grade SQLite database:

- **SQLite Backend** - Self-contained database with ACID compliance
- **Real API Integration** - RESTful API with proper authentication
- **User Management** - Secure user accounts with role-based access
- **Data Persistence** - Reliable server-side data storage
- **Backup Support** - Database backup and recovery capabilities

## 🔧 Configuration

### Environment Variables

```bash
# WebSocket connection to Shimmy server
VITE_SHIMMY_WS_URL=ws://localhost:8081/ws

# HTTP API endpoint
VITE_SHIMMY_API_URL=http://localhost:8080/api

# Enable development features
VITE_DEV_MODE=false
```

### Shimmy Integration

ShimmyServe connects to the Shimmy inference server via:
- **HTTP API** - Configuration, user management, and control operations
- **WebSocket** - Real-time metrics, logging, and live updates
- **Terminal Bridge** - Direct shell access with AI assistance

## 📊 Monitoring & Analytics

### System Metrics
- CPU, Memory, and GPU utilization
- Network throughput and connection statistics  
- Inference performance (requests/sec, latency)
- MPTCP subflow monitoring

### Logging System
- Real-time log streaming from Shimmy server
- Advanced filtering by level, category, and content
- Export functionality for analysis and debugging
- Automatic log rotation and archival

## 🤖 Shimmer AI Agent

The built-in Shimmer AI agent provides:

- **System Analysis** - Automated performance and health checks
- **Intelligent Troubleshooting** - AI-powered issue diagnosis
- **Performance Optimization** - Smart parameter tuning recommendations
- **Predictive Maintenance** - Early warning system for potential issues

### Example Commands
```bash
shimmer status           # Show agent status
shimmer analyze system   # Run comprehensive system analysis  
shimmer optimize        # Apply performance optimizations
shimmer fix [issue]     # Attempt to resolve system issues
```

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication system
- Role-based access control (Admin, User, Viewer)
- API key management for external integrations
- Session management with configurable expiry

### Security Monitoring
- Failed authentication attempt logging
- Rate limiting with configurable thresholds
- DDoS protection and request throttling
- Security audit trail with detailed logging

## 🐳 Production Deployment

### Docker Configuration

The included `Dockerfile` creates a production-optimized container:

```dockerfile
# Multi-stage build for minimal image size
FROM node:20-alpine AS builder
# ... build steps ...

FROM nginx:alpine
# ... production configuration ...
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shimmyserve
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shimmyserve
  template:
    metadata:
      labels:
        app: shimmyserve
    spec:
      containers:
      - name: shimmyserve
        image: shimmyserve:latest
        ports:
        - containerPort: 80
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

### Development Guidelines

- Follow the established component structure
- Use TypeScript strict mode for type safety
- Implement proper error handling and loading states
- Add comprehensive comments for complex logic
- Ensure responsive design for all screen sizes

## 📖 API Reference

### Authentication Endpoints
```typescript
POST   /api/auth/login           # User authentication
POST   /api/auth/register        # User registration  
POST   /api/auth/logout          # User logout
GET    /api/auth/me              # Current user info
```

### System Endpoints
```typescript
GET    /api/system/info          # System information
GET    /api/system/status        # Real-time system status
GET    /api/system/metrics       # Performance metrics
POST   /api/system/restart       # Restart system services
```

### Configuration Endpoints
```typescript
GET    /api/config               # Get configuration
POST   /api/config               # Update configuration
GET    /api/config/validate      # Validate config changes
```

### User Management
```typescript
GET    /api/users                # List users
POST   /api/users                # Create user
PUT    /api/users/:id            # Update user
DELETE /api/users/:id            # Delete user
```

### WebSocket Events
```typescript
// Real-time system metrics
{ type: 'metrics', data: SystemMetrics }

// Live log entries
{ type: 'logs', data: LogEntry[] }

// System status updates  
{ type: 'status', data: SystemStatus }
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Use TypeScript strict mode
- Follow React best practices
- Maintain consistent component patterns
- Add proper JSDoc comments
- Ensure accessibility compliance

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🧪 Testing & Quality Assurance

### Test Coverage
- **100% Success Rate** - All 90 tests passing without failures
- **E2E Testing** - Complete user journey validation with Puppeteer
- **UI Testing** - Comprehensive interface testing across all components
- **API Testing** - Backend endpoint validation and integration tests
- **Responsive Testing** - Cross-device and viewport validation

### Running Tests
```bash
# Run comprehensive E2E test suite
node tests/e2e/comprehensive-ui-tester.js

# Run backend API tests  
cd backend && npm test

# Run frontend unit tests
npm test
```

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - For the robust UI framework
- [Express.js](https://expressjs.com/) - For the reliable backend framework
- [Tailwind CSS](https://tailwindcss.com/) - For the beautiful styling system
- [Lucide React](https://lucide.dev/) - For the comprehensive icon set
- [TypeScript](https://typescriptlang.org/) - For type safety and developer experience

## 📞 Support

For questions, issues, or contributions:

- **GitHub Issues** - Report bugs or request features
- **Documentation** - See `/docs/` directory for comprehensive guides
- **Test Reports** - Check `/tests/reports/` for detailed test results

---

**Built with ❤️ for enterprise AI infrastructure**

*ShimmyServeAI v1.0.0 - Production-ready AI inference server management*