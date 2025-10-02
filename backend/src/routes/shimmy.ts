import express from 'express';
import { ShimmyService } from '../services/shimmy';
import { logger } from '../utils/logger';
import { authenticateToken, optionalAuth } from './auth';

const router = express.Router();
const shimmyService = new ShimmyService();

// Get Shimmy status and overview
router.get('/status', optionalAuth, async (req, res) => {
  try {
    logger.info('shimmy', 'Shimmy status requested');
    const status = await shimmyService.getStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('shimmy', 'Failed to get Shimmy status', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get Shimmy status',
      details: error?.toString()
    });
  }
});

// Get Shimmy version
router.get('/version', optionalAuth, async (req, res) => {
  try {
    logger.info('shimmy', 'Version requested');
    const version = await shimmyService.getVersion();
    
    res.json({
      success: true,
      data: { version }
    });

  } catch (error) {
    logger.error('shimmy', 'Failed to get version', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get version',
      details: error?.toString()
    });
  }
});

// Get Shimmy configuration
router.get('/config', optionalAuth, async (req, res) => {
  try {
    logger.info('shimmy', 'Configuration requested');
    const config = await shimmyService.getConfig();
    
    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    logger.error('shimmy', 'Failed to get configuration', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get configuration',
      details: error?.toString()
    });
  }
});

// Get performance metrics
router.get('/performance', optionalAuth, async (req, res) => {
  try {
    logger.info('shimmy', 'Performance metrics requested');
    const performance = await shimmyService.getPerformanceMetrics();
    
    res.json({
      success: true,
      data: performance
    });

  } catch (error) {
    logger.error('shimmy', 'Failed to get performance metrics', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get performance metrics',
      details: error?.toString()
    });
  }
});

// Get Shimmy logs
router.get('/logs', optionalAuth, async (req, res) => {
  try {
    const lines = parseInt(req.query.lines as string) || 100;
    logger.info('shimmy', 'Logs requested', { lines });
    
    const logs = await shimmyService.getLogs(lines);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });

  } catch (error) {
    logger.error('shimmy', 'Failed to get logs', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get logs',
      details: error?.toString()
    });
  }
});

// Service control operations (require authentication)
router.post('/start', authenticateToken, async (req, res) => {
  try {
    logger.info('shimmy', 'Start requested');
    const success = await shimmyService.start();
    
    if (success) {
      res.json({
        success: true,
        message: 'Shimmy started successfully'
      });
    } else {
      res.status(400).json({
        error: 'Failed to start Shimmy'
      });
    }

  } catch (error) {
    logger.error('shimmy', 'Failed to start Shimmy', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to start Shimmy',
      details: error?.toString()
    });
  }
});

router.post('/stop', authenticateToken, async (req, res) => {
  try {
    logger.info('shimmy', 'Stop requested');
    const success = await shimmyService.stop();
    
    if (success) {
      res.json({
        success: true,
        message: 'Shimmy stopped successfully'
      });
    } else {
      res.status(400).json({
        error: 'Failed to stop Shimmy'
      });
    }

  } catch (error) {
    logger.error('shimmy', 'Failed to stop Shimmy', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to stop Shimmy',
      details: error?.toString()
    });
  }
});

router.post('/restart', authenticateToken, async (req, res) => {
  try {
    logger.info('shimmy', 'Restart requested');
    const success = await shimmyService.restart();
    
    if (success) {
      res.json({
        success: true,
        message: 'Shimmy restarted successfully'
      });
    } else {
      res.status(400).json({
        error: 'Failed to restart Shimmy'
      });
    }

  } catch (error) {
    logger.error('shimmy', 'Failed to restart Shimmy', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to restart Shimmy',
      details: error?.toString()
    });
  }
});

// Execute Shimmy commands
router.post('/execute', authenticateToken, async (req, res) => {
  try {
    const { command, args = [] } = req.body;
    
    if (!command) {
      return res.status(400).json({
        error: 'Command is required'
      });
    }

    logger.info('shimmy', `Executing command: ${command}`, { args });
    const output = await shimmyService.executeCommand(command, args);
    
    res.json({
      success: true,
      data: {
        command,
        args,
        output
      }
    });

  } catch (error) {
    logger.error('shimmy', 'Failed to execute command', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to execute command',
      details: error?.toString()
    });
  }
});

// Model management
router.get('/models', optionalAuth, async (req, res) => {
  try {
    logger.info('shimmy', 'Models list requested');
    const models = await shimmyService.getModels();
    
    res.json({
      success: true,
      data: models,
      count: models.length
    });

  } catch (error) {
    logger.error('shimmy', 'Failed to get models', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get models',
      details: error?.toString()
    });
  }
});

router.post('/models/:name/load', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    
    logger.info('shimmy', `Loading model: ${name}`);
    const success = await shimmyService.loadModel(name);
    
    if (success) {
      res.json({
        success: true,
        message: `Model ${name} loaded successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to load model ${name}`
      });
    }

  } catch (error) {
    logger.error('shimmy', 'Failed to load model', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to load model',
      details: error?.toString()
    });
  }
});

router.post('/models/:name/unload', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    
    logger.info('shimmy', `Unloading model: ${name}`);
    const success = await shimmyService.unloadModel(name);
    
    if (success) {
      res.json({
        success: true,
        message: `Model ${name} unloaded successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to unload model ${name}`
      });
    }

  } catch (error) {
    logger.error('shimmy', 'Failed to unload model', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to unload model',
      details: error?.toString()
    });
  }
});

// Process information
router.get('/process', optionalAuth, async (req, res) => {
  try {
    logger.info('shimmy', 'Process info requested');
    const processInfo = await shimmyService.getProcessInfo();
    
    res.json({
      success: true,
      data: processInfo
    });

  } catch (error) {
    logger.error('shimmy', 'Failed to get process info', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get process info',
      details: error?.toString()
    });
  }
});

// Health check specifically for Shimmy
router.get('/health', optionalAuth, async (req, res) => {
  try {
    const available = await shimmyService.checkAvailability();
    
    if (available) {
      const processInfo = await shimmyService.getProcessInfo();
      
      res.json({
        available: true,
        running: processInfo.running,
        pid: processInfo.pid,
        uptime: processInfo.uptime,
        connections: processInfo.connections,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        available: false,
        running: false,
        error: 'Shimmy binary not available',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error('shimmy', 'Failed to get health status', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get health status',
      details: error?.toString()
    });
  }
});

// System integration endpoint
router.get('/system-status', optionalAuth, async (req, res) => {
  try {
    logger.info('shimmy', 'System status requested');
    
    const [status, processInfo, config, performance] = await Promise.allSettled([
      shimmyService.getStatus(),
      shimmyService.getProcessInfo(),
      shimmyService.getConfig(),
      shimmyService.getPerformanceMetrics()
    ]);

    const systemStatus = {
      status: status.status === 'fulfilled' ? status.value : { error: status.reason?.toString() },
      process: processInfo.status === 'fulfilled' ? processInfo.value : { error: processInfo.reason?.toString() },
      config: config.status === 'fulfilled' ? config.value : { error: config.reason?.toString() },
      performance: performance.status === 'fulfilled' ? performance.value : { error: performance.reason?.toString() },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: systemStatus
    });

  } catch (error) {
    logger.error('shimmy', 'Failed to get system status', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get system status',
      details: error?.toString()
    });
  }
});

export { router as shimmyRoutes };