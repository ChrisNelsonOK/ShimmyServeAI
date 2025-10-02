import { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface SystemStatus {
  uptime: string;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  activeAlerts: number;
  lastUpdate: string;
}

interface SystemInfo {
  uptime: number;
  hostname: string;
  platform: string;
  architecture: string;
  kernel: string;
  timestamp: string;
}

export function useSystemStatus() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    uptime: '0s',
    systemHealth: 'good',
    activeAlerts: 0,
    lastUpdate: 'Loading...'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatUptime = (uptimeSeconds: number): string => {
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const determineSystemHealth = (cpuStatus: string, memoryStatus: string, diskStatus: string): 'excellent' | 'good' | 'warning' | 'critical' => {
    const highStatuses = [cpuStatus, memoryStatus, diskStatus].filter(status => status === 'high').length;
    
    if (highStatuses === 0) return 'excellent';
    if (highStatuses === 1) return 'good';
    if (highStatuses === 2) return 'warning';
    return 'critical';
  };

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both system info and status in parallel
      const [infoResponse, statusResponse] = await Promise.all([
        api.get<{ data: SystemInfo }>('/system/info', { authenticated: false }),
        api.get<{ data: any }>('/system/status', { authenticated: false })
      ]);

      const systemInfo = infoResponse.data;
      const systemStatus = statusResponse.data;
      
      // Format the data for the component
      const formattedStatus: SystemStatus = {
        uptime: formatUptime(systemInfo.uptime),
        systemHealth: determineSystemHealth(
          systemStatus.cpu.status,
          systemStatus.memory.status,
          systemStatus.disk.status
        ),
        activeAlerts: 0, // TODO: Get real alerts count from backend
        lastUpdate: new Date(systemInfo.timestamp).toLocaleString()
      };

      setSystemStatus(formattedStatus);
    } catch (err) {
      console.error('Failed to fetch system status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system status');
      
      // Fallback to basic data
      setSystemStatus({
        uptime: 'Unknown',
        systemHealth: 'warning',
        activeAlerts: 0,
        lastUpdate: 'Failed to load'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    systemStatus,
    loading,
    error,
    refresh: fetchSystemStatus
  };
}