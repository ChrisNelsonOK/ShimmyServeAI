# ShimmyServeAI API Documentation

## Overview

The ShimmyServeAI API provides RESTful endpoints for managing users, system configuration, monitoring, and real-time communication via WebSockets.

## Base URL
- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

## Authentication

All protected endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Getting a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "user",
      "role": "user"
    }
  }
}
```

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com", 
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 2,
      "email": "newuser@example.com",
      "username": "newuser",
      "role": "user"
    }
  }
}
```

#### POST /api/auth/login
Authenticate user and get JWT token.

#### POST /api/auth/logout
Logout current user (invalidates token).

#### GET /api/auth/me
Get current authenticated user information.

### System Information

#### GET /api/system/info
Get basic system information.

**Response:**
```json
{
  "success": true,
  "data": {
    "hostname": "shimmyserve-prod",
    "platform": "linux",
    "arch": "x64",
    "uptime": "2d 5h 32m",
    "version": "1.0.0",
    "nodeVersion": "20.10.0"
  }
}
```

#### GET /api/system/status
Get real-time system status and health metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "systemHealth": "Good",
    "uptime": "2d 5h 32m",
    "activeAlerts": 0,
    "lastUpdate": "2025-01-02T10:30:45.123Z",
    "cpu": {
      "usage": 45.2,
      "cores": 8,
      "temperature": 65
    },
    "memory": {
      "used": 4.2,
      "total": 16.0,
      "usage": 26.25
    },
    "disk": {
      "used": 120.5,
      "total": 500.0,
      "usage": 24.1
    }
  }
}
```

#### GET /api/system/metrics
Get detailed system performance metrics.

### Configuration

#### GET /api/config
Get current system configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "server": {
      "name": "ShimmyServe-01",
      "port": 8080,
      "maxConnections": 1000,
      "timeout": 30000
    },
    "inference": {
      "modelPath": "/opt/shimmy/models/llama2-7b.gguf",
      "batchSize": 32,
      "contextLength": 4096,
      "temperature": 0.7,
      "topP": 0.9,
      "threads": 8
    },
    "network": {
      "enableMPTCP": true,
      "maxSubflows": 4,
      "bufferSize": 65536,
      "congestionControl": "cubic"
    },
    "security": {
      "enableAuthentication": true,
      "tokenExpiry": 86400,
      "enableRateLimit": true,
      "maxRequests": 60
    }
  }
}
```

#### POST /api/config
Update system configuration.

**Request:**
```json
{
  "server": {
    "name": "Updated-Server-Name",
    "maxConnections": 2000
  },
  "inference": {
    "temperature": 0.8
  }
}
```

### User Management

#### GET /api/users
Get list of all users (admin only).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "createdAt": "2024-12-01T00:00:00.000Z",
      "lastLogin": "2025-01-02T09:15:30.000Z"
    },
    {
      "id": 2,
      "username": "user1",
      "email": "user1@example.com", 
      "role": "user",
      "createdAt": "2024-12-15T10:30:00.000Z",
      "lastLogin": "2025-01-01T14:22:10.000Z"
    }
  ]
}
```

#### POST /api/users
Create a new user (admin only).

#### PUT /api/users/:id
Update user information (admin only).

#### DELETE /api/users/:id
Delete user account (admin only).

### Logs

#### GET /api/logs
Get system logs with optional filtering.

**Query Parameters:**
- `level`: Filter by log level (error, warn, info, debug)
- `limit`: Number of entries to return (default: 100)
- `offset`: Pagination offset
- `search`: Search term for log content

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "timestamp": "2025-01-02T10:30:45.123Z",
        "level": "info",
        "category": "system",
        "message": "System startup completed successfully",
        "metadata": {
          "component": "server",
          "version": "1.0.0"
        }
      }
    ],
    "total": 1250,
    "hasMore": true
  }
}
```

### Terminal

#### POST /api/terminal/execute
Execute a command in the system terminal.

**Request:**
```json
{
  "command": "ls -la /opt/shimmy/models",
  "workingDirectory": "/opt/shimmy"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "output": "total 2048\ndrwxr-xr-x 2 shimmy shimmy 4096 Jan 1 12:00 .\ndrwxr-xr-x 3 shimmy shimmy 4096 Jan 1 12:00 ..\n-rw-r--r-- 1 shimmy shimmy 2097152 Jan 1 12:00 llama2-7b.gguf",
    "exitCode": 0,
    "executionTime": 45
  }
}
```

## WebSocket Events

Connect to `/ws` for real-time updates.

### Client → Server Events

#### subscribe
Subscribe to specific event types.

```json
{
  "type": "subscribe",
  "events": ["metrics", "logs", "status"]
}
```

#### unsubscribe
Unsubscribe from event types.

```json
{
  "type": "unsubscribe", 
  "events": ["logs"]
}
```

### Server → Client Events

#### metrics
Real-time system metrics (sent every 5 seconds).

```json
{
  "type": "metrics",
  "timestamp": "2025-01-02T10:30:45.123Z",
  "data": {
    "cpu": 45.2,
    "memory": 26.25,
    "disk": 24.1,
    "network": {
      "inbound": 1024,
      "outbound": 512
    },
    "inference": {
      "requestsPerSecond": 12.5,
      "averageLatency": 250,
      "activeConnections": 5
    }
  }
}
```

#### logs
New log entries as they occur.

```json
{
  "type": "logs",
  "data": [
    {
      "timestamp": "2025-01-02T10:30:45.123Z",
      "level": "info",
      "category": "inference",
      "message": "Model inference completed",
      "metadata": {
        "requestId": "req_123",
        "duration": 245
      }
    }
  ]
}
```

#### status
System status changes.

```json
{
  "type": "status",
  "data": {
    "systemHealth": "Good",
    "uptime": "2d 5h 33m",
    "activeAlerts": 0,
    "lastUpdate": "2025-01-02T10:30:45.123Z"
  }
}
```

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": {}
  }
}
```

### Common Error Codes
- `INVALID_CREDENTIALS` - Authentication failed
- `UNAUTHORIZED` - Missing or invalid JWT token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

## Rate Limiting

API endpoints are rate limited:
- **Authentication**: 5 requests per minute per IP
- **General API**: 60 requests per minute per user
- **System metrics**: 120 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1641024645
```

## Security

### HTTPS
All production APIs must use HTTPS.

### CORS
CORS is configured to allow requests from the frontend domain only.

### Input Validation
All input is validated and sanitized before processing.

### SQL Injection Protection
All database queries use parameterized statements.

---

For more examples and integration guides, see the `/docs/development/` directory.