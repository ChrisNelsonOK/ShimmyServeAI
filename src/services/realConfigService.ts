import { ServerConfig } from '../types';
import { api } from '../utils/api';

/**
 * Configuration Service
 * Manages server configuration through backend API with localStorage fallback
 */
class ConfigurationService {
  private readonly baseUrl = 'http://localhost:3001/api/config';
  private cache: Map<string, ServerConfig> = new Map();
  
  /**
   * Get all configurations from the backend
   * Falls back to localStorage if backend is unavailable
   */
  async getAllConfigs(): Promise<Record<string, ServerConfig>> {
    try {
      const response = await api.get('/config', { authenticated: false });
      const configs = response.data || response;
      
      // Update cache
      Object.entries(configs).forEach(([type, config]) => {
        this.cache.set(type, config as ServerConfig);
      });

      return configs;
    } catch (error) {
      console.warn('Failed to fetch from backend, falling back to localStorage:', error);
      return this.getLocalStorageConfigs();
    }
  }

  /**
   * Get specific configuration by type
   * @param type - Configuration type (e.g., 'server', 'inference', etc.)
   */
  async getConfig(type: string): Promise<ServerConfig | null> {
    try {
      const response = await api.get(`/config/${type}`, { authenticated: false });
      const config = response.data?.config || response.config || response;
      
      // Update cache
      this.cache.set(type, config);
      
      // Also save to localStorage as backup
      this.saveToLocalStorage(type, config);

      return config;
    } catch (error) {
      console.warn('Failed to fetch from backend, falling back to localStorage:', error);
      return this.getFromLocalStorage(type);
    }
  }

  /**
   * Update configuration
   * @param type - Configuration type
   * @param config - Full configuration object
   */
  async updateConfig(type: string, config: ServerConfig): Promise<ServerConfig> {
    try {
      const response = await api.put(`/config/${type}`, { config });
      const updatedConfig = response.data?.config || response.config || config;
      
      // Update cache
      this.cache.set(type, updatedConfig);
      
      // Save to localStorage as backup
      this.saveToLocalStorage(type, updatedConfig);
      
      // Dispatch event to notify other components
      this.dispatchConfigUpdate(type, updatedConfig);

      return updatedConfig;
    } catch (error) {
      console.error('Failed to update configuration on backend:', error);
      
      // Still save to localStorage even if backend fails
      this.saveToLocalStorage(type, config);
      this.cache.set(type, config);
      this.dispatchConfigUpdate(type, config);
      
      throw error;
    }
  }

  /**
   * Partial update of configuration
   * @param type - Configuration type
   * @param patch - Partial configuration to merge
   */
  async patchConfig(type: string, patch: Partial<ServerConfig>): Promise<ServerConfig> {
    try {
      const response = await api.patch(`/config/${type}`, patch);
      const updatedConfig = response.data?.config || response.config || patch;
      
      // Update cache
      this.cache.set(type, updatedConfig);
      
      // Save to localStorage as backup
      this.saveToLocalStorage(type, updatedConfig);
      
      // Dispatch event to notify other components
      this.dispatchConfigUpdate(type, updatedConfig);

      return updatedConfig;
    } catch (error) {
      console.error('Failed to patch configuration on backend:', error);
      
      // Try to apply patch locally if backend fails
      const currentConfig = await this.getConfig(type);
      if (currentConfig) {
        const mergedConfig = this.deepMerge(currentConfig, patch);
        this.saveToLocalStorage(type, mergedConfig);
        this.cache.set(type, mergedConfig);
        this.dispatchConfigUpdate(type, mergedConfig);
        return mergedConfig;
      }
      
      throw error;
    }
  }

  /**
   * Delete configuration
   * @param type - Configuration type
   */
  async deleteConfig(type: string): Promise<void> {
    try {
      await api.delete(`/config/${type}`);

      // Remove from cache and localStorage
      this.cache.delete(type);
      this.removeFromLocalStorage(type);
      
      // Notify components
      this.dispatchConfigDelete(type);
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      
      // Still remove locally if backend fails
      this.cache.delete(type);
      this.removeFromLocalStorage(type);
      this.dispatchConfigDelete(type);
      
      throw error;
    }
  }

  /**
   * Validate configuration before saving
   * @param type - Configuration type
   * @param config - Configuration to validate
   */
  async validateConfig(type: string, config: ServerConfig): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const response = await api.post(`/config/${type}/validate`, { config }, { authenticated: false });
      return { 
        valid: response.data?.isValid ?? response.isValid ?? true, 
        errors: response.data?.errors ?? response.errors 
      };
    } catch (error) {
      console.warn('Failed to validate on backend, using client-side validation:', error);
      
      // Fall back to client-side validation
      return this.validateClientSide(config);
    }
  }

  /**
   * Get configuration schema
   * @param type - Configuration type
   */
  async getConfigSchema(type: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${type}/schema`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch configuration schema:', error);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   * @param type - Configuration type
   */
  async resetConfig(type: string): Promise<ServerConfig> {
    try {
      const response = await api.post(`/config/${type}/reset`);
      const defaultConfig = response.data?.config || response.config || response;
      
      // Update cache and localStorage
      this.cache.set(type, defaultConfig);
      this.saveToLocalStorage(type, defaultConfig);
      
      // Notify components
      this.dispatchConfigUpdate(type, defaultConfig);

      return defaultConfig;
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      throw error;
    }
  }

  /**
   * Export configuration
   * @param type - Configuration type
   */
  async exportConfig(type: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/${type}/export`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to export configuration: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to export configuration:', error);
      
      // Fall back to exporting from local data
      const config = await this.getConfig(type);
      if (config) {
        const json = JSON.stringify(config, null, 2);
        return new Blob([json], { type: 'application/json' });
      }
      
      throw error;
    }
  }

  // Helper methods for localStorage fallback

  private getLocalStorageKey(type: string): string {
    return `shimmy-config-${type}`;
  }

  private saveToLocalStorage(type: string, config: ServerConfig): void {
    try {
      localStorage.setItem(this.getLocalStorageKey(type), JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private getFromLocalStorage(type: string): ServerConfig | null {
    try {
      const stored = localStorage.getItem(this.getLocalStorageKey(type));
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the structure of the parsed config
        if (this.isValidServerConfig(parsed)) {
          return parsed;
        } else {
          console.warn('Invalid config structure in localStorage, removing:', type);
          this.removeFromLocalStorage(type);
        }
      }
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
    }
    return null;
  }

  private removeFromLocalStorage(type: string): void {
    try {
      localStorage.removeItem(this.getLocalStorageKey(type));
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  }

  private getLocalStorageConfigs(): Record<string, ServerConfig> {
    const configs: Record<string, ServerConfig> = {};
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('shimmy-config-')) {
          const type = key.replace('shimmy-config-', '');
          const config = this.getFromLocalStorage(type);
          if (config) {
            configs[type] = config;
          }
        }
      }
    } catch (error) {
      console.error('Failed to read configs from localStorage:', error);
    }
    
    return configs;
  }

  // Event dispatching

  private dispatchConfigUpdate(type: string, config: ServerConfig): void {
    window.dispatchEvent(new CustomEvent('shimmy-config-updated', {
      detail: { type, config }
    }));
  }

  private dispatchConfigDelete(type: string): void {
    window.dispatchEvent(new CustomEvent('shimmy-config-deleted', {
      detail: { type }
    }));
  }

  // Utility methods

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] instanceof Object && key in target) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    });
    
    return result;
  }

  // Validate that a config object has the required structure
  private isValidServerConfig(config: any): config is ServerConfig {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Check that all required sections exist
    const requiredSections = ['general', 'inference', 'networking', 'security'];
    for (const section of requiredSections) {
      if (!config[section] || typeof config[section] !== 'object') {
        return false;
      }
    }

    // Check general section
    if (!config.general.serverName || typeof config.general.serverName !== 'string' ||
        typeof config.general.port !== 'number' ||
        typeof config.general.maxConnections !== 'number' ||
        typeof config.general.timeout !== 'number') {
      return false;
    }

    // Check inference section
    if (!config.inference.modelPath || typeof config.inference.modelPath !== 'string' ||
        typeof config.inference.batchSize !== 'number' ||
        typeof config.inference.contextLength !== 'number' ||
        typeof config.inference.temperature !== 'number' ||
        typeof config.inference.topP !== 'number' ||
        typeof config.inference.threads !== 'number') {
      return false;
    }

    // Check networking section
    if (typeof config.networking.enableMPTCP !== 'boolean' ||
        typeof config.networking.maxSubflows !== 'number' ||
        !config.networking.congestionControl || typeof config.networking.congestionControl !== 'string' ||
        typeof config.networking.bufferSize !== 'number') {
      return false;
    }

    // Check security section
    if (typeof config.security.enableAuth !== 'boolean' ||
        typeof config.security.tokenExpiry !== 'number' ||
        typeof config.security.rateLimiting !== 'boolean' ||
        typeof config.security.maxRequestsPerMinute !== 'number') {
      return false;
    }

    return true;
  }

  // Client-side validation
  private validateClientSide(config: ServerConfig): { valid: boolean; errors?: string[] } {
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
    
    return { 
      valid: errors.length === 0, 
      errors: errors.length > 0 ? errors : undefined 
    };
  }

  // Singleton pattern
  private static instance: ConfigurationService;
  
  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }
}

// Export singleton instance
export const configService = ConfigurationService.getInstance();

// Export types for convenience
export type { ServerConfig };