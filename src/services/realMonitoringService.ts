// Real monitoring service that integrates with backend API
// Maintains browser-based monitoring as fallback

import { SystemMetrics } from '../types';
import { api } from '../utils/api';
import { systemMonitor } from './systemMonitor';

interface MetricsHistory {
  metrics: SystemMetrics[];
  startTime: number;
  endTime: number;
}

interface MetricsSummary {
  cpu: { avg: number; max: number; min: number };
  memory: { avg: number; max: number; min: number };
  gpu: { avg: number; max: number; min: number };
  network: {
    inbound: { avg: number; max: number; min: number };
    outbound: { avg: number; max: number; min: number };
  };
  inference: {
    requestsPerSecond: { avg: number; max: number; min: number };
    averageLatency: { avg: number; max: number; min: number };
    activeConnections: { avg: number; max: number; min: number };
  };
  disk: {
    usage: { avg: number; max: number; min: number };
    read: { avg: number; max: number; min: number };
    write: { avg: number; max: number; min: number };
  };
  count: number;
}

class RealMonitoringService {
  private static instance: RealMonitoringService;
  private websocket: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private isBackendAvailable = false;
  private fallbackToBrowser = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private metricsCallbacks: Set<(metrics: SystemMetrics) => void> = new Set();
  
  static getInstance(): RealMonitoringService {
    if (!RealMonitoringService.instance) {
      RealMonitoringService.instance = new RealMonitoringService();
    }
    return RealMonitoringService.instance;
  }

  private constructor() {
    this.checkBackendAvailability();
  }

  // Check if backend is available
  private async checkBackendAvailability(): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/api/metrics/current', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      this.isBackendAvailable = response.ok;
      
      if (this.isBackendAvailable) {
        this.fallbackToBrowser = false;
        console.log('Backend monitoring service available');
      } else {
        this.fallbackToBrowser = true;
        console.warn('Backend monitoring service unavailable, using browser fallback');
      }
    } catch (error) {
      this.isBackendAvailable = false;
      this.fallbackToBrowser = true;
      console.warn('Backend monitoring service unavailable, using browser fallback:', error);
    }
  }

  // Connect to WebSocket for real-time metrics
  public connectWebSocket(): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.websocket = new WebSocket('ws://localhost:3001/ws');

      this.websocket.onopen = () => {
        console.log('WebSocket connected to monitoring service');
        this.isBackendAvailable = true;
        this.fallbackToBrowser = false;
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'metrics') {
            this.notifyMetricsUpdate(data.payload);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.websocket = null;
        
        // Attempt to reconnect after 5 seconds
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = setTimeout(() => {
          this.connectWebSocket();
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.fallbackToBrowser = true;
    }
  }

  // Connect to Server-Sent Events for streaming metrics
  public connectEventSource(): void {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    try {
      this.eventSource = new EventSource('http://localhost:3001/api/metrics/stream');

      this.eventSource.onopen = () => {
        console.log('EventSource connected to monitoring service');
        this.isBackendAvailable = true;
        this.fallbackToBrowser = false;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const metrics = JSON.parse(event.data);
          this.notifyMetricsUpdate(metrics);
        } catch (error) {
          console.error('Failed to parse EventSource message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.eventSource = null;
          // Fall back to polling or browser metrics
          this.fallbackToBrowser = true;
        }
      };
    } catch (error) {
      console.error('Failed to connect EventSource:', error);
      this.fallbackToBrowser = true;
    }
  }

  // Get current metrics
  public async getCurrentMetrics(): Promise<SystemMetrics> {
    // First try backend API
    if (this.isBackendAvailable && !this.fallbackToBrowser) {
      try {
        const metrics = await api.get<SystemMetrics>('/metrics/current', { authenticated: false });
        return metrics;
      } catch (error) {
        console.warn('Failed to get metrics from backend, falling back to browser:', error);
        this.fallbackToBrowser = true;
      }
    }

    // Fall back to browser-based monitoring
    return await systemMonitor.getSystemMetrics();
  }

  // Get historical metrics
  public async getMetricsHistory(minutes: number = 60): Promise<MetricsHistory> {
    if (this.isBackendAvailable && !this.fallbackToBrowser) {
      try {
        const history = await api.get<MetricsHistory>(`/metrics/history?minutes=${minutes}`, { authenticated: false });
        return history;
      } catch (error) {
        console.warn('Failed to get metrics history from backend:', error);
      }
    }

    // Return empty history if backend is unavailable
    return {
      metrics: [],
      startTime: Date.now() - minutes * 60 * 1000,
      endTime: Date.now(),
    };
  }

  // Get metrics summary
  public async getMetricsSummary(minutes: number = 60): Promise<MetricsSummary> {
    if (this.isBackendAvailable && !this.fallbackToBrowser) {
      try {
        const summary = await api.get<MetricsSummary>(`/metrics/summary?minutes=${minutes}`, { authenticated: false });
        return summary;
      } catch (error) {
        console.warn('Failed to get metrics summary from backend:', error);
      }
    }

    // Return default summary if backend is unavailable
    const current = await this.getCurrentMetrics();
    return this.createDefaultSummary(current);
  }

  // Subscribe to metrics updates
  public subscribeToMetrics(callback: (metrics: SystemMetrics) => void): () => void {
    this.metricsCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.metricsCallbacks.delete(callback);
    };
  }

  // Notify all subscribers of metrics update
  private notifyMetricsUpdate(metrics: SystemMetrics): void {
    this.metricsCallbacks.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in metrics callback:', error);
      }
    });
  }

  // Create a default summary from current metrics
  private createDefaultSummary(current: SystemMetrics): MetricsSummary {
    return {
      cpu: { avg: current.cpu || 0, max: current.cpu || 0, min: current.cpu || 0 },
      memory: { avg: current.memory || 0, max: current.memory || 0, min: current.memory || 0 },
      gpu: { avg: current.gpu || 0, max: current.gpu || 0, min: current.gpu || 0 },
      network: {
        inbound: { avg: current.network?.inbound || 0, max: current.network?.inbound || 0, min: current.network?.inbound || 0 },
        outbound: { avg: current.network?.outbound || 0, max: current.network?.outbound || 0, min: current.network?.outbound || 0 },
      },
      inference: {
        requestsPerSecond: { 
          avg: current.inference?.requestsPerSecond || 0, 
          max: current.inference?.requestsPerSecond || 0, 
          min: current.inference?.requestsPerSecond || 0 
        },
        averageLatency: { 
          avg: current.inference?.averageLatency || 0, 
          max: current.inference?.averageLatency || 0, 
          min: current.inference?.averageLatency || 0 
        },
        activeConnections: { 
          avg: current.inference?.activeConnections || 0, 
          max: current.inference?.activeConnections || 0, 
          min: current.inference?.activeConnections || 0 
        },
      },
      disk: {
        usage: { avg: current.disk?.usage || 0, max: current.disk?.usage || 0, min: current.disk?.usage || 0 },
        read: { avg: current.disk?.read || 0, max: current.disk?.read || 0, min: current.disk?.read || 0 },
        write: { avg: current.disk?.write || 0, max: current.disk?.write || 0, min: current.disk?.write || 0 },
      },
      count: 1,
    };
  }

  // Clean up resources
  public dispose(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.metricsCallbacks.clear();
    
    // Also dispose of the browser monitor
    systemMonitor.dispose();
  }

  // Get connection status
  public getConnectionStatus(): {
    websocketConnected: boolean;
    eventSourceConnected: boolean;
    backendAvailable: boolean;
    usingFallback: boolean;
  } {
    return {
      websocketConnected: this.websocket?.readyState === WebSocket.OPEN,
      eventSourceConnected: this.eventSource?.readyState === EventSource.OPEN,
      backendAvailable: this.isBackendAvailable,
      usingFallback: this.fallbackToBrowser,
    };
  }
}

export const realMonitoringService = RealMonitoringService.getInstance();
export type { MetricsHistory, MetricsSummary };