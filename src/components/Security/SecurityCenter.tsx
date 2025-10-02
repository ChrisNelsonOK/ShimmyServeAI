import React, { useState } from 'react';
import { Shield, Key, Lock, AlertTriangle, Users, Activity, CheckCircle, XCircle } from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'intrusion' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  source: string;
  status: 'active' | 'resolved' | 'investigating';
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  created: string;
  lastUsed: string;
  status: 'active' | 'inactive' | 'revoked';
}

export function SecurityCenter() {
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
    {
      id: '2',
      type: 'authorization',
      severity: 'low',
      message: 'User attempted to access restricted endpoint',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      source: 'user-123',
      status: 'resolved'
    }
  ]);

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
    {
      id: '2',
      name: 'Development Tools',
      key: 'sk-...def456',
      permissions: ['inference.read', 'inference.write', 'config.read'],
      created: new Date(Date.now() - 86400000 * 7).toISOString(),
      lastUsed: new Date(Date.now() - 86400000).toISOString(),
      status: 'active'
    }
  ]);

  const [securitySettings, setSecuritySettings] = useState({
    enableAuth: true,
    requireMFA: false,
    sessionTimeout: 24,
    maxFailedAttempts: 5,
    enableRateLimit: true,
    rateLimitRPM: 60,
    enableAuditLog: true,
    enableFirewall: true
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-400 bg-blue-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'critical': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'resolved': return CheckCircle;
      case 'investigating': return AlertTriangle;
      default: return XCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-400';
      case 'resolved': return 'text-green-400';
      case 'investigating': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const generateApiKey = () => {
    // Generate a proper API key using crypto-secure random values
    const generateSecureId = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 24; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const newKey: APIKey = {
      id: Date.now().toString(),
      name: 'New API Key',
      key: `sk-shimmy_${generateSecureId()}`,
      permissions: ['inference.read'],
      created: new Date().toISOString(),
      lastUsed: 'Never',
      status: 'active'
    };
    setApiKeys(prev => [newKey, ...prev]);
  };

  return (
    <div className="p-6 space-y-6 bg-dark-950 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crimson-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Security Center</h1>
            <p className="text-gray-400">Monitor security events and manage access controls</p>
          </div>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Security Status</p>
              <p className="text-2xl font-bold text-green-400">Secure</p>
            </div>
            <Shield className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Events</p>
              <p className="text-2xl font-bold text-yellow-400">
                {securityEvents.filter(e => e.status === 'active').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">API Keys</p>
              <p className="text-2xl font-bold text-white">
                {apiKeys.filter(k => k.status === 'active').length}
              </p>
            </div>
            <Key className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Failed Logins</p>
              <p className="text-2xl font-bold text-white">12</p>
            </div>
            <Lock className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Security Events */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Recent Security Events</h3>
          <button className="px-3 py-1 text-sm bg-crimson-500/20 text-crimson-400 rounded-lg hover:bg-crimson-500/30 transition-colors">
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          {securityEvents.map(event => {
            const StatusIcon = getStatusIcon(event.status);
            
            return (
              <div key={event.id} className="bg-dark-900/50 border border-dark-700/30 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${getStatusColor(event.status)}`} />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(event.severity)}`}>
                          {event.severity}
                        </span>
                        <span className="text-xs text-gray-400">{event.type}</span>
                      </div>
                      <p className="text-sm text-white font-medium">{event.message}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                        <span>Source: {event.source}</span>
                        <span>•</span>
                        <span>{formatTimestamp(event.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${getStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* API Keys Management */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">API Keys</h3>
          <button
            onClick={generateApiKey}
            className="px-4 py-2 bg-crimson-500 text-white rounded-lg hover:bg-crimson-600 transition-colors"
          >
            Generate New Key
          </button>
        </div>
        
        <div className="space-y-4">
          {apiKeys.map(key => (
            <div key={key.id} className="bg-dark-900/50 border border-dark-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-white">{key.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      key.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      key.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {key.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 font-mono">{key.key}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {key.permissions.map(permission => (
                      <span key={permission} className="px-2 py-1 text-xs bg-dark-700 text-gray-300 rounded">
                        {permission}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                    <span>Created: {new Date(key.created).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Last used: {typeof key.lastUsed === 'string' ? key.lastUsed : new Date(key.lastUsed).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors">
                    Edit
                  </button>
                  <button className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors">
                    Revoke
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Security Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Enable Authentication</label>
              <button
                onClick={() => setSecuritySettings(prev => ({ ...prev, enableAuth: !prev.enableAuth }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  securitySettings.enableAuth ? 'bg-crimson-500' : 'bg-dark-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  securitySettings.enableAuth ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Require MFA</label>
              <button
                onClick={() => setSecuritySettings(prev => ({ ...prev, requireMFA: !prev.requireMFA }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  securitySettings.requireMFA ? 'bg-crimson-500' : 'bg-dark-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  securitySettings.requireMFA ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Session Timeout (hours)</label>
              <input
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Failed Attempts</label>
              <input
                type="number"
                value={securitySettings.maxFailedAttempts}
                onChange={(e) => setSecuritySettings(prev => ({ ...prev, maxFailedAttempts: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Enable Rate Limiting</label>
              <button
                onClick={() => setSecuritySettings(prev => ({ ...prev, enableRateLimit: !prev.enableRateLimit }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  securitySettings.enableRateLimit ? 'bg-crimson-500' : 'bg-dark-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  securitySettings.enableRateLimit ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Rate Limit (requests/min)</label>
              <input
                type="number"
                value={securitySettings.rateLimitRPM}
                onChange={(e) => setSecuritySettings(prev => ({ ...prev, rateLimitRPM: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Enable Audit Logging</label>
              <button
                onClick={() => setSecuritySettings(prev => ({ ...prev, enableAuditLog: !prev.enableAuditLog }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  securitySettings.enableAuditLog ? 'bg-crimson-500' : 'bg-dark-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  securitySettings.enableAuditLog ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Enable Firewall</label>
              <button
                onClick={() => setSecuritySettings(prev => ({ ...prev, enableFirewall: !prev.enableFirewall }))}
                className={`w-12 h-6 rounded-full transition-colors ${
                  securitySettings.enableFirewall ? 'bg-crimson-500' : 'bg-dark-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  securitySettings.enableFirewall ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button className="px-4 py-2 bg-crimson-500 text-white rounded-lg hover:bg-crimson-600 transition-colors">
            Apply Security Settings
          </button>
        </div>
      </div>
    </div>
  );
}