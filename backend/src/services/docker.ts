import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  command: string;
  created: string;
  status: string;
  ports: string;
  names: string;
}

export interface DockerImage {
  repository: string;
  tag: string;
  imageId: string;
  created: string;
  size: string;
}

export interface DockerStats {
  containerId: string;
  name: string;
  cpuPerc: string;
  memUsage: string;
  memPerc: string;
  netIO: string;
  blockIO: string;
  pids: string;
}

export interface DockerSystemInfo {
  containers: number;
  containersRunning: number;
  containersPaused: number;
  containersStopped: number;
  images: number;
  serverVersion: string;
  storageDriver: string;
  kernelVersion: string;
  operatingSystem: string;
  architecture: string;
  cpus: number;
  totalMemory: string;
}

export class DockerService {
  private isAvailable: boolean | null = null;

  async checkAvailability(): Promise<boolean> {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      await execAsync('docker version --format "{{.Server.Version}}"');
      this.isAvailable = true;
      logger.info('docker', 'Docker daemon is available');
      return true;
    } catch (error) {
      this.isAvailable = false;
      logger.warn('docker', 'Docker daemon is not available', { error: error?.toString() });
      return false;
    }
  }

  async getStatus(): Promise<any> {
    try {
      const available = await this.checkAvailability();
      if (!available) {
        return {
          available: false,
          error: 'Docker daemon not available'
        };
      }

      const [containers, images, systemInfo] = await Promise.all([
        this.listContainers(),
        this.listImages(),
        this.getSystemInfo()
      ]);

      return {
        available: true,
        containers,
        images,
        systemInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('docker', 'Failed to get Docker status', { error: error?.toString() });
      return {
        available: false,
        error: error?.toString()
      };
    }
  }

  async listContainers(all: boolean = true): Promise<DockerContainer[]> {
    try {
      const flag = all ? '-a' : '';
      const { stdout } = await execAsync(`docker ps ${flag} --format "table {{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.Command}}\\t{{.CreatedAt}}\\t{{.Status}}\\t{{.Ports}}"`);
      
      const lines = stdout.trim().split('\n');
      if (lines.length <= 1) return []; // Only header or empty

      return lines.slice(1).map(line => {
        const fields = line.split('\t');
        return {
          id: fields[0] || '',
          names: fields[1] || '',
          name: fields[1] || '',
          image: fields[2] || '',
          command: fields[3] || '',
          created: fields[4] || '',
          status: fields[5] || '',
          ports: fields[6] || ''
        };
      });
    } catch (error) {
      logger.error('docker', 'Failed to list containers', { error: error?.toString() });
      return [];
    }
  }

  async listImages(): Promise<DockerImage[]> {
    try {
      const { stdout } = await execAsync('docker images --format "table {{.Repository}}\\t{{.Tag}}\\t{{.ID}}\\t{{.CreatedAt}}\\t{{.Size}}"');
      
      const lines = stdout.trim().split('\n');
      if (lines.length <= 1) return []; // Only header or empty

      return lines.slice(1).map(line => {
        const fields = line.split('\t');
        return {
          repository: fields[0] || '',
          tag: fields[1] || '',
          imageId: fields[2] || '',
          created: fields[3] || '',
          size: fields[4] || ''
        };
      });
    } catch (error) {
      logger.error('docker', 'Failed to list images', { error: error?.toString() });
      return [];
    }
  }

  async getContainerStats(): Promise<DockerStats[]> {
    try {
      // Get stats for all running containers (no-stream, single output)
      const { stdout } = await execAsync('docker stats --no-stream --format "table {{.Container}}\\t{{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}\\t{{.NetIO}}\\t{{.BlockIO}}\\t{{.PIDs}}"');
      
      const lines = stdout.trim().split('\n');
      if (lines.length <= 1) return []; // Only header or empty

      return lines.slice(1).map(line => {
        const fields = line.split('\t');
        return {
          containerId: fields[0] || '',
          name: fields[1] || '',
          cpuPerc: fields[2] || '0%',
          memUsage: fields[3] || '0B / 0B',
          memPerc: fields[4] || '0%',
          netIO: fields[5] || '0B / 0B',
          blockIO: fields[6] || '0B / 0B',
          pids: fields[7] || '0'
        };
      });
    } catch (error) {
      logger.error('docker', 'Failed to get container stats', { error: error?.toString() });
      return [];
    }
  }

  async getSystemInfo(): Promise<DockerSystemInfo | null> {
    try {
      const { stdout } = await execAsync('docker system df && docker info --format "{{json .}}"');
      
      // Parse the docker info JSON (last line)
      const lines = stdout.trim().split('\n');
      const infoLine = lines[lines.length - 1];
      const info = JSON.parse(infoLine);

      return {
        containers: info.Containers || 0,
        containersRunning: info.ContainersRunning || 0,
        containersPaused: info.ContainersPaused || 0,
        containersStopped: info.ContainersStopped || 0,
        images: info.Images || 0,
        serverVersion: info.ServerVersion || 'unknown',
        storageDriver: info.Driver || 'unknown',
        kernelVersion: info.KernelVersion || 'unknown',
        operatingSystem: info.OperatingSystem || 'unknown',
        architecture: info.Architecture || 'unknown',
        cpus: info.NCPU || 0,
        totalMemory: this.formatBytes(info.MemTotal || 0)
      };
    } catch (error) {
      logger.error('docker', 'Failed to get system info', { error: error?.toString() });
      return null;
    }
  }

  async startContainer(containerId: string): Promise<boolean> {
    try {
      await execAsync(`docker start ${containerId}`);
      logger.info('docker', `Container started: ${containerId}`);
      return true;
    } catch (error) {
      logger.error('docker', `Failed to start container: ${containerId}`, { error: error?.toString() });
      return false;
    }
  }

  async stopContainer(containerId: string): Promise<boolean> {
    try {
      await execAsync(`docker stop ${containerId}`);
      logger.info('docker', `Container stopped: ${containerId}`);
      return true;
    } catch (error) {
      logger.error('docker', `Failed to stop container: ${containerId}`, { error: error?.toString() });
      return false;
    }
  }

  async restartContainer(containerId: string): Promise<boolean> {
    try {
      await execAsync(`docker restart ${containerId}`);
      logger.info('docker', `Container restarted: ${containerId}`);
      return true;
    } catch (error) {
      logger.error('docker', `Failed to restart container: ${containerId}`, { error: error?.toString() });
      return false;
    }
  }

  async removeContainer(containerId: string, force: boolean = false): Promise<boolean> {
    try {
      const forceFlag = force ? '-f' : '';
      await execAsync(`docker rm ${forceFlag} ${containerId}`);
      logger.info('docker', `Container removed: ${containerId}`);
      return true;
    } catch (error) {
      logger.error('docker', `Failed to remove container: ${containerId}`, { error: error?.toString() });
      return false;
    }
  }

  async getContainerLogs(containerId: string, lines: number = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker logs --tail ${lines} ${containerId}`);
      return stdout;
    } catch (error) {
      logger.error('docker', `Failed to get container logs: ${containerId}`, { error: error?.toString() });
      return `Error getting logs: ${error?.toString()}`;
    }
  }

  async executeInContainer(containerId: string, command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker exec ${containerId} ${command}`);
      return stdout;
    } catch (error) {
      logger.error('docker', `Failed to execute command in container: ${containerId}`, { 
        command,
        error: error?.toString() 
      });
      return `Error executing command: ${error?.toString()}`;
    }
  }

  async pullImage(imageName: string): Promise<boolean> {
    try {
      await execAsync(`docker pull ${imageName}`);
      logger.info('docker', `Image pulled: ${imageName}`);
      return true;
    } catch (error) {
      logger.error('docker', `Failed to pull image: ${imageName}`, { error: error?.toString() });
      return false;
    }
  }

  async removeImage(imageId: string, force: boolean = false): Promise<boolean> {
    try {
      const forceFlag = force ? '-f' : '';
      await execAsync(`docker rmi ${forceFlag} ${imageId}`);
      logger.info('docker', `Image removed: ${imageId}`);
      return true;
    } catch (error) {
      logger.error('docker', `Failed to remove image: ${imageId}`, { error: error?.toString() });
      return false;
    }
  }

  async pruneSystem(volumes: boolean = false): Promise<string> {
    try {
      const volumeFlag = volumes ? '--volumes' : '';
      const { stdout } = await execAsync(`docker system prune -f ${volumeFlag}`);
      logger.info('docker', 'Docker system pruned');
      return stdout;
    } catch (error) {
      logger.error('docker', 'Failed to prune Docker system', { error: error?.toString() });
      return `Error pruning system: ${error?.toString()}`;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async getNetworks(): Promise<any[]> {
    try {
      const { stdout } = await execAsync('docker network ls --format "table {{.ID}}\\t{{.Name}}\\t{{.Driver}}\\t{{.Scope}}"');
      
      const lines = stdout.trim().split('\n');
      if (lines.length <= 1) return [];

      return lines.slice(1).map(line => {
        const fields = line.split('\t');
        return {
          id: fields[0] || '',
          name: fields[1] || '',
          driver: fields[2] || '',
          scope: fields[3] || ''
        };
      });
    } catch (error) {
      logger.error('docker', 'Failed to list networks', { error: error?.toString() });
      return [];
    }
  }

  async getVolumes(): Promise<any[]> {
    try {
      const { stdout } = await execAsync('docker volume ls --format "table {{.Driver}}\\t{{.Name}}"');
      
      const lines = stdout.trim().split('\n');
      if (lines.length <= 1) return [];

      return lines.slice(1).map(line => {
        const fields = line.split('\t');
        return {
          driver: fields[0] || '',
          name: fields[1] || ''
        };
      });
    } catch (error) {
      logger.error('docker', 'Failed to list volumes', { error: error?.toString() });
      return [];
    }
  }
}