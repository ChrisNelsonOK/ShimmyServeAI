# Backend Monitoring Integration

This document describes the real monitoring service integration with the backend API.

## Overview

The `realMonitoringService` provides seamless integration between the frontend and backend monitoring systems, with automatic fallback to browser-based monitoring when the backend is unavailable.

## Features

1. **Multiple Connection Methods**
   - WebSocket connection for real-time metrics updates
   - Server-Sent Events (EventSource) as a fallback
   - HTTP polling as final fallback
   - Automatic reconnection with exponential backoff

2. **Backend API Integration**
   - GET `/api/metrics/current` - Current system metrics
   - GET `/api/metrics/history` - Historical metrics data
   - GET `/api/metrics/summary` - Statistical summaries
   - GET `/api/metrics/stream` - Server-Sent Events stream
   - WebSocket `/ws` - Real-time bidirectional updates

3. **Fallback Support**
   - Automatically falls back to browser-based monitoring if backend is unavailable
   - Maintains the same interface regardless of data source
   - Seamless transition between backend and browser monitoring

## Usage

### Basic Usage in Components

```typescript
import { useSystemMetrics } from '../../hooks/useSystemMetrics';

function MyComponent() {
  // Enable backend monitoring (default is true)
  const { metrics, history, connectionStatus } = useSystemMetrics();
  
  // Use metrics data
  console.log('CPU Usage:', metrics.cpu);
  console.log('Connected to backend:', connectionStatus.usingBackend);
}
```

### Advanced Usage

```typescript
function AdvancedMonitoring() {
  const { 
    metrics, 
    history, 
    connectionStatus, 
    fetchHistory, 
    fetchSummary 
  } = useSystemMetrics();

  // Fetch historical data (backend only)
  const loadHistory = async () => {
    await fetchHistory(60); // Last 60 minutes
  };

  // Get statistical summary (backend only)
  const getSummary = async () => {
    const summary = await fetchSummary(30);
    if (summary) {
      console.log('CPU Average:', summary.cpu.avg);
      console.log('Memory Peak:', summary.memory.max);
    }
  };
}
```

### Connection Status

The `connectionStatus` object provides detailed information about the connection state:

```typescript
interface ConnectionStatus {
  isConnected: boolean;      // Any connection active
  usingBackend: boolean;     // Using backend API
  usingWebSocket: boolean;   // WebSocket connected
  usingEventSource: boolean; // EventSource connected
}
```

### Disabling Backend

To use only browser-based monitoring:

```typescript
const { metrics } = useSystemMetrics(false); // Disable backend
```

## Service Architecture

### RealMonitoringService

The core service manages all backend connections and provides a unified interface:

```typescript
class RealMonitoringService {
  // Get current metrics (with fallback)
  getCurrentMetrics(): Promise<SystemMetrics>
  
  // Get historical data (backend only)
  getMetricsHistory(minutes: number): Promise<MetricsHistory>
  
  // Get statistical summary (backend only)
  getMetricsSummary(minutes: number): Promise<MetricsSummary>
  
  // Subscribe to real-time updates
  subscribeToMetrics(callback: (metrics: SystemMetrics) => void): () => void
  
  // Connection management
  connectWebSocket(): void
  connectEventSource(): void
  getConnectionStatus(): ConnectionStatus
}
```

### Data Flow

1. **Primary**: WebSocket connection for lowest latency
2. **Secondary**: Server-Sent Events for unidirectional streaming
3. **Tertiary**: HTTP polling every 2 seconds
4. **Fallback**: Browser-based monitoring using Performance APIs

### Error Handling

- Automatic reconnection on connection loss
- Graceful degradation to browser monitoring
- Error logging without disrupting the UI
- Maintains last known good state during outages

## Browser Monitoring Fallback

When the backend is unavailable, the service automatically uses browser-based monitoring:

- **CPU**: Estimated from JavaScript execution time
- **Memory**: Using Performance.memory API
- **GPU**: WebGL context analysis
- **Network**: Resource timing API
- **Inference**: API request tracking
- **Disk**: Storage API estimates

## Configuration

No configuration needed - the service automatically detects and uses the best available monitoring source. The backend API URL is configured in `/src/utils/api.ts`:

```typescript
const API_BASE_URL = 'http://localhost:3001/api';
```

## Testing

To test the integration:

1. **With Backend**: Start the backend server and verify real-time updates
2. **Without Backend**: Stop the backend and verify browser fallback works
3. **Connection Recovery**: Stop and restart backend to test reconnection

## Example Component

See `/src/components/Monitoring/BackendMonitoringExample.tsx` for a complete example of using the backend monitoring integration.