import React, { useState } from 'react';
import { Workflow, Play, Square, Settings as SettingsIcon, Activity, Users, Zap, Database } from 'lucide-react';

interface MCPTool {
  id: string;
  name: string;
  description: string;
  type: 'function' | 'resource' | 'prompt';
  status: 'active' | 'inactive' | 'error';
  lastUsed: string;
  usageCount: number;
}

export function MCPServer() {
  const [serverStatus, setServerStatus] = useState<'running' | 'stopped' | 'error'>('running');
  const [activeConnections, setActiveConnections] = useState(3);
  const [memoryUsage, setMemoryUsage] = useState(156);
  
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
    {
      id: '2',
      name: 'system_metrics',
      description: 'Real-time system monitoring and metrics',
      type: 'resource',
      status: 'active',
      lastUsed: '30 seconds ago',
      usageCount: 156
    },
    {
      id: '3',
      name: 'code_analysis',
      description: 'Code analysis and optimization tools',
      type: 'function',
      status: 'active',
      lastUsed: '5 minutes ago',
      usageCount: 23
    },
    {
      id: '4',
      name: 'error_diagnostics',
      description: 'System error diagnosis and troubleshooting',
      type: 'prompt',
      status: 'inactive',
      lastUsed: '1 hour ago',
      usageCount: 8
    },
    {
      id: '5',
      name: 'performance_optimizer',
      description: 'Automated performance optimization',
      type: 'function',
      status: 'active',
      lastUsed: '10 minutes ago',
      usageCount: 34
    },
    {
      id: '6',
      name: 'desktop_commander',
      description: 'Desktop Commander MCP - file operations and process management',
      type: 'function',
      status: 'active',
      lastUsed: '1 minute ago',
      usageCount: 67
    },
    {
      id: '7',
      name: 'dc_start_process',
      description: 'Desktop Commander: Start new terminal processes',
      type: 'function',
      status: 'active',
      lastUsed: '3 minutes ago',
      usageCount: 23
    },
    {
      id: '8',
      name: 'dc_read_file',
      description: 'Desktop Commander: Read file contents with advanced features',
      type: 'function',
      status: 'active',
      lastUsed: '2 minutes ago',
      usageCount: 89
    },
    {
      id: '9',
      name: 'dc_search_files',
      description: 'Desktop Commander: Advanced file and content search',
      type: 'function',
      status: 'active',
      lastUsed: '5 minutes ago',
      usageCount: 45
    }
  ]);

  const toggleServerStatus = () => {
    setServerStatus(prev => prev === 'running' ? 'stopped' : 'running');
  };

  const toggleToolStatus = (toolId: string) => {
    setTools(prev => prev.map(tool => 
      tool.id === toolId 
        ? { ...tool, status: tool.status === 'active' ? 'inactive' : 'active' }
        : tool
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'active':
        return 'bg-green-500';
      case 'stopped':
      case 'inactive':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'function':
        return Zap;
      case 'resource':
        return Database;
      case 'prompt':
        return Activity;
      default:
        return Activity;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-dark-950 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crimson-500 rounded-lg flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">MCP Server</h1>
            <p className="text-gray-400">Model Context Protocol server management</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(serverStatus)} animate-pulse`} />
            <span className="text-sm text-gray-300 capitalize">{serverStatus}</span>
          </div>
          <button
            onClick={toggleServerStatus}
            className={`px-4 py-2 rounded-lg transition-colors ${
              serverStatus === 'running'
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {serverStatus === 'running' ? (
              <>
                <Square className="w-4 h-4 inline mr-2" />
                Stop Server
              </>
            ) : (
              <>
                <Play className="w-4 h-4 inline mr-2" />
                Start Server
              </>
            )}
          </button>
        </div>
      </div>

      {/* Server Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Server Status</p>
              <p className="text-2xl font-bold text-white capitalize">{serverStatus}</p>
            </div>
            <div className="w-12 h-12 bg-crimson-500 rounded-lg flex items-center justify-center">
              <Workflow className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Connections</p>
              <p className="text-2xl font-bold text-white">{activeConnections}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Memory Usage</p>
              <p className="text-2xl font-bold text-white">{memoryUsage}MB</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Tools</p>
              <p className="text-2xl font-bold text-white">
                {tools.filter(tool => tool.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tools Management */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">MCP Tools</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">
              {tools.filter(tool => tool.status === 'active').length} of {tools.length} tools active
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {tools.map((tool) => {
            const IconComponent = getTypeIcon(tool.type);
            
            return (
              <div
                key={tool.id}
                className="flex items-center justify-between p-4 bg-dark-900/50 border border-dark-700/30 rounded-lg hover:border-dark-600 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tool.type === 'function' ? 'bg-yellow-500/20 text-yellow-400' :
                    tool.type === 'resource' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-white">{tool.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tool.type === 'function' ? 'bg-yellow-500/20 text-yellow-400' :
                        tool.type === 'resource' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {tool.type}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(tool.status)}`} />
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{tool.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Last used: {tool.lastUsed}</span>
                      <span>Usage count: {tool.usageCount}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleToolStatus(tool.id)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      tool.status === 'active'
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {tool.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors">
                    <SettingsIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Server Configuration */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Server Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Server Port</label>
            <input
              type="number"
              defaultValue={8082}
              className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Connections</label>
            <input
              type="number"
              defaultValue={100}
              className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Protocol Version</label>
            <select className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500">
              <option>1.0.0</option>
              <option>1.1.0</option>
              <option>2.0.0-beta</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Timeout (seconds)</label>
            <input
              type="number"
              defaultValue={30}
              className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="px-4 py-2 bg-crimson-500 text-white rounded-lg hover:bg-crimson-600 transition-colors">
            Apply Configuration
          </button>
        </div>
      </div>
    </div>
  );
}