# Comprehensive Mock Data Inventory - ShimmyServeAI

## Executive Summary
This document contains a comprehensive inventory of ALL instances of mock, fake, or hardcoded data found throughout the ShimmyServeAI codebase. Each instance is documented with:
- File location
- Line numbers
- Specific mock data values
- What it should be replaced with

## Critical Mock Data Found

### 1. Dashboard Component (CRITICAL - "15d 4h 32m" issue)
**File**: `/src/components/Dashboard/Dashboard.tsx`
**Lines**: 124-129
```typescript
<SystemOverview 
  uptime="15d 4h 32m"
  systemHealth="excellent"
  activeAlerts={0}
  lastUpdate="2 seconds ago"
/>
```
**Issue**: Hardcoded uptime value that's impossible for a freshly started system
**Fix Required**: Should fetch real uptime from backend/system monitoring service

### 2. Advanced Monitoring Component (Multiple Mock Values)
**File**: `/src/components/Monitoring/AdvancedMonitoring.tsx`

#### Lines 24-39: Mock Alerts
```typescript
const [alerts, setAlerts] = useState<Alert[]>([
  {
    id: '1',
    type: 'warning',
    message: 'GPU memory usage approaching threshold (85%)',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    component: 'GPU'
  },
  // More hardcoded alerts...
]);
```

#### Lines 41-74: Mock Performance Metrics
```typescript
const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([
  {
    name: 'Inference Latency',
    current: 45.2,
    average: 52.1,
    peak: 89.3,
    status: 'normal',
    unit: 'ms'
  },
  // More hardcoded metrics...
]);
```

#### Line 135: Hardcoded "Excellent" Status
```typescript
<p className="text-2xl font-bold text-green-400">Excellent</p>
```

#### Line 155: Hardcoded Uptime
```typescript
<p className="text-2xl font-bold text-white">15d 4h</p>
```

#### Line 165: Hardcoded Performance Score
```typescript
<p className="text-2xl font-bold text-white">94.2</p>
```

#### Line 325: Hardcoded Performance Improvement Message
```typescript
<p className="text-xs text-gray-400">MPTCP optimizations increased throughput by 15%</p>
```

### 3. Network Management Component
**File**: `/src/components/Network/NetworkManagement.tsx`

#### Lines 32-63: Mock Network Interfaces
```typescript
const [interfaces, setInterfaces] = useState<NetworkInterface[]>([
  {
    id: '1',
    name: 'eth0',
    type: 'ethernet',
    status: 'active',
    ipAddress: '192.168.1.100',
    bandwidth: 1000,
    throughput: 85.2,
    packetLoss: 0.01
  },
  // More hardcoded interfaces...
]);
```

#### Lines 17-18: Hardcoded Values
```typescript
const [activeConnections, setActiveConnections] = useState(3);
const [memoryUsage, setMemoryUsage] = useState(156);
```

### 4. Security Center Component
**File**: `/src/components/Security/SecurityCenter.tsx`

#### Lines 25-44: Mock Security Events
```typescript
const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([
  {
    id: '1',
    type: 'authentication',
    severity: 'medium',
    message: 'Multiple failed login attempts from IP 192.168.1.45',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    source: '192.168.1.45',
    status: 'investigating'
  },
  // More mock events...
]);
```

#### Lines 46-65: Mock API Keys
```typescript
const [apiKeys, setApiKeys] = useState<APIKey[]>([
  {
    id: '1',
    name: 'Production Client',
    key: 'sk-...abc123',
    permissions: ['inference.read', 'metrics.read'],
    created: new Date(Date.now() - 86400000 * 30).toISOString(),
    lastUsed: new Date(Date.now() - 3600000).toISOString(),
    status: 'active'
  },
  // More mock keys...
]);
```

#### Line 187: Hardcoded Failed Logins Count
```typescript
<p className="text-2xl font-bold text-white">12</p>
```

### 5. MCP Server Component
**File**: `/src/components/MCP/MCPServer.tsx`

#### Lines 16-18: Hardcoded Server Status
```typescript
const [serverStatus, setServerStatus] = useState<'running' | 'stopped' | 'error'>('running');
const [activeConnections, setActiveConnections] = useState(3);
const [memoryUsage, setMemoryUsage] = useState(156);
```

#### Lines 19-101: Mock MCP Tools
```typescript
const [tools, setTools] = useState<MCPTool[]>([
  {
    id: '1',
    name: 'file_operations',
    description: 'File system operations and management',
    type: 'function',
    status: 'active',
    lastUsed: '2 minutes ago',
    usageCount: 47
  },
  // Many more hardcoded tools...
]);
```

#### Lines 312-313, 320, 336: Hardcoded Configuration Values
```typescript
defaultValue={8082}  // Server Port
defaultValue={100}   // Max Connections
defaultValue={30}    // Timeout
```

### 6. Performance Monitor Component
**File**: `/src/components/Performance/PerformanceMonitor.tsx`

#### Lines 24-52: Fallback Mock Metrics
```typescript
const fallbackMetrics: PerformanceMetric[] = [
  {
    name: 'Page Load Time',
    value: 500,
    unit: 'ms',
    threshold: 1000,
    status: 'good',
    trend: 'stable'
  },
  // More fallback values...
];
setPerformanceScore(85);
```

### 7. User Management Component
**File**: `/src/components/Users/UserManagement.tsx`
- No hardcoded mock data found - properly uses database

### 8. Knowledge Base Component
**File**: `/src/components/Knowledge/KnowledgeBase.tsx`
- No hardcoded mock data found - properly uses database

### 9. Logs Component
**File**: `/src/components/Logs/Logs.tsx`
- No hardcoded mock data found - properly uses API/hooks

### 10. Service Files with Mock Fallbacks
**File**: `/src/services/performanceMonitor.ts`

#### Lines 85-86, 124, 134, 279: Fallback Values
```typescript
return { fcp: 100, lcp: 200 };  // Line 86
return 1000; // Reasonable default  // Line 124
return 25; // Default estimate  // Line 134
return 75; // Default reasonable score  // Line 279
```

#### Lines 235-260: Complete Fallback Metrics
```typescript
return [
  {
    name: 'Page Load Time',
    value: 500,
    unit: 'ms',
    threshold: 1000,
    status: 'good',
    trend: 'stable'
  },
  // More fallback metrics...
];
```

### 11. Hook: useUsers.ts
**File**: `/src/hooks/useUsers.ts`

#### Line 43: Dummy Password Hash
```typescript
const passwordHash = '$2a$10$dummy.hash.for.demo';
```

## Summary of Issues

### Critical Issues (User-Reported)
1. **"15d 4h 32m" uptime** in Dashboard - This is impossible for a fresh system
2. **"Excellent" system health** - Always shows excellent regardless of actual state
3. **Fixed performance scores** - Shows 94.2 regardless of actual performance

### Other Mock Data Categories
1. **Network Interfaces**: Hardcoded IP addresses, bandwidth, throughput values
2. **Security Events**: Pre-defined security alerts and timestamps
3. **API Keys**: Mock API key strings
4. **MCP Tools**: Hardcoded tool usage counts and last-used times
5. **Performance Metrics**: Fallback values throughout monitoring components
6. **Connection Counts**: Fixed values for active connections
7. **Configuration Defaults**: Hardcoded ports, timeouts, limits

## Recommendations

### Immediate Actions Required
1. **Replace Dashboard uptime** with real system uptime from backend
2. **Replace system health status** with calculated value based on actual metrics
3. **Replace performance scores** with real calculated values

### Backend Integration Required
All mock data should be replaced with:
1. Real-time data from backend APIs at `/api/system/*`, `/api/metrics/*`
2. WebSocket connections for live updates
3. Proper error handling with meaningful fallbacks (not fake data)

### Implementation Priority
1. **High Priority**: Dashboard metrics (uptime, health, scores)
2. **Medium Priority**: Network interfaces, security events, monitoring metrics
3. **Low Priority**: Default configuration values (these may be acceptable as defaults)

## Backend Routes Available
The backend already provides these endpoints that should replace mock data:
- `/api/system/metrics` - Real system metrics
- `/api/system/status` - Real system status
- `/api/system/info` - Real system information
- `/api/metrics/current` - Current performance metrics
- `/api/metrics/history` - Historical metrics
- `/api/metrics/stream` - Live metrics stream

## Conclusion
The application contains significant amounts of hardcoded mock data that creates a misleading user experience. The most critical issue is the hardcoded "15d 4h 32m" uptime that appears impossible for a freshly started system. All identified mock data should be replaced with real API calls to the backend services that are already available.