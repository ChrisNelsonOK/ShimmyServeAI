import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import { Database } from './database';

const execAsync = promisify(exec);

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    available: number;
    usage_percent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage_percent: number;
  };
  network: {
    interfaces: NetworkInterface[];
    connections: number;
  };
  system: {
    uptime: number;
    platform: string;
    arch: string;
    hostname: string;
    kernel: string;
  };
  timestamp: string;
}

export interface NetworkInterface {
  name: string;
  bytes_sent?: number;
  bytes_recv?: number;
  packets_sent?: number;
  packets_recv?: number;
  errors_in?: number;
  errors_out?: number;
}

export class SystemMonitor {
  private lastCpuMeasurement: any = null;
  private database = Database.getInstance();

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const [cpu, memory, disk, network, system] = await Promise.all([
        this.getCPUMetrics(),
        this.getMemoryMetrics(),
        this.getDiskMetrics(),
        this.getNetworkMetrics(),
        this.getSystemInfo()
      ]);

      const metrics: SystemMetrics = {
        cpu,
        memory,
        disk,
        network,
        system,
        timestamp: new Date().toISOString()
      };

      // Store metrics in database
      await this.storeMetrics(metrics);

      return metrics;
    } catch (error) {
      logger.error('system_monitor', 'Failed to get system metrics', { error: error?.toString() });
      throw error;
    }
  }

  private async getCPUMetrics(): Promise<SystemMetrics['cpu']> {
    try {
      // Get CPU count
      const { stdout: cpuInfo } = await execAsync('sysctl -n hw.ncpu');
      const cores = parseInt(cpuInfo.trim());

      // Get load average
      const { stdout: loadAvg } = await execAsync('uptime | grep -o "load average.*" | cut -d: -f2');
      const loadAverage = loadAvg.trim().split(',').map(val => parseFloat(val.trim()));

      // Get CPU usage (simplified for macOS)
      let usage = 0;
      try {
        const { stdout: topOutput } = await execAsync('top -l 1 | grep "CPU usage"');
        const match = topOutput.match(/(\d+\.?\d*)% user/);
        if (match) {
          usage = parseFloat(match[1]);
        }
      } catch {
        // Fallback to load average based estimation
        usage = Math.min(100, (loadAverage[0] / cores) * 100);
      }

      return {
        usage,
        cores,
        loadAverage
      };
    } catch (error) {
      logger.error('system_monitor', 'Failed to get CPU metrics', { error: error?.toString() });
      return {
        usage: 0,
        cores: 1,
        loadAverage: [0, 0, 0]
      };
    }
  }

  private async getMemoryMetrics(): Promise<SystemMetrics['memory']> {
    try {
      // Get memory info for macOS
      const { stdout: memInfo } = await execAsync('vm_stat');
      const pageSize = 4096; // macOS page size

      const parseValue = (line: string): number => {
        const match = line.match(/(\d+)/);
        return match ? parseInt(match[1]) * pageSize : 0;
      };

      const lines = memInfo.split('\n');
      const free = parseValue(lines.find(line => line.includes('Pages free')) || '');
      const inactive = parseValue(lines.find(line => line.includes('Pages inactive')) || '');
      const wired = parseValue(lines.find(line => line.includes('Pages wired down')) || '');
      const active = parseValue(lines.find(line => line.includes('Pages active')) || '');

      // Get total memory
      const { stdout: totalMem } = await execAsync('sysctl -n hw.memsize');
      const total = parseInt(totalMem.trim());

      const available = free + inactive;
      const used = total - available;
      const usage_percent = (used / total) * 100;

      return {
        total,
        used,
        free,
        available,
        usage_percent
      };
    } catch (error) {
      logger.error('system_monitor', 'Failed to get memory metrics', { error: error?.toString() });
      return {
        total: 0,
        used: 0,
        free: 0,
        available: 0,
        usage_percent: 0
      };
    }
  }

  private async getDiskMetrics(): Promise<SystemMetrics['disk']> {
    try {
      const { stdout: dfOutput } = await execAsync('df -k / | tail -1');
      const fields = dfOutput.trim().split(/\s+/);
      
      const total = parseInt(fields[1]) * 1024; // Convert from KB to bytes
      const used = parseInt(fields[2]) * 1024;
      const free = parseInt(fields[3]) * 1024;
      const usage_percent = parseFloat(fields[4].replace('%', ''));

      return {
        total,
        used,
        free,
        usage_percent
      };
    } catch (error) {
      logger.error('system_monitor', 'Failed to get disk metrics', { error: error?.toString() });
      return {
        total: 0,
        used: 0,
        free: 0,
        usage_percent: 0
      };
    }
  }

  private async getNetworkMetrics(): Promise<SystemMetrics['network']> {
    try {
      // Get network interfaces
      const { stdout: netstat } = await execAsync('netstat -i | grep -v lo0');
      const interfaces: NetworkInterface[] = [];

      const lines = netstat.trim().split('\n').slice(1); // Skip header
      for (const line of lines) {
        const fields = line.trim().split(/\s+/);
        if (fields.length >= 7) {
          interfaces.push({
            name: fields[0],
            packets_recv: parseInt(fields[4]) || 0,
            errors_in: parseInt(fields[5]) || 0,
            packets_sent: parseInt(fields[6]) || 0,
            errors_out: parseInt(fields[7]) || 0
          });
        }
      }

      // Get connection count
      let connections = 0;
      try {
        const { stdout: connCount } = await execAsync('netstat -an | grep ESTABLISHED | wc -l');
        connections = parseInt(connCount.trim());
      } catch {
        connections = 0;
      }

      return {
        interfaces,
        connections
      };
    } catch (error) {
      logger.error('system_monitor', 'Failed to get network metrics', { error: error?.toString() });
      return {
        interfaces: [],
        connections: 0
      };
    }
  }

  private async getSystemInfo(): Promise<SystemMetrics['system']> {
    try {
      const [uptimeResult, unameResult, hostnameResult] = await Promise.allSettled([
        execAsync('uptime | grep -o "up .*" | head -1'),
        execAsync('uname -srv'),
        execAsync('hostname')
      ]);

      let uptime = 0;
      if (uptimeResult.status === 'fulfilled') {
        const uptimeStr = uptimeResult.value.stdout.trim();
        // Parse uptime (simplified)
        const dayMatch = uptimeStr.match(/(\d+) day/);
        const hourMatch = uptimeStr.match(/(\d+):(\d+)/);
        
        if (dayMatch) {
          uptime += parseInt(dayMatch[1]) * 24 * 3600;
        }
        if (hourMatch) {
          uptime += parseInt(hourMatch[1]) * 3600 + parseInt(hourMatch[2]) * 60;
        }
      }

      let kernel = 'unknown';
      if (unameResult.status === 'fulfilled') {
        kernel = unameResult.value.stdout.trim();
      }

      let hostname = 'unknown';
      if (hostnameResult.status === 'fulfilled') {
        hostname = hostnameResult.value.stdout.trim();
      }

      return {
        uptime,
        platform: process.platform,
        arch: process.arch,
        hostname,
        kernel
      };
    } catch (error) {
      logger.error('system_monitor', 'Failed to get system info', { error: error?.toString() });
      return {
        uptime: 0,
        platform: process.platform,
        arch: process.arch,
        hostname: 'unknown',
        kernel: 'unknown'
      };
    }
  }

  private async storeMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      // Store individual metrics in database
      const metricsToStore = [
        { type: 'cpu_usage', value: metrics.cpu.usage },
        { type: 'memory_usage', value: metrics.memory.usage_percent },
        { type: 'disk_usage', value: metrics.disk.usage_percent },
        { type: 'network_connections', value: metrics.network.connections },
        { type: 'load_average_1m', value: metrics.cpu.loadAverage[0] || 0 }
      ];

      for (const metric of metricsToStore) {
        await this.database.addMetric({
          timestamp: metrics.timestamp,
          metric_type: metric.type,
          value: metric.value,
          metadata: JSON.stringify({ hostname: metrics.system.hostname })
        });
      }
    } catch (error) {
      logger.error('system_monitor', 'Failed to store metrics', { error: error?.toString() });
    }
  }

  async getHistoricalMetrics(hours: number = 24): Promise<any[]> {
    try {
      return await this.database.getMetrics(undefined, hours);
    } catch (error) {
      logger.error('system_monitor', 'Failed to get historical metrics', { error: error?.toString() });
      return [];
    }
  }

  async getProcessList(): Promise<any[]> {
    try {
      const { stdout } = await execAsync('ps aux | head -20');
      const lines = stdout.trim().split('\n');
      const header = lines[0];
      const processes = lines.slice(1).map(line => {
        const fields = line.trim().split(/\s+/);
        return {
          user: fields[0],
          pid: parseInt(fields[1]),
          cpu: parseFloat(fields[2]),
          memory: parseFloat(fields[3]),
          command: fields.slice(10).join(' ')
        };
      });

      return processes;
    } catch (error) {
      logger.error('system_monitor', 'Failed to get process list', { error: error?.toString() });
      return [];
    }
  }
}