// Example component demonstrating backend monitoring integration
import React from 'react';
import { useSystemMetrics } from '../../hooks/useSystemMetrics';
import { Activity, Server, Wifi, WifiOff } from 'lucide-react';

export function BackendMonitoringExample() {
  // Enable backend monitoring (default is true)
  const { metrics, history, connectionStatus, fetchHistory, fetchSummary } = useSystemMetrics(true);

  // Example of fetching historical data
  const handleFetchHistory = async () => {
    await fetchHistory(30); // Fetch last 30 minutes
  };

  // Example of fetching summary statistics
  const handleFetchSummary = async () => {
    const summary = await fetchSummary(60); // Get 60 minutes summary
    if (summary) {
      console.log('Metrics summary:', summary);
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Server className="w-6 h-6" />
          Backend Monitoring Status
        </h2>
        
        <div className="flex items-center gap-4">
          {/* Connection Status Indicators */}
          <div className="flex items-center gap-2">
            {connectionStatus.isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className={`text-sm ${connectionStatus.isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Connection Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Backend API</div>
          <div className={`text-sm font-medium ${connectionStatus.usingBackend ? 'text-green-400' : 'text-gray-500'}`}>
            {connectionStatus.usingBackend ? 'Active' : 'Inactive'}
          </div>
        </div>
        
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">WebSocket</div>
          <div className={`text-sm font-medium ${connectionStatus.usingWebSocket ? 'text-green-400' : 'text-gray-500'}`}>
            {connectionStatus.usingWebSocket ? 'Connected' : 'Not Connected'}
          </div>
        </div>
        
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Event Stream</div>
          <div className={`text-sm font-medium ${connectionStatus.usingEventSource ? 'text-green-400' : 'text-gray-500'}`}>
            {connectionStatus.usingEventSource ? 'Connected' : 'Not Connected'}
          </div>
        </div>
        
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Data Source</div>
          <div className="text-sm font-medium text-blue-400">
            {connectionStatus.usingBackend ? 'Backend' : 'Browser'}
          </div>
        </div>
      </div>

      {/* Current Metrics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Current Metrics
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400 mb-1">CPU Usage</div>
            <div className="text-2xl font-bold text-blue-400">{metrics.cpu.toFixed(1)}%</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400 mb-1">Memory</div>
            <div className="text-2xl font-bold text-green-400">{metrics.memory.toFixed(1)}%</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400 mb-1">GPU</div>
            <div className="text-2xl font-bold text-purple-400">{metrics.gpu.toFixed(1)}%</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400 mb-1">Network In</div>
            <div className="text-2xl font-bold text-cyan-400">
              {((metrics.network?.inbound || 0) / 1024).toFixed(1)} KB/s
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400 mb-1">Network Out</div>
            <div className="text-2xl font-bold text-orange-400">
              {((metrics.network?.outbound || 0) / 1024).toFixed(1)} KB/s
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400 mb-1">Requests/s</div>
            <div className="text-2xl font-bold text-pink-400">
              {metrics.inference.requestsPerSecond}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleFetchHistory}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={!connectionStatus.usingBackend}
          >
            Fetch History (30m)
          </button>
          
          <button
            onClick={handleFetchSummary}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            disabled={!connectionStatus.usingBackend}
          >
            Fetch Summary (1h)
          </button>
        </div>
        
        {!connectionStatus.usingBackend && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded text-yellow-400 text-sm">
            Backend monitoring is not available. Using browser-based metrics as fallback.
          </div>
        )}
      </div>
    </div>
  );
}