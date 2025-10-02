import express from 'express';
import { Database } from '../services/database';
import { logger } from '../utils/logger';
import { authenticateToken, optionalAuth } from './auth';

const router = express.Router();
const database = Database.getInstance();

import { ConfigSchema, ConfigRule } from '../types';

// Configuration validation schemas
const configSchemas: Record<string, ConfigSchema> = {
  'server': {
    // Nested structure for server config
    general: { type: 'object', required: false },
    inference: { type: 'object', required: false },
    networking: { type: 'object', required: false },
    security: { type: 'object', required: false }
  },
  'shimmy-server': {
    port: { type: 'number', min: 1024, max: 65535 },
    host: { type: 'string', required: false },
    workers: { type: 'number', min: 1, max: 32 },
    maxConnections: { type: 'number', min: 1, max: 10000 },
    timeout: { type: 'number', min: 1, max: 300 },
    enableLogging: { type: 'boolean', required: false },
    logLevel: { type: 'string', enum: ['debug', 'info', 'warn', 'error'], required: false }
  },
  'shimmy-mptcp': {
    enabled: { type: 'boolean' },
    maxSubflows: { type: 'number', min: 1, max: 8 },
    congestionControl: { type: 'string', enum: ['reno', 'cubic', 'bbr'], required: false },
    pathManager: { type: 'string', required: false }
  },
  'shimmy-security': {
    enableSSL: { type: 'boolean', required: false },
    requireAuth: { type: 'boolean', required: false },
    apiKeyLength: { type: 'number', min: 16, max: 64, required: false },
    sessionTimeout: { type: 'number', min: 300, max: 86400, required: false }
  }
};

// Validate configuration data
function validateConfig(configType: string, data: any): { isValid: boolean; errors: string[] } {
  const schema = configSchemas[configType];
  if (!schema) {
    return { isValid: false, errors: [`Unknown configuration type: ${configType}`] };
  }

  const errors: string[] = [];

  for (const [key, rules] of Object.entries(schema)) {
    const typedRules = rules as ConfigRule;
    const value = data[key];

    // Check if required field is missing
    if (typedRules.required !== false && (value === undefined || value === null)) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip validation if value is undefined and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (typedRules.type === 'number' && typeof value !== 'number') {
      errors.push(`${key} must be a number`);
      continue;
    }

    if (typedRules.type === 'string' && typeof value !== 'string') {
      errors.push(`${key} must be a string`);
      continue;
    }

    if (typedRules.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean`);
      continue;
    }

    if (typedRules.type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      errors.push(`${key} must be an object`);
      continue;
    }

    // Range validation for numbers
    if (typedRules.type === 'number' && typeof value === 'number') {
      if (typedRules.min !== undefined && value < typedRules.min) {
        errors.push(`${key} must be at least ${typedRules.min}`);
      }
      if (typedRules.max !== undefined && value > typedRules.max) {
        errors.push(`${key} must be at most ${typedRules.max}`);
      }
    }

    // Enum validation for strings
    if (typedRules.type === 'string' && typedRules.enum && !typedRules.enum.includes(value)) {
      errors.push(`${key} must be one of: ${typedRules.enum.join(', ')}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Get all configurations
router.get('/', optionalAuth, async (req, res) => {
  try {
    logger.info('config', 'All configurations requested');
    
    const configTypes = Object.keys(configSchemas);
    const configs: Record<string, any> = {};
    
    for (const configType of configTypes) {
      try {
        const config = await database.getConfig(configType);
        configs[configType] = config || {};
      } catch (error) {
        logger.warn('config', `Failed to get config ${configType}`, { error: error?.toString() });
        configs[configType] = {};
      }
    }

    res.json({
      success: true,
      data: configs,
      availableTypes: configTypes
    });

  } catch (error) {
    logger.error('config', 'Failed to get configurations', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get configurations',
      details: error?.toString()
    });
  }
});

// Get specific configuration
router.get('/:type', optionalAuth, async (req, res) => {
  try {
    const { type } = req.params;
    
    logger.info('config', `Configuration requested: ${type}`);
    
    const config = await database.getConfig(type);
    
    res.json({
      success: true,
      data: {
        type,
        config: config || {},
        schema: configSchemas[type as keyof typeof configSchemas] || null
      }
    });

  } catch (error) {
    logger.error('config', 'Failed to get configuration', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get configuration',
      details: error?.toString()
    });
  }
});

// Set/update configuration
router.put('/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { config } = req.body;
    
    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        error: 'Configuration object is required'
      });
    }

    logger.info('config', `Configuration update requested: ${type}`);
    
    // Validate configuration
    const validation = validateConfig(type, config);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Configuration validation failed',
        details: validation.errors
      });
    }

    // Save to database
    await database.setConfig(type, config);
    
    logger.info('config', `Configuration updated: ${type}`, { config });

    res.json({
      success: true,
      message: `Configuration ${type} updated successfully`,
      data: {
        type,
        config
      }
    });

  } catch (error) {
    logger.error('config', 'Failed to update configuration', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to update configuration',
      details: error?.toString()
    });
  }
});

// Patch configuration (partial update)
router.patch('/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: 'Updates object is required'
      });
    }

    logger.info('config', `Configuration patch requested: ${type}`, { updates });
    
    // Get current configuration
    const currentConfig = await database.getConfig(type) || {};
    
    // Merge with updates
    const mergedConfig = { ...currentConfig, ...updates };
    
    // Validate merged configuration
    const validation = validateConfig(type, mergedConfig);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Configuration validation failed',
        details: validation.errors
      });
    }

    // Save to database
    await database.setConfig(type, mergedConfig);
    
    logger.info('config', `Configuration patched: ${type}`, { mergedConfig });

    res.json({
      success: true,
      message: `Configuration ${type} updated successfully`,
      data: {
        type,
        config: mergedConfig,
        updates
      }
    });

  } catch (error) {
    logger.error('config', 'Failed to patch configuration', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to patch configuration',
      details: error?.toString()
    });
  }
});

// Delete configuration
router.delete('/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    
    logger.info('config', `Configuration deletion requested: ${type}`);
    
    // Set to empty object (effectively deleting)
    await database.setConfig(type, {});
    
    logger.info('config', `Configuration deleted: ${type}`);

    res.json({
      success: true,
      message: `Configuration ${type} deleted successfully`
    });

  } catch (error) {
    logger.error('config', 'Failed to delete configuration', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to delete configuration',
      details: error?.toString()
    });
  }
});

// Validate configuration without saving
router.post('/:type/validate', optionalAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const { config } = req.body;
    
    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        error: 'Configuration object is required'
      });
    }

    logger.info('config', `Configuration validation requested: ${type}`);
    
    const validation = validateConfig(type, config);
    
    res.json({
      success: true,
      data: {
        type,
        isValid: validation.isValid,
        errors: validation.errors,
        config
      }
    });

  } catch (error) {
    logger.error('config', 'Failed to validate configuration', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to validate configuration',
      details: error?.toString()
    });
  }
});

// Get configuration schema
router.get('/:type/schema', optionalAuth, async (req, res) => {
  try {
    const { type } = req.params;
    
    const schema = configSchemas[type as keyof typeof configSchemas];
    
    if (!schema) {
      return res.status(404).json({
        error: `Schema not found for configuration type: ${type}`
      });
    }

    res.json({
      success: true,
      data: {
        type,
        schema,
        availableTypes: Object.keys(configSchemas)
      }
    });

  } catch (error) {
    logger.error('config', 'Failed to get configuration schema', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get configuration schema',
      details: error?.toString()
    });
  }
});

// Reset configuration to defaults
router.post('/:type/reset', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    
    logger.info('config', `Configuration reset requested: ${type}`);
    
    // Define default configurations
    const defaults: Record<string, any> = {
      'server': {
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
      },
      'shimmy-server': {
        port: 8080,
        host: '0.0.0.0',
        workers: 4,
        maxConnections: 1000,
        timeout: 30,
        enableLogging: true,
        logLevel: 'info'
      },
      'shimmy-mptcp': {
        enabled: false,
        maxSubflows: 2,
        congestionControl: 'cubic',
        pathManager: 'fullmesh'
      },
      'shimmy-security': {
        enableSSL: false,
        requireAuth: true,
        apiKeyLength: 32,
        sessionTimeout: 3600
      }
    };

    const defaultConfig = defaults[type];
    if (!defaultConfig) {
      return res.status(404).json({
        error: `No default configuration available for type: ${type}`
      });
    }

    // Save default configuration
    await database.setConfig(type, defaultConfig);
    
    logger.info('config', `Configuration reset to defaults: ${type}`, { defaultConfig });

    res.json({
      success: true,
      message: `Configuration ${type} reset to defaults`,
      data: {
        type,
        config: defaultConfig
      }
    });

  } catch (error) {
    logger.error('config', 'Failed to reset configuration', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to reset configuration',
      details: error?.toString()
    });
  }
});

// Export configuration
router.get('/:type/export', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const format = req.query.format as string || 'json';
    
    logger.info('config', `Configuration export requested: ${type}`, { format });
    
    const config = await database.getConfig(type);
    
    if (!config) {
      return res.status(404).json({
        error: `Configuration not found: ${type}`
      });
    }

    const exportData = {
      type,
      config,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    if (format === 'yaml') {
      // Simple YAML export (basic implementation)
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-config.yaml"`);
      
      let yamlContent = `# Configuration export for ${type}\n`;
      yamlContent += `# Exported at: ${exportData.exportedAt}\n\n`;
      
      for (const [key, value] of Object.entries(config)) {
        yamlContent += `${key}: ${JSON.stringify(value)}\n`;
      }
      
      res.send(yamlContent);
    } else {
      // Default to JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-config.json"`);
      res.json(exportData);
    }

  } catch (error) {
    logger.error('config', 'Failed to export configuration', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to export configuration',
      details: error?.toString()
    });
  }
});

export { router as configRoutes };