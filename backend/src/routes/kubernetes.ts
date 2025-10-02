import express from 'express';
import { KubernetesService } from '../services/kubernetes';
import { logger } from '../utils/logger';
import { authenticateToken, optionalAuth } from './auth';

const router = express.Router();
const kubernetesService = new KubernetesService();

// Get cluster status and overview
router.get('/status', optionalAuth, async (req, res) => {
  try {
    logger.info('kubernetes', 'Cluster status requested');
    const status = await kubernetesService.getClusterStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to get cluster status', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get cluster status',
      details: error?.toString()
    });
  }
});

// Get nodes
router.get('/nodes', optionalAuth, async (req, res) => {
  try {
    logger.info('kubernetes', 'Nodes list requested');
    const nodes = await kubernetesService.getNodes();
    
    res.json({
      success: true,
      data: nodes,
      count: nodes.length
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to get nodes', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get nodes',
      details: error?.toString()
    });
  }
});

// Get pods
router.get('/pods', optionalAuth, async (req, res) => {
  try {
    const namespace = req.query.namespace as string || 'all';
    logger.info('kubernetes', 'Pods list requested', { namespace });
    
    const pods = await kubernetesService.getPods(namespace);
    
    res.json({
      success: true,
      data: pods,
      count: pods.length,
      namespace
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to get pods', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get pods',
      details: error?.toString()
    });
  }
});

// Get services
router.get('/services', optionalAuth, async (req, res) => {
  try {
    const namespace = req.query.namespace as string || 'all';
    logger.info('kubernetes', 'Services list requested', { namespace });
    
    const services = await kubernetesService.getServices(namespace);
    
    res.json({
      success: true,
      data: services,
      count: services.length,
      namespace
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to get services', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get services',
      details: error?.toString()
    });
  }
});

// Get deployments
router.get('/deployments', optionalAuth, async (req, res) => {
  try {
    const namespace = req.query.namespace as string || 'all';
    logger.info('kubernetes', 'Deployments list requested', { namespace });
    
    const deployments = await kubernetesService.getDeployments(namespace);
    
    res.json({
      success: true,
      data: deployments,
      count: deployments.length,
      namespace
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to get deployments', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get deployments',
      details: error?.toString()
    });
  }
});

// Get namespaces
router.get('/namespaces', optionalAuth, async (req, res) => {
  try {
    logger.info('kubernetes', 'Namespaces list requested');
    const namespaces = await kubernetesService.getNamespaces();
    
    res.json({
      success: true,
      data: namespaces,
      count: namespaces.length
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to get namespaces', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get namespaces',
      details: error?.toString()
    });
  }
});

// Get pod logs
router.get('/pods/:name/logs', optionalAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const namespace = req.query.namespace as string || 'default';
    const lines = parseInt(req.query.lines as string) || 100;
    
    logger.info('kubernetes', `Getting logs for pod: ${name}`, { namespace, lines });
    const logs = await kubernetesService.getPodLogs(name, namespace, lines);
    
    res.json({
      success: true,
      data: {
        podName: name,
        namespace,
        logs,
        lines
      }
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to get pod logs', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get pod logs',
      details: error?.toString()
    });
  }
});

// Describe resource
router.get('/describe/:type/:name', optionalAuth, async (req, res) => {
  try {
    const { type, name } = req.params;
    const namespace = req.query.namespace as string;
    
    logger.info('kubernetes', `Describing ${type}: ${name}`, { namespace });
    const description = await kubernetesService.describeResource(type, name, namespace);
    
    res.json({
      success: true,
      data: {
        resourceType: type,
        resourceName: name,
        namespace,
        description
      }
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to describe resource', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to describe resource',
      details: error?.toString()
    });
  }
});

// Execute command in pod
router.post('/pods/:name/exec', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { command, namespace = 'default' } = req.body;
    
    if (!command) {
      return res.status(400).json({
        error: 'Command is required'
      });
    }

    logger.info('kubernetes', `Executing command in pod: ${name}`, { namespace, command });
    const output = await kubernetesService.executeInPod(name, namespace, command);
    
    res.json({
      success: true,
      data: {
        podName: name,
        namespace,
        command,
        output
      }
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to execute command in pod', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to execute command in pod',
      details: error?.toString()
    });
  }
});

// Scale deployment
router.post('/deployments/:name/scale', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { replicas, namespace = 'default' } = req.body;
    
    if (typeof replicas !== 'number' || replicas < 0) {
      return res.status(400).json({
        error: 'Valid replicas number is required'
      });
    }

    logger.info('kubernetes', `Scaling deployment: ${name}`, { namespace, replicas });
    const success = await kubernetesService.scaleDeployment(name, namespace, replicas);
    
    if (success) {
      res.json({
        success: true,
        message: `Deployment ${name} scaled to ${replicas} replicas`
      });
    } else {
      res.status(400).json({
        error: `Failed to scale deployment ${name}`
      });
    }

  } catch (error) {
    logger.error('kubernetes', 'Failed to scale deployment', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to scale deployment',
      details: error?.toString()
    });
  }
});

// Delete pod
router.delete('/pods/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const namespace = req.query.namespace as string || 'default';
    
    logger.info('kubernetes', `Deleting pod: ${name}`, { namespace });
    const success = await kubernetesService.deletePod(name, namespace);
    
    if (success) {
      res.json({
        success: true,
        message: `Pod ${name} deleted successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to delete pod ${name}`
      });
    }

  } catch (error) {
    logger.error('kubernetes', 'Failed to delete pod', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to delete pod',
      details: error?.toString()
    });
  }
});

// Apply manifest
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { manifest } = req.body;
    
    if (!manifest) {
      return res.status(400).json({
        error: 'Manifest content is required'
      });
    }

    logger.info('kubernetes', 'Applying manifest');
    const success = await kubernetesService.applyManifest(manifest);
    
    if (success) {
      res.json({
        success: true,
        message: 'Manifest applied successfully'
      });
    } else {
      res.status(400).json({
        error: 'Failed to apply manifest'
      });
    }

  } catch (error) {
    logger.error('kubernetes', 'Failed to apply manifest', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to apply manifest',
      details: error?.toString()
    });
  }
});

// Get cluster info
router.get('/cluster-info', optionalAuth, async (req, res) => {
  try {
    logger.info('kubernetes', 'Cluster info requested');
    const clusterInfo = await kubernetesService.getClusterInfo();
    
    res.json({
      success: true,
      data: clusterInfo
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to get cluster info', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get cluster info',
      details: error?.toString()
    });
  }
});

// Get resource usage (requires metrics-server)
router.get('/metrics', optionalAuth, async (req, res) => {
  try {
    logger.info('kubernetes', 'Resource usage metrics requested');
    const metrics = await kubernetesService.getResourceUsage();
    
    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to get resource usage', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get resource usage',
      details: error?.toString()
    });
  }
});

// Get events
router.get('/events', optionalAuth, async (req, res) => {
  try {
    const namespace = req.query.namespace as string;
    logger.info('kubernetes', 'Events requested', { namespace });
    
    const events = await kubernetesService.getEvents(namespace);
    
    res.json({
      success: true,
      data: events,
      count: events.length,
      namespace: namespace || 'all'
    });

  } catch (error) {
    logger.error('kubernetes', 'Failed to get events', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get events',
      details: error?.toString()
    });
  }
});

export { router as kubernetesRoutes };