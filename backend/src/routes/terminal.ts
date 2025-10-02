import express from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import { authenticateToken, optionalAuth } from './auth';
import { SystemMonitor } from '../services/systemMonitor';
import { ShimmyService } from '../services/shimmy';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const execPromise = promisify(exec);
const systemMonitor = new SystemMonitor();
const shimmyService = new ShimmyService();

// Safe command whitelist for basic system commands
const SAFE_COMMANDS = [
  'ls', 'pwd', 'whoami', 'date', 'uptime', 'hostname',
  'df', 'free', 'ps', 'top', 'cat', 'head', 'tail',
  'which', 'env', 'echo', 'uname', 'id', 'groups'
];

// Check if a command is safe to execute
function isSafeCommand(command: string): boolean {
  const cmd = command.trim().split(' ')[0];
  return SAFE_COMMANDS.includes(cmd);
}

// Execute a terminal command
router.post('/execute', optionalAuth, async (req, res) => {
  try {
    const { command, isAuthenticated } = req.body;
    
    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Command is required'
      });
    }

    logger.info('terminal', `Executing command: ${command}`);
    
    // Determine if this is a shimmer command
    if (command.startsWith('shimmer ')) {
      const shimmerCmd = command.replace('shimmer ', '');
      const output = await executeShimmerCommand(shimmerCmd);
      
      return res.json({
        success: true,
        data: {
          command,
          output,
          isShimmerCommand: true,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Handle system commands
    const output = await executeSystemCommand(command, isAuthenticated);
    
    res.json({
      success: true,
      data: {
        command,
        output,
        isShimmerCommand: false,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('terminal', 'Failed to execute command', { error: error?.toString() });
    res.status(500).json({
      success: false,
      error: 'Failed to execute command',
      details: error?.toString()
    });
  }
});

// Execute Shimmer commands
async function executeShimmerCommand(cmd: string): Promise<string> {
  const [command, ...args] = cmd.split(' ');

  switch (command.toLowerCase()) {
    case 'help':
      return getShimmerHelp(args[0]);

    case 'status':
      return await getShimmerStatus();

    case 'analyze':
      return await runSystemAnalysis();

    case 'optimize':
      return await runOptimization();

    case 'metrics':
      return await getSystemMetrics();

    case 'logs':
      return await getShimmerLogs(args[0] || 'info', parseInt(args[1]) || 50);

    case 'config':
      return await getShimmerConfig();

    case 'restart':
      return await controlShimmerService('restart');

    case 'stop':
      return await controlShimmerService('stop');

    case 'start':
      return await controlShimmerService('start');

    case 'diagnose':
      return await runDiagnostics();

    case 'performance':
      return await getPerformanceReport();

    case 'models':
      return await getModelsList();

    default:
      return `Unknown shimmer command: ${command}\nType 'shimmer help' for available commands.`;
  }
}

// Execute system commands
async function executeSystemCommand(command: string, isAuthenticated: boolean): Promise<string> {
  const cmd = command.trim();
  
  // Handle special commands that don't need execution
  switch (cmd) {
    case 'clear':
      return ''; // Special case - will be handled by terminal component
    
    case 'help':
      return getSystemHelp();
  }
  
  // For unauthenticated users, only allow safe commands
  if (!isAuthenticated && !isSafeCommand(cmd)) {
    return `Permission denied: '${cmd}' requires authentication.\nLogin to access all commands.`;
  }
  
  // Execute the command
  try {
    const { stdout, stderr } = await execPromise(cmd, {
      timeout: 10000, // 10 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    return stderr ? `${stdout}\n${stderr}` : stdout;
  } catch (error: any) {
    if (error.code === 'ENOENT' || error.message.includes('not found')) {
      return `bash: ${cmd.split(' ')[0]}: command not found`;
    }
    return `Error executing command: ${error.message}`;
  }
}

// Get Shimmer help
function getShimmerHelp(topic?: string): string {
  if (topic) {
    const helpTopics: Record<string, string> = {
      'status': `shimmer status - Show comprehensive system status
      
Displays real-time information including:
- Shimmer service status and version
- System resource usage (CPU, memory, disk)
- Active models and connections
- Performance metrics`,

      'analyze': `shimmer analyze - Run comprehensive system analysis
      
Performs:
- CPU and memory usage analysis
- Disk I/O performance check
- Network connectivity status
- Service health verification
- Resource optimization recommendations`,

      'metrics': `shimmer metrics - Display real-time system metrics
      
Shows:
- CPU usage and load averages
- Memory usage and availability
- Disk usage and I/O stats
- Network traffic and connections
- Process information`,

      'logs': `shimmer logs [level] [lines] - Show system logs
      
Levels: info, warn, error, debug, all
Lines: Number of log lines to display (default: 50)
      
Displays logs from Shimmer service and system events`
    };

    return helpTopics[topic] || `No help available for: ${topic}`;
  }

  return `Shimmer AI Agent Commands:

Core Commands:
  status          - Show Shimmer status and system info
  analyze         - Run comprehensive system analysis
  optimize        - Apply performance optimizations
  metrics         - Display real-time system metrics
  logs [level]    - Show system logs (info, warn, error, debug)
  
System Control:
  start           - Start Shimmer service
  stop            - Stop Shimmer service
  restart         - Restart Shimmer service
  config          - Show current configuration
  
Analysis & Diagnostics:
  diagnose        - Run system diagnostics
  performance     - Get performance report
  models          - List available AI models
  
Type 'shimmer help <command>' for detailed information.`;
}

// Get system help
function getSystemHelp(): string {
  return `Available System Commands:

File System:
  ls              - List directory contents
  pwd             - Print working directory
  cat <file>      - Display file contents
  head <file>     - Show first lines of file
  tail <file>     - Show last lines of file

System Info:
  whoami          - Display current user
  hostname        - Display system hostname
  date            - Show current date and time
  uptime          - Show system uptime
  uname -a        - Display system information

Resources:
  ps              - Show running processes
  top             - Display process activity
  df -h           - Show disk usage
  free -h         - Display memory usage
  
Environment:
  env             - Display environment variables
  which <cmd>     - Locate command binary
  
Type 'shimmer help' for AI assistant commands.`;
}

// Get Shimmer status
async function getShimmerStatus(): Promise<string> {
  try {
    const status = await shimmyService.getStatus();
    const processInfo = await shimmyService.getProcessInfo();
    const metrics = await systemMonitor.getSystemMetrics();
    
    return `Shimmer AI Agent Status:
Version: ${status.version || 'Unknown'}
Status: ${processInfo.running ? 'Active' : 'Inactive'}
PID: ${processInfo.pid || 'N/A'}
Uptime: ${processInfo.uptime || 'N/A'}
Memory Usage: ${metrics.memory.usage_percent.toFixed(1)}% (${formatBytes(metrics.memory.used)}/${formatBytes(metrics.memory.total)})
CPU Usage: ${metrics.cpu.usage.toFixed(1)}%
Disk Usage: ${metrics.disk.usage_percent.toFixed(1)}% (${formatBytes(metrics.disk.used)}/${formatBytes(metrics.disk.total)})
Active Connections: ${processInfo.connections || 0}
Network Status: ${metrics.network.interfaces.length > 0 ? 'Connected' : 'Disconnected'}`;
  } catch (error) {
    return `Error getting Shimmer status: ${error}`;
  }
}

// Run system analysis
async function runSystemAnalysis(): Promise<string> {
  try {
    const metrics = await systemMonitor.getSystemMetrics();
    const analysis = [];
    
    analysis.push('🔍 Running Comprehensive System Analysis...\n');

    // CPU Analysis
    if (metrics.cpu.usage < 50) {
      analysis.push(`CPU Analysis: ✓ Normal operation (${metrics.cpu.usage.toFixed(1)}%)`);
    } else if (metrics.cpu.usage < 80) {
      analysis.push(`CPU Analysis: ⚠️ Moderate load detected (${metrics.cpu.usage.toFixed(1)}%)`);
    } else {
      analysis.push(`CPU Analysis: 🚨 High utilization detected (${metrics.cpu.usage.toFixed(1)}%)`);
    }

    // Memory Analysis
    analysis.push(`Memory Analysis: ${metrics.memory.usage_percent < 70 ? '✓' : '⚠️'} ${formatBytes(metrics.memory.used)}/${formatBytes(metrics.memory.total)} used (${metrics.memory.usage_percent.toFixed(1)}%)`);

    // Disk Analysis
    analysis.push(`Disk Analysis: ${metrics.disk.usage_percent < 80 ? '✓' : '⚠️'} ${formatBytes(metrics.disk.used)}/${formatBytes(metrics.disk.total)} used (${metrics.disk.usage_percent.toFixed(1)}%)`);

    // Network Analysis
    const networkStatus = metrics.network.interfaces.length > 0 ? 'Connected' : 'Disconnected';
    analysis.push(`Network Analysis: ${networkStatus === 'Connected' ? '✓' : '❌'} ${networkStatus}`);

    analysis.push('\nRecommendations:');
    if (metrics.cpu.usage > 70) analysis.push('- Consider reducing CPU-intensive operations');
    if (metrics.memory.usage_percent > 80) analysis.push('- Memory usage is high, consider optimizing processes');
    if (metrics.disk.usage_percent > 80) analysis.push('- Disk usage is high, consider cleaning up files');
    
    if (analysis[analysis.length - 1] === 'Recommendations:') {
      analysis.push('- System operating within normal parameters');
    }

    return analysis.join('\n');
  } catch (error) {
    return `Error running system analysis: ${error}`;
  }
}

// Run optimization
async function runOptimization(): Promise<string> {
  const results = [];
  results.push('🚀 Applying Performance Optimizations...\n');

  try {
    // Clear system caches (if we have permission)
    if (os.platform() === 'linux') {
      try {
        await execPromise('sync && echo 3 > /proc/sys/vm/drop_caches', { shell: '/bin/sh' });
        results.push('✓ System caches cleared');
      } catch {
        results.push('⚠️ Unable to clear system caches (requires root)');
      }
    }

    // Clean up temp files
    const tempDir = os.tmpdir();
    const tempFiles = await fs.readdir(tempDir);
    let cleanedCount = 0;
    
    for (const file of tempFiles) {
      try {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        // Remove files older than 24 hours
        if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
          await fs.unlink(filePath).catch(() => {});
          cleanedCount++;
        }
      } catch {
        // Ignore errors
      }
    }
    
    if (cleanedCount > 0) {
      results.push(`✓ Cleaned ${cleanedCount} temporary files`);
    }

    results.push('✓ Optimization completed successfully');
  } catch (error) {
    results.push(`⚠️ Some optimizations failed: ${error}`);
  }

  return results.join('\n');
}

// Get system metrics
async function getSystemMetrics(): Promise<string> {
  try {
    const metrics = await systemMonitor.getSystemMetrics();
    
    const createBar = (percentage: number, width: number = 20): string => {
      const filled = Math.floor((percentage / 100) * width);
      return '█'.repeat(filled) + '░'.repeat(width - filled);
    };

    return `📊 Real-Time System Metrics:

CPU: ${createBar(metrics.cpu.usage)} ${metrics.cpu.usage.toFixed(1)}%
  Cores: ${metrics.cpu.cores}
  Load Average: ${metrics.cpu.loadAverage.join(', ')}

Memory: ${createBar(metrics.memory.usage_percent)} ${metrics.memory.usage_percent.toFixed(1)}%
  Used: ${formatBytes(metrics.memory.used)}
  Total: ${formatBytes(metrics.memory.total)}
  Available: ${formatBytes(metrics.memory.available)}

Disk: ${createBar(metrics.disk.usage_percent)} ${metrics.disk.usage_percent.toFixed(1)}%
  Used: ${formatBytes(metrics.disk.used)}
  Total: ${formatBytes(metrics.disk.total)}
  Free: ${formatBytes(metrics.disk.free)}

Network:
  Active Connections: ${metrics.network.connections}
  Interfaces: ${metrics.network.interfaces.map(i => i.name).join(', ')}

System:
  Hostname: ${metrics.system.hostname}
  Platform: ${metrics.system.platform}
  Uptime: ${formatUptime(metrics.system.uptime)}`;
  } catch (error) {
    return `Error getting system metrics: ${error}`;
  }
}

// Get Shimmer logs
async function getShimmerLogs(level: string, lines: number): Promise<string> {
  try {
    const logs = await shimmyService.getLogs(lines);
    const filteredLogs = level === 'all' ? logs : logs.filter(log => 
      log.level.toLowerCase().includes(level.toLowerCase())
    );
    
    if (filteredLogs.length === 0) {
      return `No ${level} logs found.`;
    }

    return `📋 Shimmer Logs (${level}):\n\n${filteredLogs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n')}`;
  } catch (error) {
    return `Error getting logs: ${error}`;
  }
}

// Get Shimmer configuration
async function getShimmerConfig(): Promise<string> {
  try {
    const config = await shimmyService.getConfig();
    
    return `📋 Shimmer Configuration:

${JSON.stringify(config, null, 2)}`;
  } catch (error) {
    return `Error getting configuration: ${error}`;
  }
}

// Control Shimmer service
async function controlShimmerService(action: string): Promise<string> {
  try {
    let success = false;
    
    switch (action) {
      case 'start':
        success = await shimmyService.start();
        return success ? '▶️ Shimmer service started successfully' : '❌ Failed to start Shimmer service';
      
      case 'stop':
        success = await shimmyService.stop();
        return success ? '⏹️ Shimmer service stopped successfully' : '❌ Failed to stop Shimmer service';
      
      case 'restart':
        success = await shimmyService.restart();
        return success ? '🔄 Shimmer service restarted successfully' : '❌ Failed to restart Shimmer service';
      
      default:
        return `Unknown service action: ${action}`;
    }
  } catch (error) {
    return `Error controlling Shimmer service: ${error}`;
  }
}

// Run diagnostics
async function runDiagnostics(): Promise<string> {
  try {
    const metrics = await systemMonitor.getSystemMetrics();
    const shimmerStatus = await shimmyService.getStatus();
    const processInfo = await shimmyService.getProcessInfo();
    
    const diagnostics = [];
    diagnostics.push('🔧 Running System Diagnostics...\n');
    
    // Check Shimmer service
    diagnostics.push(`Shimmer Service: ${processInfo.running ? '✅ Running' : '❌ Not Running'}`);
    
    // Check system resources
    diagnostics.push(`CPU Usage: ${metrics.cpu.usage < 80 ? '✅' : '⚠️'} ${metrics.cpu.usage.toFixed(1)}%`);
    diagnostics.push(`Memory Usage: ${metrics.memory.usage_percent < 80 ? '✅' : '⚠️'} ${metrics.memory.usage_percent.toFixed(1)}%`);
    diagnostics.push(`Disk Usage: ${metrics.disk.usage_percent < 90 ? '✅' : '⚠️'} ${metrics.disk.usage_percent.toFixed(1)}%`);
    
    // Check network
    diagnostics.push(`Network Connectivity: ${metrics.network.interfaces.length > 0 ? '✅ Connected' : '❌ Disconnected'}`);
    
    diagnostics.push('\nDiagnostic Summary:');
    if (processInfo.running && metrics.cpu.usage < 80 && metrics.memory.usage_percent < 80) {
      diagnostics.push('✅ System healthy - All checks passed');
    } else {
      diagnostics.push('⚠️ Issues detected - Review recommendations above');
    }
    
    return diagnostics.join('\n');
  } catch (error) {
    return `Error running diagnostics: ${error}`;
  }
}

// Get performance report
async function getPerformanceReport(): Promise<string> {
  try {
    const performance = await shimmyService.getPerformanceMetrics();
    const metrics = await systemMonitor.getSystemMetrics();
    
    return `📊 Performance Report:

System Performance:
  CPU Usage: ${metrics.cpu.usage.toFixed(1)}%
  Memory Usage: ${metrics.memory.usage_percent.toFixed(1)}%
  Disk I/O: Check disk stats separately

Shimmer Performance:
  Request Rate: ${performance.requests_per_second || 0}/s
  Average Response Time: ${performance.average_response_time || 0}ms
  Active Connections: ${performance.active_connections || 0}
  
Resource Utilization:
  Memory Usage: ${performance.memory_usage || 'N/A'}
  CPU Usage: ${performance.cpu_usage || 0}%
  Inference Queue Size: ${performance.inference_queue_size || 0}`;
  } catch (error) {
    return `Error getting performance report: ${error}`;
  }
}

// Get models list
async function getModelsList(): Promise<string> {
  try {
    const models = await shimmyService.getModels();
    
    if (models.length === 0) {
      return 'No models available';
    }
    
    const modelList = models.map(model => 
      `- ${model}`
    ).join('\n');
    
    return `📦 Available Models:\n\n${modelList}`;
  } catch (error) {
    return `Error getting models: ${error}`;
  }
}

// Helper functions
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '0m';
}

export { router as terminalRoutes };