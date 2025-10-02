import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, AlertTriangle, Download } from 'lucide-react';
import { ServerConfig } from '../../types';
import { configService } from '../../services/realConfigService';

// Extend window object to include shimmy configuration
declare global {
  interface Window {
    shimmyServerConfig?: ServerConfig;
  }
}

// Default configuration
const defaultConfig: ServerConfig = {
  general: {
    serverName: 'ShimmyServe-01',
    port: 8080,
    maxConnections: 1000,
    timeout: 30000,
  },
  inference: {
    modelPath: '/opt/shimmy/models/llama2-7b.gguf',
    batchSize: 32,
    contextLength: 4096,
    temperature: 0.7,
    topP: 0.9,
    threads: 8,
  },
  networking: {
    enableMPTCP: true,
    maxSubflows: 4,
    congestionControl: 'cubic',
    bufferSize: 65536,
  },
  security: {
    enableAuth: true,
    tokenExpiry: 86400,
    rateLimiting: true,
    maxRequestsPerMinute: 60,
  },
};

// Configuration validation function
function validateConfiguration(config: ServerConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate general settings
  if (config.general.port < 1 || config.general.port > 65535) {
    errors.push('Port must be between 1 and 65535');
  }
  if (config.general.maxConnections < 1 || config.general.maxConnections > 10000) {
    errors.push('Max connections must be between 1 and 10000');
  }
  if (config.general.timeout < 1000 || config.general.timeout > 300000) {
    errors.push('Timeout must be between 1000 and 300000 ms');
  }
  
  // Validate inference settings
  if (config.inference.batchSize < 1 || config.inference.batchSize > 128) {
    errors.push('Batch size must be between 1 and 128');
  }
  if (config.inference.contextLength < 512 || config.inference.contextLength > 16384) {
    errors.push('Context length must be between 512 and 16384');
  }
  if (config.inference.temperature < 0 || config.inference.temperature > 2) {
    errors.push('Temperature must be between 0 and 2');
  }
  if (config.inference.topP < 0 || config.inference.topP > 1) {
    errors.push('Top P must be between 0 and 1');
  }
  if (config.inference.threads < 1 || config.inference.threads > 32) {
    errors.push('Threads must be between 1 and 32');
  }
  
  // Validate networking settings
  if (config.networking.maxSubflows < 1 || config.networking.maxSubflows > 8) {
    errors.push('Max subflows must be between 1 and 8');
  }
  if (config.networking.bufferSize < 1024 || config.networking.bufferSize > 1048576) {
    errors.push('Buffer size must be between 1024 and 1048576 bytes');
  }
  
  // Validate security settings
  if (config.security.tokenExpiry < 300 || config.security.tokenExpiry > 604800) {
    errors.push('Token expiry must be between 300 and 604800 seconds');
  }
  if (config.security.maxRequestsPerMinute < 1 || config.security.maxRequestsPerMinute > 1000) {
    errors.push('Max requests per minute must be between 1 and 1000');
  }
  
  return { isValid: errors.length === 0, errors };
}

// Apply configuration to running system
async function applyConfiguration(config: ServerConfig): Promise<void> {
  // In a real implementation, this would make API calls to configure the server
  // For now, we'll simulate the configuration application
  
  console.log('Applying server configuration:', config);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Store the active configuration globally for other components to use
  window.shimmyServerConfig = config;
  
  // Dispatch custom event to notify other components of config change
  window.dispatchEvent(new CustomEvent('shimmy-config-updated', { 
    detail: { config } 
  }));
}

export function Settings() {
  const [config, setConfig] = useState<ServerConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load saved configuration on component mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      // Try to load from backend/localStorage
      const serverConfig = await configService.getConfig('server');
      if (serverConfig && isCompleteConfig(serverConfig)) {
        setConfig(serverConfig);
      } else {
        // If no config exists or it's incomplete, use defaults
        console.warn('Config is missing or incomplete, using defaults');
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.warn('Failed to load saved configuration, using defaults:', error);
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if config has all required properties
  const isCompleteConfig = (config: any): boolean => {
    return config &&
      config.general && config.general.serverName &&
      config.inference && config.inference.modelPath &&
      config.networking && typeof config.networking.enableMPTCP === 'boolean' &&
      config.security && typeof config.security.enableAuth === 'boolean';
  };

  const handleConfigChange = (section: keyof ServerConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    
    try {
      // Validate configuration with backend first
      const validation = await configService.validateConfig('server', config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors?.join(', ') || 'Unknown validation error'}`);
      }
      
      // Save configuration to backend (will also save to localStorage as backup)
      await configService.updateConfig('server', config);
      
      // Apply configuration changes to running system
      await applyConfiguration(config);
      
      setHasChanges(false);
      setSaveSuccess(true);
      console.log('Configuration saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSaveError(errorMessage);
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      // Reset to defaults using backend
      const resetConfig = await configService.resetConfig('server');
      setConfig(resetConfig);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      // Fallback to local defaults
      setConfig(defaultConfig);
      setHasChanges(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await configService.exportConfig('server');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shimmy-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export configuration:', error);
      setSaveError('Failed to export configuration');
    }
  };

  const ConfigSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl p-6">
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );

  const ConfigField = ({ 
    label, 
    value, 
    onChange, 
    type = 'text',
    min,
    max,
    step,
    options
  }: {
    label: string;
    value: any;
    onChange: (value: any) => void;
    type?: 'text' | 'number' | 'boolean' | 'select';
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      {type === 'boolean' ? (
        <button
          onClick={() => onChange(!value)}
          className={`w-12 h-6 rounded-full transition-colors ${
            value ? 'bg-crimson-500' : 'bg-dark-600'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
            value ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
        >
          {options?.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          min={min}
          max={max}
          step={step}
          className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:border-crimson-500"
        />
      )}
    </div>
  );

  // Show loading spinner while config is being loaded
  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-dark-950 min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-crimson-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading configuration...</p>
        </div>
      </div>
    );
  }

  // Additional safety check to ensure config is complete before rendering
  if (!config || !isCompleteConfig(config)) {
    console.error('Config is incomplete, using defaults:', config);
    if (config !== defaultConfig) {
      setConfig(defaultConfig);
    }
    return (
      <div className="p-6 space-y-6 bg-dark-950 min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-crimson-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-dark-950 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crimson-500 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Server Settings</h1>
            <p className="text-gray-400">Configure Shimmy inference server parameters</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 text-gray-300 hover:text-white border border-dark-600 rounded-lg hover:border-dark-500 transition-colors"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Export
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-300 hover:text-white border border-dark-600 rounded-lg hover:border-dark-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`px-4 py-2 rounded-lg transition-colors ${
              hasChanges && !saving
                ? 'bg-crimson-500 text-white hover:bg-crimson-600' 
                : 'bg-dark-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 inline mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-200">
            You have unsaved changes. Remember to save your configuration before leaving this page.
          </p>
        </div>
      )}

      {saveError && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-200">
            Failed to save configuration: {saveError}
          </p>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center space-x-3">
          <Save className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-200">
            Configuration saved successfully and applied to the system.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <ConfigSection title="General Settings">
          <ConfigField
            label="Server Name"
            value={config.general.serverName}
            onChange={(value) => handleConfigChange('general', 'serverName', value)}
          />
          <ConfigField
            label="Port"
            value={config.general.port}
            onChange={(value) => handleConfigChange('general', 'port', value)}
            type="number"
            min={1}
            max={65535}
          />
          <ConfigField
            label="Max Connections"
            value={config.general.maxConnections}
            onChange={(value) => handleConfigChange('general', 'maxConnections', value)}
            type="number"
            min={1}
            max={10000}
          />
          <ConfigField
            label="Timeout (ms)"
            value={config.general.timeout}
            onChange={(value) => handleConfigChange('general', 'timeout', value)}
            type="number"
            min={1000}
            max={300000}
          />
        </ConfigSection>

        <ConfigSection title="Inference Settings">
          <ConfigField
            label="Model Path"
            value={config.inference.modelPath}
            onChange={(value) => handleConfigChange('inference', 'modelPath', value)}
          />
          <ConfigField
            label="Batch Size"
            value={config.inference.batchSize}
            onChange={(value) => handleConfigChange('inference', 'batchSize', value)}
            type="number"
            min={1}
            max={128}
          />
          <ConfigField
            label="Context Length"
            value={config.inference.contextLength}
            onChange={(value) => handleConfigChange('inference', 'contextLength', value)}
            type="number"
            min={512}
            max={16384}
          />
          <ConfigField
            label="Temperature"
            value={config.inference.temperature}
            onChange={(value) => handleConfigChange('inference', 'temperature', value)}
            type="number"
            min={0}
            max={2}
            step={0.1}
          />
          <ConfigField
            label="Top P"
            value={config.inference.topP}
            onChange={(value) => handleConfigChange('inference', 'topP', value)}
            type="number"
            min={0}
            max={1}
            step={0.1}
          />
          <ConfigField
            label="Threads"
            value={config.inference.threads}
            onChange={(value) => handleConfigChange('inference', 'threads', value)}
            type="number"
            min={1}
            max={32}
          />
        </ConfigSection>

        <ConfigSection title="Network Settings">
          <ConfigField
            label="Enable MPTCP"
            value={config.networking.enableMPTCP}
            onChange={(value) => handleConfigChange('networking', 'enableMPTCP', value)}
            type="boolean"
          />
          <ConfigField
            label="Max Subflows"
            value={config.networking.maxSubflows}
            onChange={(value) => handleConfigChange('networking', 'maxSubflows', value)}
            type="number"
            min={1}
            max={8}
          />
          <ConfigField
            label="Congestion Control"
            value={config.networking.congestionControl}
            onChange={(value) => handleConfigChange('networking', 'congestionControl', value)}
            type="select"
            options={['cubic', 'bbr', 'reno', 'vegas']}
          />
          <ConfigField
            label="Buffer Size"
            value={config.networking.bufferSize}
            onChange={(value) => handleConfigChange('networking', 'bufferSize', value)}
            type="number"
            min={1024}
            max={1048576}
          />
        </ConfigSection>

        <ConfigSection title="Security Settings">
          <ConfigField
            label="Enable Authentication"
            value={config.security.enableAuth}
            onChange={(value) => handleConfigChange('security', 'enableAuth', value)}
            type="boolean"
          />
          <ConfigField
            label="Token Expiry (seconds)"
            value={config.security.tokenExpiry}
            onChange={(value) => handleConfigChange('security', 'tokenExpiry', value)}
            type="number"
            min={300}
            max={604800}
          />
          <ConfigField
            label="Enable Rate Limiting"
            value={config.security.rateLimiting}
            onChange={(value) => handleConfigChange('security', 'rateLimiting', value)}
            type="boolean"
          />
          <ConfigField
            label="Max Requests/Minute"
            value={config.security.maxRequestsPerMinute}
            onChange={(value) => handleConfigChange('security', 'maxRequestsPerMinute', value)}
            type="number"
            min={1}
            max={1000}
          />
        </ConfigSection>
      </div>
    </div>
  );
}