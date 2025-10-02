import React, { useState, useEffect } from 'react';
import { Network, Wifi, Settings, Activity, Globe, Router, Shield, Zap, Save, AlertTriangle, RefreshCw } from 'lucide-react';

// Extend window object to include MPTCP configuration
declare global {
  interface Window {
    shimmyMPTCPConfig?: MPTCPConfig;
  }
}

interface NetworkInterface {
  id: string;
  name: string;
  type: 'ethernet' | 'wifi' | 'mptcp';
  status: 'active' | 'inactive' | 'error';
  ipAddress: string;
  bandwidth: number;
  throughput: number;
  packetLoss: number;
}

interface MPTCPConfig {
  enabled: boolean;
  maxSubflows: number;
  congestionControl: string;
  scheduler: string;
  pathManager: string;
  checksumEnabled: boolean;
}

export function NetworkManagement() {
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
    {
      id: '2',
      name: 'eth1',
      type: 'ethernet',
      status: 'active',
      ipAddress: '10.0.0.50',
      bandwidth: 1000,
      throughput: 62.8,
      packetLoss: 0.02
    },
    {
      id: '3',
      name: 'mptcp0',
      type: 'mptcp',
      status: 'active',
      ipAddress: '192.168.1.100:8080',
      bandwidth: 2000,
      throughput: 142.3,
      packetLoss: 0.005
    }
  ]);

  const [mptcpConfig, setMptcpConfig] = useState<MPTCPConfig>({
    enabled: true,
    maxSubflows: 4,
    congestionControl: 'cubic',
    scheduler: 'default',
    pathManager: 'default',
    checksumEnabled: true
  });

  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string>('');

  // Load saved MPTCP configuration on component mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('shimmy-mptcp-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setMptcpConfig(parsed);
      } catch (error) {
        console.warn('Failed to load saved MPTCP configuration:', error);
      }
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'inactive': return 'text-gray-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ethernet': return Network;
      case 'wifi': return Wifi;
      case 'mptcp': return Zap;
      default: return Network;
    }
  };

  const handleApplyMPTCPConfig = async () => {
    setApplying(true);
    setApplyError('');
    setApplySuccess(false);

    try {
      // Validate configuration
      if (mptcpConfig.maxSubflows < 1 || mptcpConfig.maxSubflows > 8) {
        throw new Error('Max subflows must be between 1 and 8');
      }

      // Save configuration to localStorage
      localStorage.setItem('shimmy-mptcp-config', JSON.stringify(mptcpConfig));

      // Simulate applying MPTCP configuration to the system
      console.log('Applying MPTCP configuration:', mptcpConfig);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store the active MPTCP configuration globally
      window.shimmyMPTCPConfig = mptcpConfig;
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('shimmy-mptcp-updated', { 
        detail: { config: mptcpConfig } 
      }));

      setApplySuccess(true);
      console.log('MPTCP configuration applied successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setApplySuccess(false), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setApplyError(errorMessage);
      console.error('Failed to apply MPTCP configuration:', error);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-dark-950 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crimson-500 rounded-lg flex items-center justify-center">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Network Management</h1>
            <p className="text-gray-400">Configure network interfaces and MPTCP settings</p>
          </div>
        </div>
      </div>

      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Interfaces</p>
              <p className="text-2xl font-bold text-white">
                {interfaces.filter(i => i.status === 'active').length}
              </p>
            </div>
            <Network className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Bandwidth</p>
              <p className="text-2xl font-bold text-white">
                {interfaces.reduce((sum, i) => sum + i.bandwidth, 0)} Mbps
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">MPTCP Status</p>
              <p className="text-2xl font-bold text-white">
                {mptcpConfig.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <Zap className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Packet Loss</p>
              <p className="text-2xl font-bold text-white">
                {(interfaces.reduce((sum, i) => sum + i.packetLoss, 0) / interfaces.length).toFixed(3)}%
              </p>
            </div>
            <Shield className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Network Interfaces */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Network Interfaces</h3>
        <div className="space-y-4">
          {interfaces.map(interface_ => {
            const TypeIcon = getTypeIcon(interface_.type);
            
            return (
              <div key={interface_.id} className="bg-dark-900/50 border border-dark-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <TypeIcon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-white">{interface_.name}</h4>
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-300">
                          {interface_.type}
                        </span>
                        <span className={`text-sm font-medium ${getStatusColor(interface_.status)}`}>
                          {interface_.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">IP: {interface_.ipAddress}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-300">
                    <div className="text-center">
                      <p className="text-gray-400">Bandwidth</p>
                      <p className="font-medium">{interface_.bandwidth} Mbps</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">Throughput</p>
                      <p className="font-medium">{interface_.throughput.toFixed(1)} Mbps</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400">Packet Loss</p>
                      <p className="font-medium">{interface_.packetLoss}%</p>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MPTCP Configuration */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">MPTCP Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Enable MPTCP</label>
              <button
                onClick={() => setMptcpConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  mptcpConfig.enabled ? 'bg-crimson-500' : 'bg-dark-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  mptcpConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Subflows</label>
              <input
                type="number"
                value={mptcpConfig.maxSubflows}
                onChange={(e) => setMptcpConfig(prev => ({ ...prev, maxSubflows: parseInt(e.target.value) }))}
                min={1}
                max={8}
                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Congestion Control</label>
              <select
                value={mptcpConfig.congestionControl}
                onChange={(e) => setMptcpConfig(prev => ({ ...prev, congestionControl: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
              >
                <option value="cubic">CUBIC</option>
                <option value="bbr">BBR</option>
                <option value="reno">Reno</option>
                <option value="vegas">Vegas</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Scheduler</label>
              <select
                value={mptcpConfig.scheduler}
                onChange={(e) => setMptcpConfig(prev => ({ ...prev, scheduler: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
              >
                <option value="default">Default</option>
                <option value="roundrobin">Round Robin</option>
                <option value="redundant">Redundant</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Path Manager</label>
              <select
                value={mptcpConfig.pathManager}
                onChange={(e) => setMptcpConfig(prev => ({ ...prev, pathManager: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
              >
                <option value="default">Default</option>
                <option value="fullmesh">Full Mesh</option>
                <option value="ndiffports">N Different Ports</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Enable Checksums</label>
              <button
                onClick={() => setMptcpConfig(prev => ({ ...prev, checksumEnabled: !prev.checksumEnabled }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  mptcpConfig.checksumEnabled ? 'bg-crimson-500' : 'bg-dark-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  mptcpConfig.checksumEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
        
        {applyError && (
          <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200">
              Failed to apply MPTCP configuration: {applyError}
            </p>
          </div>
        )}

        {applySuccess && (
          <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center space-x-3">
            <Save className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-200">
              MPTCP configuration applied successfully and saved.
            </p>
          </div>
        )}
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleApplyMPTCPConfig}
            disabled={applying}
            className={`px-4 py-2 rounded-lg transition-colors ${
              applying 
                ? 'bg-dark-700 text-gray-500 cursor-not-allowed' 
                : 'bg-crimson-500 text-white hover:bg-crimson-600'
            }`}
          >
            {applying ? (
              <>
                <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 inline mr-2" />
                Apply MPTCP Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}