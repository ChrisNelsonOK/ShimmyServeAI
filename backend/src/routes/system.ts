import express from 'express';
import { SystemMonitor } from '../services/systemMonitor';
import { logger } from '../utils/logger';
import { authenticateToken, optionalAuth } from './auth';

const router = express.Router();
const systemMonitor = new SystemMonitor();

// Get current system metrics
router.get('/metrics', optionalAuth, async (req, res) => {
  try {
    logger.info('system', 'System metrics requested');
    const metrics = await systemMonitor.getSystemMetrics();
    
    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('system', 'Failed to get system metrics', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get system metrics',
      details: error?.toString()
    });
  }
});

// Get historical metrics
router.get('/metrics/history', optionalAuth, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const metricType = req.query.type as string;

    logger.info('system', 'Historical metrics requested', { hours, metricType });
    const metrics = await systemMonitor.getHistoricalMetrics(hours);
    
    // Filter by metric type if specified
    const filteredMetrics = metricType 
      ? metrics.filter(m => m.metric_type === metricType)
      : metrics;

    res.json({
      success: true,
      data: filteredMetrics,
      meta: {
        hours,
        metricType: metricType || 'all',
        count: filteredMetrics.length
      }
    });

  } catch (error) {
    logger.error('system', 'Failed to get historical metrics', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get historical metrics',
      details: error?.toString()
    });
  }
});

// Get process list
router.get('/processes', optionalAuth, async (req, res) => {
  try {
    logger.info('system', 'Process list requested');
    const processes = await systemMonitor.getProcessList();
    
    res.json({
      success: true,
      data: processes,
      count: processes.length
    });

  } catch (error) {
    logger.error('system', 'Failed to get process list', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get process list',
      details: error?.toString()
    });
  }
});

// Get system status overview
router.get('/status', optionalAuth, async (req, res) => {
  try {
    logger.info('system', 'System status requested');
    const metrics = await systemMonitor.getSystemMetrics();
    
    // Calculate status based on metrics
    const status = {
      overall: 'healthy',
      cpu: {
        status: metrics.cpu.usage < 80 ? 'normal' : 'high',
        usage: metrics.cpu.usage,
        cores: metrics.cpu.cores
      },
      memory: {
        status: metrics.memory.usage_percent < 80 ? 'normal' : 'high',
        usage_percent: metrics.memory.usage_percent,
        used: metrics.memory.used,
        total: metrics.memory.total
      },
      disk: {
        status: metrics.disk.usage_percent < 90 ? 'normal' : 'high',
        usage_percent: metrics.disk.usage_percent,
        used: metrics.disk.used,
        total: metrics.disk.total
      },
      network: {
        status: 'active',
        connections: metrics.network.connections,
        interfaces: metrics.network.interfaces.length
      },
      system: metrics.system,
      timestamp: metrics.timestamp
    };

    // Determine overall status
    if (status.cpu.status === 'high' || status.memory.status === 'high' || status.disk.status === 'high') {
      status.overall = 'warning';
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('system', 'Failed to get system status', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get system status',
      details: error?.toString()
    });
  }
});

// Get system information
router.get('/info', optionalAuth, async (req, res) => {
  try {
    logger.info('system', 'System info requested');
    const metrics = await systemMonitor.getSystemMetrics();
    
    const systemInfo = {
      hostname: metrics.system.hostname,
      platform: metrics.system.platform,
      architecture: metrics.system.arch,
      kernel: metrics.system.kernel,
      uptime: metrics.system.uptime,
      cpu: {
        cores: metrics.cpu.cores,
        loadAverage: metrics.cpu.loadAverage
      },
      memory: {
        total: metrics.memory.total,
        available: metrics.memory.available
      },
      network: {
        interfaces: metrics.network.interfaces.map(iface => ({
          name: iface.name,
          packets_sent: iface.packets_sent,
          packets_recv: iface.packets_recv
        }))
      },
      timestamp: metrics.timestamp
    };

    res.json({
      success: true,
      data: systemInfo
    });

  } catch (error) {
    logger.error('system', 'Failed to get system info', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get system info',
      details: error?.toString()
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    pid: process.pid
  };

  res.json(healthStatus);
});

export { router as systemRoutes };