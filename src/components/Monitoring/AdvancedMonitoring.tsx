import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Zap, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useSystemMetrics } from '../../hooks/useSystemMetrics';
import { useSystemStatus } from '../../hooks/useSystemStatus';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  component: string;
}

interface PerformanceMetric {
  name: string;
  current: number;
  average: number;
  peak: number;
  status: 'normal' | 'warning' | 'critical';
  unit: string;
}

export function AdvancedMonitoring() {
  const { metrics } = useSystemMetrics();
  const { systemStatus } = useSystemStatus();
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'warning',
      message: 'GPU memory usage approaching threshold (85%)',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      component: 'GPU'
    },
    {
      id: '2',
      type: 'info',
      message: 'MPTCP subflow rebalancing completed successfully',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      component: 'Network'
    }
  ]);

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([
    {
      name: 'Inference Latency',
      current: 45.2,
      average: 52.1,
      peak: 89.3,
      status: 'normal',
      unit: 'ms'
    },
    {
      name: 'Memory Allocation Rate',
      current: 125.6,
      average: 98.4,
      peak: 203.7,
      status: 'warning',
      unit: 'MB/s'
    },
    {
      name: 'Network Throughput',
      current: 1847.3,
      average: 1234.5,
      peak: 2456.8,
      status: 'normal',
      unit: 'KB/s'
    },
    {
      name: 'CPU Temperature',
      current: 67.2,
      average: 62.8,
      peak: 78.5,
      status: 'normal',
      unit: '°C'
    }
  ]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return AlertTriangle;
      case 'warning': return AlertTriangle;
      case 'info': return CheckCircle;
      default: return AlertTriangle;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'info': return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return time.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6 bg-dark-950 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crimson-500 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Advanced Monitoring</h1>
            <p className="text-gray-400">Comprehensive system analysis and performance insights</p>
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">System Health</p>
              <p className={`text-2xl font-bold capitalize ${
                systemStatus.systemHealth === 'excellent' || systemStatus.systemHealth === 'good' 
                  ? 'text-green-400' 
                  : systemStatus.systemHealth === 'warning' 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
              }`}>
                {systemStatus.systemHealth}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Alerts</p>
              <p className="text-2xl font-bold text-yellow-400">{systemStatus.activeAlerts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Uptime</p>
              <p className="text-2xl font-bold text-white">{systemStatus.uptime}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Performance Score</p>
              <p className="text-2xl font-bold text-white">{
                (() => {
                  // Calculate performance score based on system health and metrics
                  let baseScore = 85;
                  if (systemStatus.systemHealth === 'excellent') baseScore = 95;
                  else if (systemStatus.systemHealth === 'good') baseScore = 85;
                  else if (systemStatus.systemHealth === 'warning') baseScore = 70;
                  else if (systemStatus.systemHealth === 'critical') baseScore = 50;
                  
                  // Adjust based on CPU and memory if available
                  if (metrics?.cpu) {
                    baseScore -= Math.max(0, (metrics.cpu - 70) * 0.5);
                  }
                  if (metrics?.memory) {
                    baseScore -= Math.max(0, (metrics.memory - 80) * 0.3);
                  }
                  
                  return Math.max(10, Math.min(100, baseScore)).toFixed(1);
                })()
              }</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Performance Metrics</h3>
        <div className="space-y-4">
          {performanceMetrics.map((metric, index) => (
            <div key={index} className="bg-dark-900/50 border border-dark-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">{metric.name}</h4>
                <span className={`text-sm font-medium ${getStatusColor(metric.status)}`}>
                  {metric.status}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Current</p>
                  <p className="text-lg font-semibold text-white">
                    {(metric.current || 0).toFixed(1)}{metric.unit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Average</p>
                  <p className="text-lg font-semibold text-white">
                    {(metric.average || 0).toFixed(1)}{metric.unit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Peak</p>
                  <p className="text-lg font-semibold text-white">
                    {(metric.peak || 0).toFixed(1)}{metric.unit}
                  </p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      metric.status === 'normal' ? 'bg-green-500' :
                      metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((metric.current / metric.peak) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">System Alerts</h3>
          <button className="px-3 py-1 text-sm bg-crimson-500/20 text-crimson-400 rounded-lg hover:bg-crimson-500/30 transition-colors">
            Clear All
          </button>
        </div>
        
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-300 font-medium">No active alerts</p>
              <p className="text-gray-500 text-sm">System is operating normally</p>
            </div>
          ) : (
            alerts.map(alert => {
              const AlertIcon = getAlertIcon(alert.type);
              const alertColors = getAlertColor(alert.type);
              
              return (
                <div key={alert.id} className={`flex items-start space-x-3 p-3 border rounded-lg ${alertColors}`}>
                  <AlertIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    <div className="flex items-center space-x-3 mt-1 text-xs opacity-80">
                      <span>{alert.component}</span>
                      <span>•</span>
                      <span>{formatTimestamp(alert.timestamp)}</span>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white p-1">
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Resource Utilization Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Resource Utilization</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300">CPU Usage</span>
                <span className="text-sm text-white">{(metrics?.cpu || 0).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div 
                  className="h-2 bg-red-500 rounded-full"
                  style={{ width: `${metrics?.cpu || 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300">Memory Usage</span>
                <span className="text-sm text-white">{(metrics?.memory || 0).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div 
                  className="h-2 bg-blue-500 rounded-full"
                  style={{ width: `${metrics?.memory || 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-300">GPU Usage</span>
                <span className="text-sm text-white">{(metrics?.gpu || 0).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div 
                  className="h-2 bg-purple-500 rounded-full"
                  style={{ width: `${metrics?.gpu || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium">Optimal Performance</p>
                <p className="text-xs text-gray-400">All systems operating within normal parameters</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium">Efficiency Improved</p>
                <p className="text-xs text-gray-400">MPTCP optimizations increased throughput by 15%</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium">Memory Optimization</p>
                <p className="text-xs text-gray-400">Consider increasing buffer sizes for peak loads</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}