import express from 'express';
import { Database } from '../services/database';
import { logger } from '../utils/logger';
import { authenticateToken, optionalAuth } from './auth';

const router = express.Router();
const database = Database.getInstance();

// Get logs with filtering options
router.get('/', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;
    const category = req.query.category as string;
    
    logger.info('logs', 'Logs requested', { limit, level, category });
    
    let logs = await database.getLogs(limit, level);
    
    // Filter by category if specified
    if (category && category !== 'all') {
      logs = logs.filter(log => log.category === category);
    }

    res.json({
      success: true,
      data: logs,
      count: logs.length,
      filters: {
        limit,
        level: level || 'all',
        category: category || 'all'
      }
    });

  } catch (error) {
    logger.error('logs', 'Failed to get logs', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get logs',
      details: error?.toString()
    });
  }
});

// Get log statistics
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    
    logger.info('logs', 'Log statistics requested', { hours });
    
    // Get logs from the last N hours
    const allLogs = await database.getLogs(10000); // Get a large number to calculate stats
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const recentLogs = allLogs.filter(log => new Date(log.timestamp) > cutoffTime);
    
    // Calculate statistics
    const stats = {
      total: recentLogs.length,
      byLevel: {
        error: recentLogs.filter(log => log.level === 'error').length,
        warn: recentLogs.filter(log => log.level === 'warn').length,
        info: recentLogs.filter(log => log.level === 'info').length,
        debug: recentLogs.filter(log => log.level === 'debug').length
      },
      byCategory: {} as Record<string, number>,
      timeRange: {
        hours,
        from: cutoffTime.toISOString(),
        to: new Date().toISOString()
      }
    };

    // Count by category
    recentLogs.forEach(log => {
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('logs', 'Failed to get log statistics', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get log statistics',
      details: error?.toString()
    });
  }
});

// Get recent errors
router.get('/errors', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    logger.info('logs', 'Recent errors requested', { limit });
    
    const errorLogs = await database.getLogs(limit * 2, 'error'); // Get more than needed in case of filtering
    const recentErrors = errorLogs.slice(0, limit);

    res.json({
      success: true,
      data: recentErrors,
      count: recentErrors.length
    });

  } catch (error) {
    logger.error('logs', 'Failed to get recent errors', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get recent errors',
      details: error?.toString()
    });
  }
});

// Search logs
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;
    
    if (!query) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    logger.info('logs', 'Log search requested', { query, limit, level });
    
    let logs = await database.getLogs(limit * 2, level); // Get more logs to search through
    
    // Simple text search in message
    const searchResults = logs.filter(log => 
      log.message.toLowerCase().includes(query.toLowerCase()) ||
      log.category.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);

    res.json({
      success: true,
      data: searchResults,
      count: searchResults.length,
      query: {
        text: query,
        level: level || 'all',
        limit
      }
    });

  } catch (error) {
    logger.error('logs', 'Failed to search logs', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to search logs',
      details: error?.toString()
    });
  }
});

// Add a new log entry (usually for testing or external integrations)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { level, category, message, metadata } = req.body;
    
    if (!level || !category || !message) {
      return res.status(400).json({
        error: 'Level, category, and message are required'
      });
    }

    if (!['info', 'warn', 'error', 'debug'].includes(level)) {
      return res.status(400).json({
        error: 'Level must be one of: info, warn, error, debug'
      });
    }

    logger.info('logs', 'External log entry added', { level, category });
    
    // Use the logger to add the entry (this will also log it to database)
    switch (level) {
      case 'error':
        logger.error(category, message, metadata);
        break;
      case 'warn':
        logger.warn(category, message, metadata);
        break;
      case 'debug':
        logger.debug(category, message, metadata);
        break;
      default:
        logger.info(category, message, metadata);
    }

    res.json({
      success: true,
      message: 'Log entry added successfully'
    });

  } catch (error) {
    logger.error('logs', 'Failed to add log entry', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to add log entry',
      details: error?.toString()
    });
  }
});

// Get available log categories
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    logger.info('logs', 'Log categories requested');
    
    const logs = await database.getLogs(1000); // Sample a reasonable number of logs
    const categories = [...new Set(logs.map(log => log.category))].sort();

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });

  } catch (error) {
    logger.error('logs', 'Failed to get log categories', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get log categories',
      details: error?.toString()
    });
  }
});

// Get log levels
router.get('/levels', optionalAuth, async (req, res) => {
  try {
    const levels = ['info', 'warn', 'error', 'debug'];
    
    res.json({
      success: true,
      data: levels
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get log levels',
      details: error?.toString()
    });
  }
});

// Export logs (for backup or analysis)
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const format = req.query.format as string || 'json';
    const limit = parseInt(req.query.limit as string) || 1000;
    const level = req.query.level as string;
    
    logger.info('logs', 'Log export requested', { format, limit, level });
    
    const logs = await database.getLogs(limit, level);
    
    if (format === 'csv') {
      // Convert to CSV
      const csvHeader = 'timestamp,level,category,message,metadata\n';
      const csvRows = logs.map(log => {
        const escapedMessage = log.message.replace(/"/g, '""');
        const escapedMetadata = (log.metadata || '').replace(/"/g, '""');
        return `"${log.timestamp}","${log.level}","${log.category}","${escapedMessage}","${escapedMetadata}"`;
      }).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="logs_${Date.now()}.csv"`);
      res.send(csvHeader + csvRows);
    } else {
      // Default to JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="logs_${Date.now()}.json"`);
      res.json({
        exportedAt: new Date().toISOString(),
        totalLogs: logs.length,
        filters: { level: level || 'all', limit },
        logs
      });
    }

  } catch (error) {
    logger.error('logs', 'Failed to export logs', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to export logs',
      details: error?.toString()
    });
  }
});

// Real-time log streaming endpoint (Server-Sent Events)
router.get('/stream', optionalAuth, (req, res) => {
  try {
    const level = req.query.level as string;
    const category = req.query.category as string;
    
    logger.info('logs', 'Log streaming started', { level, category });
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      filters: { level: level || 'all', category: category || 'all' }
    })}\n\n`);

    // Set up periodic log checks (simple polling approach)
    let lastLogId = 0;
    
    const sendLogs = async () => {
      try {
        const recentLogs = await database.getLogs(10); // Get last 10 logs
        
        for (const log of recentLogs) {
          // Simple filtering
          if (level && level !== 'all' && log.level !== level) continue;
          if (category && category !== 'all' && log.category !== category) continue;
          
          // Send log as SSE event
          res.write(`data: ${JSON.stringify({
            type: 'log',
            ...log
          })}\n\n`);
        }
      } catch (error) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: 'Failed to fetch logs',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    };

    // Send logs every 5 seconds
    const interval = setInterval(sendLogs, 5000);
    
    // Send initial logs
    sendLogs();

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
      logger.info('logs', 'Log streaming ended');
    });

  } catch (error) {
    logger.error('logs', 'Failed to start log streaming', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to start log streaming',
      details: error?.toString()
    });
  }
});

export { router as logsRoutes };