import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface ShimmyStatus {
  version: string;
  running: boolean;
  pid?: number;
  uptime?: string;
  config?: ShimmyConfig;
  performance?: ShimmyPerformance;
  connections?: number;
  errors?: string[];
}

export interface ShimmyConfig {
  port: number;
  host: string;
  workers: number;
  max_connections: number;
  timeout: number;
  models_path: string;
  cache_size: string;
  log_level: string;
}

export interface ShimmyPerformance {
  requests_per_second: number;
  average_response_time: number;
  active_connections: number;
  memory_usage: string;
  cpu_usage: number;
  inference_queue_size: number;
}

export interface ShimmyLog {
  timestamp: string;
  level: string;
  message: string;
  component?: string;
}

export class ShimmyService {
  private shimmyPath: string;
  private isAvailable: boolean | null = null;

  constructor(shimmyPath: string = '/Users/cnelson/bin/shimmy') {
    this.shimmyPath = shimmyPath;
  }

  async checkAvailability(): Promise<boolean> {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      await execAsync(`${this.shimmyPath} --version`);
      this.isAvailable = true;
      logger.info('shimmy', 'Shimmy binary is available');
      return true;
    } catch (error) {
      this.isAvailable = false;
      logger.warn('shimmy', 'Shimmy binary is not available', { 
        path: this.shimmyPath,
        error: error?.toString() 
      });
      return false;
    }
  }

  async getStatus(): Promise<ShimmyStatus> {
    try {
      const available = await this.checkAvailability();
      if (!available) {
        return {
          version: 'unknown',
          running: false,
          errors: ['Shimmy binary not available']
        };
      }

      const [version, processInfo, config] = await Promise.allSettled([
        this.getVersion(),
        this.getProcessInfo(),
        this.getConfig()
      ]);

      const status: ShimmyStatus = {
        version: version.status === 'fulfilled' ? version.value : 'unknown',
        running: processInfo.status === 'fulfilled' ? processInfo.value.running : false,
        errors: []
      };

      if (processInfo.status === 'fulfilled') {
        status.pid = processInfo.value.pid;
        status.uptime = processInfo.value.uptime;
        status.connections = processInfo.value.connections;
      }

      if (config.status === 'fulfilled') {
        status.config = config.value;
      }

      // Get performance metrics if running
      if (status.running) {
        try {
          status.performance = await this.getPerformanceMetrics();
        } catch (error) {
          status.errors?.push(`Performance metrics unavailable: ${error?.toString()}`);
        }
      }

      return status;
    } catch (error) {
      logger.error('shimmy', 'Failed to get Shimmy status', { error: error?.toString() });
      return {
        version: 'unknown',
        running: false,
        errors: [error?.toString() || 'Unknown error']
      };
    }
  }

  async getVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync(`${this.shimmyPath} --version`);
      const match = stdout.match(/shimmy (\d+\.\d+\.\d+)/);
      return match ? match[1] : stdout.trim();
    } catch (error) {
      logger.error('shimmy', 'Failed to get version', { error: error?.toString() });
      return 'unknown';
    }
  }

  async getProcessInfo(): Promise<{ running: boolean; pid?: number; uptime?: string; connections?: number }> {
    try {
      // Check if shimmy process is running
      const { stdout } = await execAsync('ps aux | grep shimmy | grep -v grep');
      
      if (!stdout.trim()) {
        return { running: false };
      }

      const lines = stdout.trim().split('\n');
      const mainProcess = lines.find(line => line.includes('shimmy') && !line.includes('grep'));
      
      if (!mainProcess) {
        return { running: false };
      }

      const fields = mainProcess.trim().split(/\s+/);
      const pid = parseInt(fields[1]);
      
      // Get process uptime
      let uptime = 'unknown';
      try {
        const { stdout: uptimeOutput } = await execAsync(`ps -o etime= -p ${pid}`);
        uptime = uptimeOutput.trim();
      } catch {
        // Fallback to process start time
        try {
          const { stdout: startTime } = await execAsync(`ps -o lstart= -p ${pid}`);
          uptime = `Started: ${startTime.trim()}`;
        } catch {
          uptime = 'unknown';
        }
      }

      // Get network connections (if shimmy has a specific port)
      let connections = 0;
      try {
        const { stdout: netstat } = await execAsync(`lsof -p ${pid} -i | wc -l`);
        connections = parseInt(netstat.trim()) || 0;
      } catch {
        connections = 0;
      }

      return {
        running: true,
        pid,
        uptime,
        connections
      };
    } catch (error) {
      logger.error('shimmy', 'Failed to get process info', { error: error?.toString() });
      return { running: false };
    }
  }

  async getConfig(): Promise<ShimmyConfig | null> {
    try {
      // Try to get config from shimmy command
      const { stdout } = await execAsync(`${this.shimmyPath} config show 2>/dev/null || echo "Config command not available"`);
      
      if (stdout.includes('Config command not available')) {
        // Return default/estimated config
        return {
          port: 8080,
          host: '0.0.0.0',
          workers: 4,
          max_connections: 1000,
          timeout: 30,
          models_path: '~/.shimmy/models',
          cache_size: '1GB',
          log_level: 'info'
        };
      }

      // Parse config output (assuming JSON format)
      try {
        return JSON.parse(stdout);
      } catch {
        // Parse line-by-line format
        const config: Partial<ShimmyConfig> = {};
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          const match = line.match(/^(\w+):\s*(.+)$/);
          if (match) {
            const key = match[1].toLowerCase();
            const value = match[2].trim();
            
            switch (key) {
              case 'port':
                config.port = parseInt(value);
                break;
              case 'host':
                config.host = value;
                break;
              case 'workers':
                config.workers = parseInt(value);
                break;
              case 'max_connections':
                config.max_connections = parseInt(value);
                break;
              case 'timeout':
                config.timeout = parseInt(value);
                break;
              case 'models_path':
                config.models_path = value;
                break;
              case 'cache_size':
                config.cache_size = value;
                break;
              case 'log_level':
                config.log_level = value;
                break;
            }
          }
        }
        
        return config as ShimmyConfig;
      }
    } catch (error) {
      logger.error('shimmy', 'Failed to get config', { error: error?.toString() });
      return null;
    }
  }

  async getPerformanceMetrics(): Promise<ShimmyPerformance | null> {
    try {
      // Try to get performance metrics from shimmy
      const { stdout } = await execAsync(`${this.shimmyPath} stats 2>/dev/null || echo "Stats not available"`);
      
      if (stdout.includes('Stats not available')) {
        // Estimate performance based on process info
        const processInfo = await this.getProcessInfo();
        if (!processInfo.running || !processInfo.pid) {
          return null;
        }

        // Get CPU and memory usage for the process
        const { stdout: psOutput } = await execAsync(`ps -p ${processInfo.pid} -o %cpu,%mem --no-headers`);
        const [cpu, mem] = psOutput.trim().split(/\s+/).map(parseFloat);

        return {
          requests_per_second: 0, // Unknown without actual stats
          average_response_time: 0, // Unknown
          active_connections: processInfo.connections || 0,
          memory_usage: `${mem.toFixed(1)}%`,
          cpu_usage: cpu || 0,
          inference_queue_size: 0 // Unknown
        };
      }

      // Parse stats output
      try {
        return JSON.parse(stdout);
      } catch {
        // Parse line-by-line format
        const metrics: Partial<ShimmyPerformance> = {};
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          const match = line.match(/^(\w+(?:_\w+)*):\s*(.+)$/);
          if (match) {
            const key = match[1].toLowerCase();
            const value = match[2].trim();
            
            switch (key) {
              case 'requests_per_second':
                metrics.requests_per_second = parseFloat(value);
                break;
              case 'average_response_time':
                metrics.average_response_time = parseFloat(value);
                break;
              case 'active_connections':
                metrics.active_connections = parseInt(value);
                break;
              case 'memory_usage':
                metrics.memory_usage = value;
                break;
              case 'cpu_usage':
                metrics.cpu_usage = parseFloat(value);
                break;
              case 'inference_queue_size':
                metrics.inference_queue_size = parseInt(value);
                break;
            }
          }
        }
        
        return metrics as ShimmyPerformance;
      }
    } catch (error) {
      logger.error('shimmy', 'Failed to get performance metrics', { error: error?.toString() });
      return null;
    }
  }

  async getLogs(lines: number = 100): Promise<ShimmyLog[]> {
    try {
      // Try to get logs from shimmy command
      const { stdout } = await execAsync(`${this.shimmyPath} logs --lines ${lines} 2>/dev/null || echo "Logs not available"`);
      
      if (stdout.includes('Logs not available')) {
        return [];
      }

      const logs: ShimmyLog[] = [];
      const logLines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of logLines) {
        // Parse common log formats
        const match = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.\d]*Z?)\s+(\w+)\s+(.+)$/);
        if (match) {
          logs.push({
            timestamp: match[1],
            level: match[2].toLowerCase(),
            message: match[3]
          });
        } else {
          // Fallback for lines that don't match expected format
          logs.push({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: line
          });
        }
      }

      return logs;
    } catch (error) {
      logger.error('shimmy', 'Failed to get logs', { error: error?.toString() });
      return [];
    }
  }

  async start(): Promise<boolean> {
    try {
      const processInfo = await this.getProcessInfo();
      if (processInfo.running) {
        logger.info('shimmy', 'Shimmy is already running');
        return true;
      }

      // Start shimmy in background
      const { stdout } = await execAsync(`${this.shimmyPath} start --daemon 2>&1 || ${this.shimmyPath} --daemon 2>&1`);
      
      // Wait a bit and check if it started
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newProcessInfo = await this.getProcessInfo();
      if (newProcessInfo.running) {
        logger.info('shimmy', 'Shimmy started successfully');
        return true;
      } else {
        logger.error('shimmy', 'Failed to start Shimmy', { output: stdout });
        return false;
      }
    } catch (error) {
      logger.error('shimmy', 'Failed to start Shimmy', { error: error?.toString() });
      return false;
    }
  }

  async stop(): Promise<boolean> {
    try {
      const processInfo = await this.getProcessInfo();
      if (!processInfo.running) {
        logger.info('shimmy', 'Shimmy is not running');
        return true;
      }

      // Try graceful shutdown first
      try {
        await execAsync(`${this.shimmyPath} stop`);
      } catch {
        // If graceful shutdown fails, try killing the process
        if (processInfo.pid) {
          await execAsync(`kill ${processInfo.pid}`);
        }
      }

      // Wait a bit and check if it stopped
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newProcessInfo = await this.getProcessInfo();
      if (!newProcessInfo.running) {
        logger.info('shimmy', 'Shimmy stopped successfully');
        return true;
      } else {
        logger.error('shimmy', 'Failed to stop Shimmy gracefully, trying force kill');
        if (processInfo.pid) {
          await execAsync(`kill -9 ${processInfo.pid}`);
          return true;
        }
        return false;
      }
    } catch (error) {
      logger.error('shimmy', 'Failed to stop Shimmy', { error: error?.toString() });
      return false;
    }
  }

  async restart(): Promise<boolean> {
    try {
      logger.info('shimmy', 'Restarting Shimmy...');
      
      const stopped = await this.stop();
      if (!stopped) {
        return false;
      }

      // Wait a bit before starting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return await this.start();
    } catch (error) {
      logger.error('shimmy', 'Failed to restart Shimmy', { error: error?.toString() });
      return false;
    }
  }

  async executeCommand(command: string, args: string[] = []): Promise<string> {
    try {
      const fullCommand = `${this.shimmyPath} ${command} ${args.join(' ')}`;
      const { stdout } = await execAsync(fullCommand);
      
      logger.info('shimmy', `Command executed: ${command}`, { args });
      return stdout;
    } catch (error) {
      logger.error('shimmy', `Failed to execute command: ${command}`, { 
        args,
        error: error?.toString() 
      });
      return `Error: ${error?.toString()}`;
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const output = await this.executeCommand('models', ['list']);
      
      // Parse model list output
      const lines = output.split('\n').filter(line => line.trim());
      const models: string[] = [];
      
      for (const line of lines) {
        // Skip headers and empty lines
        if (line.includes('Model') || line.includes('---') || !line.trim()) {
          continue;
        }
        
        // Extract model name (usually first column)
        const modelName = line.trim().split(/\s+/)[0];
        if (modelName) {
          models.push(modelName);
        }
      }
      
      return models;
    } catch (error) {
      logger.error('shimmy', 'Failed to get models', { error: error?.toString() });
      return [];
    }
  }

  async loadModel(modelName: string): Promise<boolean> {
    try {
      await this.executeCommand('model', ['load', modelName]);
      logger.info('shimmy', `Model loaded: ${modelName}`);
      return true;
    } catch (error) {
      logger.error('shimmy', `Failed to load model: ${modelName}`, { error: error?.toString() });
      return false;
    }
  }

  async unloadModel(modelName: string): Promise<boolean> {
    try {
      await this.executeCommand('model', ['unload', modelName]);
      logger.info('shimmy', `Model unloaded: ${modelName}`);
      return true;
    } catch (error) {
      logger.error('shimmy', `Failed to unload model: ${modelName}`, { error: error?.toString() });
      return false;
    }
  }
}