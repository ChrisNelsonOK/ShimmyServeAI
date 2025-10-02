import { useState, useEffect, useCallback, useRef } from 'react';
import { SystemMetrics } from '../types';
import { realMonitoringService } from '../services/realMonitoringService';

interface SystemHistory {
  timestamps: number[];
  cpu: number[];
  memory: number[];
  gpu: number[];
  networkIn: number[];
  networkOut: number[];
}

export function useSystemMetrics(enableBackend: boolean = true) {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 0,
    memory: 0,
    gpu: 0,
    network: { inbound: 0, outbound: 0 },
    inference: { requestsPerSecond: 0, averageLatency: 0, activeConnections: 0 },
    disk: { usage: 0, read: 0, write: 0 },
    timestamp: Date.now(),
  });

  const [history, setHistory] = useState<SystemHistory>({
    timestamps: [],
    cpu: [],
    memory: [],
    gpu: [],
    networkIn: [],
    networkOut: [],
  });

  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    usingBackend: false,
    usingWebSocket: false,
    usingEventSource: false,
  });

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Update history with new metrics
  const updateHistory = useCallback((newMetrics: SystemMetrics) => {
    setHistory(prev => ({
      timestamps: [...prev.timestamps, newMetrics.timestamp].slice(-50),
      cpu: [...prev.cpu, newMetrics.cpu].slice(-50),
      memory: [...prev.memory, newMetrics.memory].slice(-50),
      gpu: [...prev.gpu, newMetrics.gpu].slice(-50),
      networkIn: [...prev.networkIn, newMetrics.network?.inbound || 0].slice(-50),
      networkOut: [...prev.networkOut, newMetrics.network?.outbound || 0].slice(-50),
    }));
  }, []);

  // Handle metrics update from any source
  const handleMetricsUpdate = useCallback((newMetrics: SystemMetrics) => {
    setMetrics(newMetrics);
    updateHistory(newMetrics);
  }, [updateHistory]);

  // Poll for metrics when WebSocket/EventSource is not available
  const pollMetrics = useCallback(async () => {
    try {
      const newMetrics = await realMonitoringService.getCurrentMetrics();
      handleMetricsUpdate(newMetrics);
    } catch (error) {
      console.error('Failed to poll metrics:', error);
    }
  }, [handleMetricsUpdate]);

  useEffect(() => {
    if (!enableBackend) {
      // If backend is disabled, just poll using browser metrics
      pollMetrics();
      pollingInterval.current = setInterval(pollMetrics, 2000);
      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
      };
    }

    // Try to connect to backend monitoring services
    // 1. Try WebSocket first (preferred for real-time)
    realMonitoringService.connectWebSocket();
    
    // 2. Try EventSource as fallback
    realMonitoringService.connectEventSource();

    // Subscribe to metrics updates
    const unsubscribe = realMonitoringService.subscribeToMetrics(handleMetricsUpdate);

    // Set up polling as final fallback
    pollMetrics(); // Initial poll
    pollingInterval.current = setInterval(pollMetrics, 2000);

    // Update connection status periodically
    const statusInterval = setInterval(() => {
      const status = realMonitoringService.getConnectionStatus();
      setConnectionStatus({
        isConnected: status.websocketConnected || status.eventSourceConnected || status.backendAvailable,
        usingBackend: status.backendAvailable && !status.usingFallback,
        usingWebSocket: status.websocketConnected,
        usingEventSource: status.eventSourceConnected,
      });
    }, 1000);

    // Cleanup
    return () => {
      unsubscribe();
      realMonitoringService.dispose();
      
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      
      clearInterval(statusInterval);
    };
  }, [enableBackend, handleMetricsUpdate, pollMetrics]);

  // Fetch historical data if connected to backend
  const fetchHistory = useCallback(async (minutes: number = 60) => {
    try {
      const historyData = await realMonitoringService.getMetricsHistory(minutes);
      if (historyData.metrics.length > 0) {
        // Convert historical data to our history format
        const newHistory: SystemHistory = {
          timestamps: [],
          cpu: [],
          memory: [],
          gpu: [],
          networkIn: [],
          networkOut: [],
        };

        historyData.metrics.forEach(metric => {
          newHistory.timestamps.push(metric.timestamp);
          newHistory.cpu.push(metric.cpu);
          newHistory.memory.push(metric.memory);
          newHistory.gpu.push(metric.gpu);
          newHistory.networkIn.push(metric.network?.inbound || 0);
          newHistory.networkOut.push(metric.network?.outbound || 0);
        });

        setHistory(newHistory);
      }
    } catch (error) {
      console.error('Failed to fetch metrics history:', error);
    }
  }, []);

  // Fetch summary statistics
  const fetchSummary = useCallback(async (minutes: number = 60) => {
    try {
      return await realMonitoringService.getMetricsSummary(minutes);
    } catch (error) {
      console.error('Failed to fetch metrics summary:', error);
      return null;
    }
  }, []);

  return {
    metrics,
    history,
    isConnected: connectionStatus.isConnected,
    connectionStatus,
    fetchHistory,
    fetchSummary,
  };
}