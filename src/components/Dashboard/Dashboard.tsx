import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { Activity, Cpu, HardDrive, Zap, Network, Users, TrendingUp, Clock } from 'lucide-react';
import { MetricsCard } from './MetricsCard';
import { SystemChart } from './SystemChart';
import { SystemOverview } from './SystemOverview';
import { useSystemMetrics } from '../../hooks/useSystemMetrics';
import { useSystemStatus } from '../../hooks/useSystemStatus';

interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (data: any) => void;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    if (!url) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setConnectionStatus('connecting');
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      onOpen?.();
    };

    ws.onclose = () => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      onClose?.();
      
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      setConnectionStatus('error');
      onError?.(error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch {
        onMessage?.(event.data);
      }
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
  };

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [url]);

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    connect,
    disconnect,
  };
}

export function Dashboard() {
  const { systemStatus, loading: statusLoading, error: statusError } = useSystemStatus();

  // Determine system operational status based on health
  const getOperationalStatus = () => {
    switch (systemStatus.systemHealth) {
      case 'excellent':
      case 'good':
        return { color: 'green', text: 'All systems operational' };
      case 'warning':
        return { color: 'yellow', text: 'Some issues detected' };
      case 'critical':
        return { color: 'red', text: 'Critical issues detected' };
      default:
        return { color: 'gray', text: 'Status unknown' };
    }
  };

  const operationalStatus = getOperationalStatus();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">System Dashboard</h1>
          <p className="text-gray-400">Real-time monitoring and system overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 bg-${operationalStatus.color}-500 rounded-full animate-pulse`}></div>
          <span className={`text-${operationalStatus.color}-400 font-medium`}>
            {statusLoading ? 'Loading...' : operationalStatus.text}
          </span>
        </div>
      </div>

      {/* System Overview */}
      {statusLoading ? (
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-lg bg-dark-700 h-20 w-20"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-dark-700 rounded w-3/4"></div>
              <div className="h-4 bg-dark-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ) : (
        <SystemOverview 
          uptime={systemStatus.uptime}
          systemHealth={systemStatus.systemHealth}
          activeAlerts={systemStatus.activeAlerts}
          lastUpdate={systemStatus.lastUpdate}
        />
      )}

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      </div>
    </div>
  );
}