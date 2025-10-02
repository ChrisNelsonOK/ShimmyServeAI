import express from 'express';
import { Database } from '../services/database';
import { SystemMonitor } from '../services/systemMonitor';
import { logger } from '../utils/logger';
import { authenticateToken, optionalAuth } from './auth';

const router = express.Router();
const database = Database.getInstance();
const systemMonitor = new SystemMonitor();

// Get current metrics
router.get('/current', optionalAuth, async (req, res) => {
  try {
    logger.info('metrics', 'Current metrics requested');
    const metrics = await systemMonitor.getSystemMetrics();
    
    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('metrics', 'Failed to get current metrics', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get current metrics',
      details: error?.toString()
    });
  }
});

// Get historical metrics
router.get('/history', optionalAuth, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const metricType = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 1000;
    
    logger.info('metrics', 'Historical metrics requested', { hours, metricType, limit });
    
    let metrics = await database.getMetrics(metricType, hours);
    
    // Limit results if requested
    if (metrics.length > limit) {
      metrics = metrics.slice(0, limit);
    }

    // Group by metric type for easier consumption
    const groupedMetrics: Record<string, any[]> = {};
    metrics.forEach(metric => {
      if (!groupedMetrics[metric.metric_type]) {
        groupedMetrics[metric.metric_type] = [];
      }
      groupedMetrics[metric.metric_type].push({
        timestamp: metric.timestamp,
        value: metric.value,
        metadata: metric.metadata ? JSON.parse(metric.metadata) : null
      });
    });

    res.json({
      success: true,
      data: {
        timeRange: {
          hours,
          from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        },
        totalPoints: metrics.length,
        metricTypes: Object.keys(groupedMetrics),
        metrics: groupedMetrics
      }
    });

  } catch (error) {
    logger.error('metrics', 'Failed to get historical metrics', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get historical metrics',
      details: error?.toString()
    });
  }
});

// Get metrics summary/statistics
router.get('/summary', optionalAuth, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    
    logger.info('metrics', 'Metrics summary requested', { hours });
    
    const metrics = await database.getMetrics(undefined, hours);
    
    // Calculate statistics by metric type
    const summary: Record<string, any> = {};
    const metricsByType: Record<string, number[]> = {};
    
    // Group metrics by type
    metrics.forEach(metric => {
      if (!metricsByType[metric.metric_type]) {
        metricsByType[metric.metric_type] = [];
      }
      metricsByType[metric.metric_type].push(metric.value);
    });
    
    // Calculate statistics for each type
    Object.entries(metricsByType).forEach(([type, values]) => {
      if (values.length === 0) return;
      
      const sorted = [...values].sort((a, b) => a - b);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const median = sorted[Math.floor(sorted.length / 2)];
      
      summary[type] = {
        count: values.length,
        average: parseFloat(avg.toFixed(2)),
        min,
        max,
        median,
        latest: values[values.length - 1],
        trend: values.length > 1 ? 
          (values[values.length - 1] > values[0] ? 'increasing' : 
           values[values.length - 1] < values[0] ? 'decreasing' : 'stable') : 'stable'
      };
    });

    res.json({
      success: true,
      data: {
        timeRange: {
          hours,
          from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        },
        totalMetrics: metrics.length,
        metricTypes: Object.keys(summary),
        summary
      }
    });

  } catch (error) {
    logger.error('metrics', 'Failed to get metrics summary', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get metrics summary',
      details: error?.toString()
    });
  }
});

// Get available metric types
router.get('/types', optionalAuth, async (req, res) => {
  try {
    logger.info('metrics', 'Metric types requested');
    
    const metrics = await database.getMetrics(undefined, 168); // Last week
    const types = [...new Set(metrics.map(m => m.metric_type))].sort();
    
    // Get count for each type
    const typeCounts = types.map(type => ({
      type,
      count: metrics.filter(m => m.metric_type === type).length,
      lastUpdated: metrics.filter(m => m.metric_type === type)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.timestamp || null
    }));

    res.json({
      success: true,
      data: {
        types,
        details: typeCounts,
        total: types.length
      }
    });

  } catch (error) {
    logger.error('metrics', 'Failed to get metric types', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get metric types',
      details: error?.toString()
    });
  }
});

// Add custom metric (for external integrations)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { metric_type, value, metadata } = req.body;
    
    if (!metric_type || typeof value !== 'number') {
      return res.status(400).json({
        error: 'metric_type and numeric value are required'
      });
    }

    logger.info('metrics', 'Custom metric added', { metric_type, value });
    
    await database.addMetric({
      timestamp: new Date().toISOString(),
      metric_type,
      value,
      metadata: metadata ? JSON.stringify(metadata) : undefined
    });

    res.json({
      success: true,
      message: 'Metric added successfully',
      data: {
        metric_type,
        value,
        metadata,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('metrics', 'Failed to add metric', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to add metric',
      details: error?.toString()
    });
  }
});

// Get metrics in Prometheus format
router.get('/prometheus', optionalAuth, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 1; // Default to last hour for Prometheus
    
    logger.info('metrics', 'Prometheus metrics requested');
    
    const metrics = await database.getMetrics(undefined, hours);
    
    // Convert to Prometheus format
    let prometheusOutput = '# HELP shimmy_metrics ShimmyServe metrics\n';
    prometheusOutput += '# TYPE shimmy_metrics gauge\n';
    
    // Group by metric type and get latest value
    const latestMetrics: Record<string, any> = {};
    metrics.forEach(metric => {
      if (!latestMetrics[metric.metric_type] || 
          new Date(metric.timestamp) > new Date(latestMetrics[metric.metric_type].timestamp)) {
        latestMetrics[metric.metric_type] = metric;
      }
    });
    
    // Format for Prometheus
    Object.values(latestMetrics).forEach((metric: any) => {
      const metricName = `shimmy_${metric.metric_type.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      prometheusOutput += `${metricName} ${metric.value}\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.send(prometheusOutput);

  } catch (error) {
    logger.error('metrics', 'Failed to generate Prometheus metrics', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to generate Prometheus metrics',
      details: error?.toString()
    });
  }
});

// Export metrics
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const format = req.query.format as string || 'json';
    const hours = parseInt(req.query.hours as string) || 24;
    const metricType = req.query.type as string;
    
    logger.info('metrics', 'Metrics export requested', { format, hours, metricType });
    
    const metrics = await database.getMetrics(metricType, hours);
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      timeRange: {
        hours,
        from: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      },
      metricType: metricType || 'all',
      totalMetrics: metrics.length,
      metrics
    };

    if (format === 'csv') {
      // Convert to CSV
      const csvHeader = 'timestamp,metric_type,value,metadata\n';
      const csvRows = metrics.map(metric => {
        const escapedMetadata = (metric.metadata || '').replace(/"/g, '""');
        return `"${metric.timestamp}","${metric.metric_type}",${metric.value},"${escapedMetadata}"`;
      }).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="metrics_${Date.now()}.csv"`);
      res.send(csvHeader + csvRows);
    } else {
      // Default to JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="metrics_${Date.now()}.json"`);
      res.json(exportData);
    }

  } catch (error) {
    logger.error('metrics', 'Failed to export metrics', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to export metrics',
      details: error?.toString()
    });
  }
});

// Real-time metrics streaming (Server-Sent Events)
router.get('/stream', optionalAuth, (req, res) => {
  try {
    const interval = parseInt(req.query.interval as string) || 10000; // Default 10 seconds
    const metricTypes = req.query.types ? (req.query.types as string).split(',') : undefined;
    
    logger.info('metrics', 'Metrics streaming started', { interval, metricTypes });
    
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
      interval,
      metricTypes: metricTypes || 'all'
    })}\n\n`);

    const sendMetrics = async () => {
      try {
        const metrics = await systemMonitor.getSystemMetrics();
        
        // Filter metrics if specific types requested
        let metricsToSend = metrics;
        if (metricTypes) {
          // This is a simplified filtering - in a real implementation,
          // you'd want to structure this better
          metricsToSend = metrics;
        }
        
        res.write(`data: ${JSON.stringify({
          type: 'metrics',
          timestamp: metrics.timestamp,
          data: metricsToSend
        })}\n\n`);
      } catch (error) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: 'Failed to fetch metrics',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    };

    // Send metrics at specified interval
    const streamInterval = setInterval(sendMetrics, interval);
    
    // Send initial metrics
    sendMetrics();

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(streamInterval);
      logger.info('metrics', 'Metrics streaming ended');
    });

  } catch (error) {
    logger.error('metrics', 'Failed to start metrics streaming', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to start metrics streaming',
      details: error?.toString()
    });
  }
});

// Health check for metrics service
router.get('/health', optionalAuth, async (req, res) => {
  try {
    // Test database connectivity and recent metrics
    const recentMetrics = await database.getMetrics(undefined, 1);
    const systemMetrics = await systemMonitor.getSystemMetrics();
    
    const health = {
      status: 'healthy',
      database: {
        connected: true,
        recentMetricsCount: recentMetrics.length,
        lastMetricTimestamp: recentMetrics[0]?.timestamp || null
      },
      systemMonitor: {
        available: true,
        lastUpdate: systemMetrics.timestamp
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('metrics', 'Metrics health check failed', { error: error?.toString() });
    res.status(500).json({
      error: 'Metrics service unhealthy',
      details: error?.toString()
    });
  }
});

export { router as metricsRoutes };