import { useState, useEffect, useCallback } from 'react';
import { ServerConfig } from '../types';
import { configService } from '../services/realConfigService';

/**
 * Hook for managing server configuration
 * Provides reactive configuration state with backend synchronization
 */
export function useConfiguration(configType: string = 'server') {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load configuration
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const loadedConfig = await configService.getConfig(configType);
      setConfig(loadedConfig);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(message);
      console.error('Failed to load configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [configType]);

  // Save configuration
  const saveConfig = useCallback(async (newConfig: ServerConfig) => {
    setSaving(true);
    setError(null);
    
    try {
      // Validate first
      const validation = await configService.validateConfig(configType, newConfig);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors?.join(', ')}`);
      }
      
      // Save to backend
      const savedConfig = await configService.updateConfig(configType, newConfig);
      setConfig(savedConfig);
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save configuration';
      setError(message);
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  }, [configType]);

  // Patch configuration (partial update)
  const patchConfig = useCallback(async (patch: Partial<ServerConfig>) => {
    setSaving(true);
    setError(null);
    
    try {
      const patchedConfig = await configService.patchConfig(configType, patch);
      setConfig(patchedConfig);
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to patch configuration';
      setError(message);
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  }, [configType]);

  // Reset configuration to defaults
  const resetConfig = useCallback(async () => {
    setError(null);
    
    try {
      const defaultConfig = await configService.resetConfig(configType);
      setConfig(defaultConfig);
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset configuration';
      setError(message);
      return { success: false, error: message };
    }
  }, [configType]);

  // Export configuration
  const exportConfig = useCallback(async () => {
    try {
      const blob = await configService.exportConfig(configType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shimmy-config-${configType}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export configuration';
      setError(message);
      return { success: false, error: message };
    }
  }, [configType]);

  // Listen for configuration updates
  useEffect(() => {
    loadConfig();
    
    // Listen for configuration changes from other components
    const handleConfigUpdate = (event: CustomEvent) => {
      if (event.detail.type === configType) {
        setConfig(event.detail.config);
      }
    };
    
    const handleConfigDelete = (event: CustomEvent) => {
      if (event.detail.type === configType) {
        setConfig(null);
      }
    };
    
    window.addEventListener('shimmy-config-updated', handleConfigUpdate as EventListener);
    window.addEventListener('shimmy-config-deleted', handleConfigDelete as EventListener);
    
    return () => {
      window.removeEventListener('shimmy-config-updated', handleConfigUpdate as EventListener);
      window.removeEventListener('shimmy-config-deleted', handleConfigDelete as EventListener);
    };
  }, [configType, loadConfig]);

  return {
    config,
    loading,
    error,
    saving,
    saveConfig,
    patchConfig,
    resetConfig,
    exportConfig,
    reloadConfig: loadConfig,
  };
}