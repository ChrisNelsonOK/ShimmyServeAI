import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface KubernetesPod {
  name: string;
  namespace: string;
  ready: string;
  status: string;
  restarts: number;
  age: string;
  ip?: string;
  node?: string;
}

export interface KubernetesNode {
  name: string;
  status: string;
  roles: string;
  age: string;
  version: string;
  internalIp?: string;
  externalIp?: string;
  osImage?: string;
  kernelVersion?: string;
  containerRuntime?: string;
}

export interface KubernetesService {
  name: string;
  namespace: string;
  type: string;
  clusterIp: string;
  externalIp: string;
  ports: string;
  age: string;
}

export interface KubernetesDeployment {
  name: string;
  namespace: string;
  ready: string;
  upToDate: number;
  available: number;
  age: string;
}

export interface KubernetesNamespace {
  name: string;
  status: string;
  age: string;
}

export class KubernetesService {
  private isAvailable: boolean | null = null;

  async checkAvailability(): Promise<boolean> {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      await execAsync('kubectl version --client --short');
      this.isAvailable = true;
      logger.info('kubernetes', 'Kubernetes client is available');
      return true;
    } catch (error) {
      this.isAvailable = false;
      logger.warn('kubernetes', 'Kubernetes client is not available', { error: error?.toString() });
      return false;
    }
  }

  async getClusterStatus(): Promise<any> {
    try {
      const available = await this.checkAvailability();
      if (!available) {
        return {
          available: false,
          error: 'kubectl not available'
        };
      }

      // Check if cluster is accessible
      try {
        await execAsync('kubectl cluster-info --request-timeout=5s');
      } catch (error) {
        return {
          available: true,
          clusterAccessible: false,
          error: 'Cluster not accessible',
          details: error?.toString()
        };
      }

      const [nodes, namespaces, pods, services, deployments] = await Promise.all([
        this.getNodes(),
        this.getNamespaces(),
        this.getPods(),
        this.getServices(),
        this.getDeployments()
      ]);

      return {
        available: true,
        clusterAccessible: true,
        nodes,
        namespaces,
        pods,
        services,
        deployments,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('kubernetes', 'Failed to get cluster status', { error: error?.toString() });
      return {
        available: false,
        error: error?.toString()
      };
    }
  }

  async getNodes(): Promise<KubernetesNode[]> {
    try {
      const { stdout } = await execAsync('kubectl get nodes -o wide --no-headers');
      
      const lines = stdout.trim().split('\n');
      if (!lines[0]) return [];

      return lines.map(line => {
        const fields = line.trim().split(/\s+/);
        return {
          name: fields[0] || '',
          status: fields[1] || '',
          roles: fields[2] || '',
          age: fields[3] || '',
          version: fields[4] || '',
          internalIp: fields[5] || '',
          externalIp: fields[6] || '<none>',
          osImage: fields[7] || '',
          kernelVersion: fields[8] || '',
          containerRuntime: fields[9] || ''
        };
      });
    } catch (error) {
      logger.error('kubernetes', 'Failed to get nodes', { error: error?.toString() });
      return [];
    }
  }

  async getPods(namespace: string = 'all'): Promise<KubernetesPod[]> {
    try {
      const namespaceFlag = namespace === 'all' ? '--all-namespaces' : `-n ${namespace}`;
      const { stdout } = await execAsync(`kubectl get pods ${namespaceFlag} -o wide --no-headers`);
      
      const lines = stdout.trim().split('\n');
      if (!lines[0]) return [];

      return lines.map(line => {
        const fields = line.trim().split(/\s+/);
        const isAllNamespaces = namespace === 'all';
        
        return {
          namespace: isAllNamespaces ? fields[0] : namespace,
          name: isAllNamespaces ? fields[1] : fields[0],
          ready: isAllNamespaces ? fields[2] : fields[1],
          status: isAllNamespaces ? fields[3] : fields[2],
          restarts: parseInt(isAllNamespaces ? fields[4] : fields[3]) || 0,
          age: isAllNamespaces ? fields[5] : fields[4],
          ip: isAllNamespaces ? fields[6] : fields[5],
          node: isAllNamespaces ? fields[7] : fields[6]
        };
      });
    } catch (error) {
      logger.error('kubernetes', 'Failed to get pods', { error: error?.toString() });
      return [];
    }
  }

  async getServices(namespace: string = 'all'): Promise<any[]> {
    try {
      const namespaceFlag = namespace === 'all' ? '--all-namespaces' : `-n ${namespace}`;
      const { stdout } = await execAsync(`kubectl get services ${namespaceFlag} --no-headers`);
      
      const lines = stdout.trim().split('\n');
      if (!lines[0]) return [];

      return lines.map(line => {
        const fields = line.trim().split(/\s+/);
        const isAllNamespaces = namespace === 'all';
        
        return {
          namespace: isAllNamespaces ? fields[0] : namespace,
          name: isAllNamespaces ? fields[1] : fields[0],
          type: isAllNamespaces ? fields[2] : fields[1],
          clusterIp: isAllNamespaces ? fields[3] : fields[2],
          externalIp: isAllNamespaces ? fields[4] : fields[3],
          ports: isAllNamespaces ? fields[5] : fields[4],
          age: isAllNamespaces ? fields[6] : fields[5]
        };
      });
    } catch (error) {
      logger.error('kubernetes', 'Failed to get services', { error: error?.toString() });
      return [];
    }
  }

  async getDeployments(namespace: string = 'all'): Promise<KubernetesDeployment[]> {
    try {
      const namespaceFlag = namespace === 'all' ? '--all-namespaces' : `-n ${namespace}`;
      const { stdout } = await execAsync(`kubectl get deployments ${namespaceFlag} --no-headers`);
      
      const lines = stdout.trim().split('\n');
      if (!lines[0]) return [];

      return lines.map(line => {
        const fields = line.trim().split(/\s+/);
        const isAllNamespaces = namespace === 'all';
        
        return {
          namespace: isAllNamespaces ? fields[0] : namespace,
          name: isAllNamespaces ? fields[1] : fields[0],
          ready: isAllNamespaces ? fields[2] : fields[1],
          upToDate: parseInt(isAllNamespaces ? fields[3] : fields[2]) || 0,
          available: parseInt(isAllNamespaces ? fields[4] : fields[3]) || 0,
          age: isAllNamespaces ? fields[5] : fields[4]
        };
      });
    } catch (error) {
      logger.error('kubernetes', 'Failed to get deployments', { error: error?.toString() });
      return [];
    }
  }

  async getNamespaces(): Promise<KubernetesNamespace[]> {
    try {
      const { stdout } = await execAsync('kubectl get namespaces --no-headers');
      
      const lines = stdout.trim().split('\n');
      if (!lines[0]) return [];

      return lines.map(line => {
        const fields = line.trim().split(/\s+/);
        return {
          name: fields[0] || '',
          status: fields[1] || '',
          age: fields[2] || ''
        };
      });
    } catch (error) {
      logger.error('kubernetes', 'Failed to get namespaces', { error: error?.toString() });
      return [];
    }
  }

  async getPodLogs(podName: string, namespace: string = 'default', lines: number = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(`kubectl logs ${podName} -n ${namespace} --tail=${lines}`);
      return stdout;
    } catch (error) {
      logger.error('kubernetes', `Failed to get pod logs: ${podName}`, { error: error?.toString() });
      return `Error getting logs: ${error?.toString()}`;
    }
  }

  async describeResource(resourceType: string, resourceName: string, namespace?: string): Promise<string> {
    try {
      const namespaceFlag = namespace ? `-n ${namespace}` : '';
      const { stdout } = await execAsync(`kubectl describe ${resourceType} ${resourceName} ${namespaceFlag}`);
      return stdout;
    } catch (error) {
      logger.error('kubernetes', `Failed to describe ${resourceType}: ${resourceName}`, { error: error?.toString() });
      return `Error describing resource: ${error?.toString()}`;
    }
  }

  async executeInPod(podName: string, namespace: string, command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`kubectl exec ${podName} -n ${namespace} -- ${command}`);
      return stdout;
    } catch (error) {
      logger.error('kubernetes', `Failed to execute command in pod: ${podName}`, { 
        command,
        error: error?.toString() 
      });
      return `Error executing command: ${error?.toString()}`;
    }
  }

  async scaleDeployment(deploymentName: string, namespace: string, replicas: number): Promise<boolean> {
    try {
      await execAsync(`kubectl scale deployment ${deploymentName} -n ${namespace} --replicas=${replicas}`);
      logger.info('kubernetes', `Deployment scaled: ${deploymentName} to ${replicas} replicas`);
      return true;
    } catch (error) {
      logger.error('kubernetes', `Failed to scale deployment: ${deploymentName}`, { error: error?.toString() });
      return false;
    }
  }

  async deletePod(podName: string, namespace: string): Promise<boolean> {
    try {
      await execAsync(`kubectl delete pod ${podName} -n ${namespace}`);
      logger.info('kubernetes', `Pod deleted: ${podName}`);
      return true;
    } catch (error) {
      logger.error('kubernetes', `Failed to delete pod: ${podName}`, { error: error?.toString() });
      return false;
    }
  }

  async applyManifest(manifestContent: string): Promise<boolean> {
    try {
      // Write manifest to temporary file
      const tempFile = `/tmp/k8s-manifest-${Date.now()}.yaml`;
      require('fs').writeFileSync(tempFile, manifestContent);
      
      await execAsync(`kubectl apply -f ${tempFile}`);
      
      // Clean up temp file
      require('fs').unlinkSync(tempFile);
      
      logger.info('kubernetes', 'Manifest applied successfully');
      return true;
    } catch (error) {
      logger.error('kubernetes', 'Failed to apply manifest', { error: error?.toString() });
      return false;
    }
  }

  async getClusterInfo(): Promise<any> {
    try {
      const { stdout } = await execAsync('kubectl cluster-info');
      return {
        clusterInfo: stdout,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('kubernetes', 'Failed to get cluster info', { error: error?.toString() });
      return {
        error: error?.toString()
      };
    }
  }

  async getResourceUsage(): Promise<any> {
    try {
      // Try to get resource usage (requires metrics-server)
      const [nodeMetrics, podMetrics] = await Promise.allSettled([
        execAsync('kubectl top nodes --no-headers'),
        execAsync('kubectl top pods --all-namespaces --no-headers')
      ]);

      const result: any = {};

      if (nodeMetrics.status === 'fulfilled') {
        const lines = nodeMetrics.value.stdout.trim().split('\n');
        result.nodeMetrics = lines.map(line => {
          const fields = line.trim().split(/\s+/);
          return {
            name: fields[0],
            cpuCores: fields[1],
            cpuPercent: fields[2],
            memoryBytes: fields[3],
            memoryPercent: fields[4]
          };
        });
      } else {
        result.nodeMetrics = [];
        result.nodeMetricsError = 'Metrics server not available';
      }

      if (podMetrics.status === 'fulfilled') {
        const lines = podMetrics.value.stdout.trim().split('\n');
        result.podMetrics = lines.map(line => {
          const fields = line.trim().split(/\s+/);
          return {
            namespace: fields[0],
            name: fields[1],
            cpuCores: fields[2],
            memoryBytes: fields[3]
          };
        });
      } else {
        result.podMetrics = [];
        result.podMetricsError = 'Metrics server not available';
      }

      return result;
    } catch (error) {
      logger.error('kubernetes', 'Failed to get resource usage', { error: error?.toString() });
      return {
        error: error?.toString()
      };
    }
  }

  async getEvents(namespace?: string): Promise<any[]> {
    try {
      const namespaceFlag = namespace ? `-n ${namespace}` : '--all-namespaces';
      const { stdout } = await execAsync(`kubectl get events ${namespaceFlag} --sort-by='.lastTimestamp' --no-headers`);
      
      const lines = stdout.trim().split('\n');
      if (!lines[0]) return [];

      return lines.map(line => {
        const fields = line.trim().split(/\s+/);
        const isAllNamespaces = !namespace;
        
        return {
          namespace: isAllNamespaces ? fields[0] : namespace,
          lastSeen: isAllNamespaces ? fields[1] : fields[0],
          type: isAllNamespaces ? fields[2] : fields[1],
          reason: isAllNamespaces ? fields[3] : fields[2],
          object: isAllNamespaces ? fields[4] : fields[3],
          message: isAllNamespaces ? fields.slice(5).join(' ') : fields.slice(4).join(' ')
        };
      });
    } catch (error) {
      logger.error('kubernetes', 'Failed to get events', { error: error?.toString() });
      return [];
    }
  }
}