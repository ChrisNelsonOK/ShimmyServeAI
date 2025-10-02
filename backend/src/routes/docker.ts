import express from 'express';
import { DockerService } from '../services/docker';
import { logger } from '../utils/logger';
import { authenticateToken, optionalAuth } from './auth';

const router = express.Router();
const dockerService = new DockerService();

// Get Docker status and overview
router.get('/status', optionalAuth, async (req, res) => {
  try {
    logger.info('docker', 'Docker status requested');
    const status = await dockerService.getStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('docker', 'Failed to get Docker status', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get Docker status',
      details: error?.toString()
    });
  }
});

// List containers
router.get('/containers', optionalAuth, async (req, res) => {
  try {
    const all = req.query.all === 'true';
    logger.info('docker', 'Containers list requested', { all });
    
    const containers = await dockerService.listContainers(all);
    
    res.json({
      success: true,
      data: containers,
      count: containers.length
    });

  } catch (error) {
    logger.error('docker', 'Failed to list containers', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to list containers',
      details: error?.toString()
    });
  }
});

// List images
router.get('/images', optionalAuth, async (req, res) => {
  try {
    logger.info('docker', 'Images list requested');
    const images = await dockerService.listImages();
    
    res.json({
      success: true,
      data: images,
      count: images.length
    });

  } catch (error) {
    logger.error('docker', 'Failed to list images', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to list images',
      details: error?.toString()
    });
  }
});

// Get container stats
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    logger.info('docker', 'Container stats requested');
    const stats = await dockerService.getContainerStats();
    
    res.json({
      success: true,
      data: stats,
      count: stats.length
    });

  } catch (error) {
    logger.error('docker', 'Failed to get container stats', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get container stats',
      details: error?.toString()
    });
  }
});

// Get system information
router.get('/system', optionalAuth, async (req, res) => {
  try {
    logger.info('docker', 'Docker system info requested');
    const systemInfo = await dockerService.getSystemInfo();
    
    res.json({
      success: true,
      data: systemInfo
    });

  } catch (error) {
    logger.error('docker', 'Failed to get Docker system info', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get Docker system info',
      details: error?.toString()
    });
  }
});

// Container operations (require authentication)
router.post('/containers/:id/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info('docker', `Starting container: ${id}`);
    
    const success = await dockerService.startContainer(id);
    
    if (success) {
      res.json({
        success: true,
        message: `Container ${id} started successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to start container ${id}`
      });
    }

  } catch (error) {
    logger.error('docker', 'Failed to start container', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to start container',
      details: error?.toString()
    });
  }
});

router.post('/containers/:id/stop', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info('docker', `Stopping container: ${id}`);
    
    const success = await dockerService.stopContainer(id);
    
    if (success) {
      res.json({
        success: true,
        message: `Container ${id} stopped successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to stop container ${id}`
      });
    }

  } catch (error) {
    logger.error('docker', 'Failed to stop container', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to stop container',
      details: error?.toString()
    });
  }
});

router.post('/containers/:id/restart', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    logger.info('docker', `Restarting container: ${id}`);
    
    const success = await dockerService.restartContainer(id);
    
    if (success) {
      res.json({
        success: true,
        message: `Container ${id} restarted successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to restart container ${id}`
      });
    }

  } catch (error) {
    logger.error('docker', 'Failed to restart container', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to restart container',
      details: error?.toString()
    });
  }
});

router.delete('/containers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';
    logger.info('docker', `Removing container: ${id}`, { force });
    
    const success = await dockerService.removeContainer(id, force);
    
    if (success) {
      res.json({
        success: true,
        message: `Container ${id} removed successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to remove container ${id}`
      });
    }

  } catch (error) {
    logger.error('docker', 'Failed to remove container', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to remove container',
      details: error?.toString()
    });
  }
});

// Get container logs
router.get('/containers/:id/logs', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const lines = parseInt(req.query.lines as string) || 100;
    
    logger.info('docker', `Getting logs for container: ${id}`, { lines });
    const logs = await dockerService.getContainerLogs(id, lines);
    
    res.json({
      success: true,
      data: {
        containerId: id,
        logs,
        lines
      }
    });

  } catch (error) {
    logger.error('docker', 'Failed to get container logs', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to get container logs',
      details: error?.toString()
    });
  }
});

// Execute command in container
router.post('/containers/:id/exec', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({
        error: 'Command is required'
      });
    }

    logger.info('docker', `Executing command in container: ${id}`, { command });
    const output = await dockerService.executeInContainer(id, command);
    
    res.json({
      success: true,
      data: {
        containerId: id,
        command,
        output
      }
    });

  } catch (error) {
    logger.error('docker', 'Failed to execute command in container', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to execute command in container',
      details: error?.toString()
    });
  }
});

// Image operations
router.post('/images/pull', authenticateToken, async (req, res) => {
  try {
    const { imageName } = req.body;
    
    if (!imageName) {
      return res.status(400).json({
        error: 'Image name is required'
      });
    }

    logger.info('docker', `Pulling image: ${imageName}`);
    const success = await dockerService.pullImage(imageName);
    
    if (success) {
      res.json({
        success: true,
        message: `Image ${imageName} pulled successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to pull image ${imageName}`
      });
    }

  } catch (error) {
    logger.error('docker', 'Failed to pull image', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to pull image',
      details: error?.toString()
    });
  }
});

router.delete('/images/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const force = req.query.force === 'true';
    
    logger.info('docker', `Removing image: ${id}`, { force });
    const success = await dockerService.removeImage(id, force);
    
    if (success) {
      res.json({
        success: true,
        message: `Image ${id} removed successfully`
      });
    } else {
      res.status(400).json({
        error: `Failed to remove image ${id}`
      });
    }

  } catch (error) {
    logger.error('docker', 'Failed to remove image', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to remove image',
      details: error?.toString()
    });
  }
});

// System operations
router.post('/system/prune', authenticateToken, async (req, res) => {
  try {
    const volumes = req.body.volumes === true;
    
    logger.info('docker', 'Pruning Docker system', { volumes });
    const output = await dockerService.pruneSystem(volumes);
    
    res.json({
      success: true,
      message: 'Docker system pruned successfully',
      output
    });

  } catch (error) {
    logger.error('docker', 'Failed to prune Docker system', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to prune Docker system',
      details: error?.toString()
    });
  }
});

// Get networks
router.get('/networks', optionalAuth, async (req, res) => {
  try {
    logger.info('docker', 'Networks list requested');
    const networks = await dockerService.getNetworks();
    
    res.json({
      success: true,
      data: networks,
      count: networks.length
    });

  } catch (error) {
    logger.error('docker', 'Failed to list networks', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to list networks',
      details: error?.toString()
    });
  }
});

// Get volumes
router.get('/volumes', optionalAuth, async (req, res) => {
  try {
    logger.info('docker', 'Volumes list requested');
    const volumes = await dockerService.getVolumes();
    
    res.json({
      success: true,
      data: volumes,
      count: volumes.length
    });

  } catch (error) {
    logger.error('docker', 'Failed to list volumes', { error: error?.toString() });
    res.status(500).json({
      error: 'Failed to list volumes',
      details: error?.toString()
    });
  }
});

export { router as dockerRoutes };