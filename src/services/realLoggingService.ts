// Real logging service that captures actual browser console logs and application events
import { database } from '../lib/database';
import { api } from '../utils/api';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogCategory = 'system' | 'auth' | 'performance' | 'inference' | 'network' | 'ui' | 'api' | 'security';

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  stack?: string;
}

interface LogFilter {
  level?: LogLevel;
  category?: LogCategory;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
}

interface LogStats {
  totalLogs: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<LogCategory, number>;
  recentActivity: Array<{ time: string; count: number }>;
}

class RealLoggingService {
  private static instance: RealLoggingService;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
    debug: typeof console.debug;
  };
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;
  private isCapturing = false;
  private wsConnection: WebSocket | null = null;
  private wsReconnectTimer: NodeJS.Timeout | null = null;
  private wsReconnectAttempts = 0;
  private maxWsReconnectAttempts = 5;
  private useBackendAPI = true;
  private flushTimer: NodeJS.Timeout | null = null;
  private logStreamListeners: Set<(log: LogEntry) => void> = new Set();

  static getInstance(): RealLoggingService {
    if (!RealLoggingService.instance) {
      RealLoggingService.instance = new RealLoggingService();
    }
    return RealLoggingService.instance;
  }

  private constructor() {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console)
    };

    this.initializeConsoleCapture();
    this.initializeErrorCapture();
    this.initializePerformanceCapture();
    this.connectWebSocket();
  }

  private initializeConsoleCapture() {
    // Override console methods to capture logs
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.captureLog('info', 'system', this.formatArgs(args));
    };

    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.captureLog('warn', 'system', this.formatArgs(args));
    };

    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.captureLog('error', 'system', this.formatArgs(args), this.getStackTrace());
    };

    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.captureLog('info', 'system', this.formatArgs(args));
    };

    console.debug = (...args: any[]) => {
      this.originalConsole.debug(...args);
      this.captureLog('debug', 'system', this.formatArgs(args));
    };
  }

  private initializeErrorCapture() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.captureLog('error', 'system', `Unhandled error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog('error', 'system', `Unhandled promise rejection: ${event.reason}`, {
        stack: event.reason?.stack
      });
    });
  }

  private initializePerformanceCapture() {
    // Monitor performance issues
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              if (navEntry.loadEventEnd - navEntry.navigationStart > 3000) {
                this.captureLog('warn', 'performance', 
                  `Slow page load: ${Math.round(navEntry.loadEventEnd - navEntry.navigationStart)}ms`);
              }
            }
            
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              if (resourceEntry.duration > 5000) {
                this.captureLog('warn', 'performance', 
                  `Slow resource load: ${resourceEntry.name} (${Math.round(resourceEntry.duration)}ms)`);
              }
            }
          });
        });

        observer.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (error) {
        this.originalConsole.warn('Performance monitoring not supported:', error);
      }
    }
  }

  private connectWebSocket() {
    try {
      // Close existing connection if any
      if (this.wsConnection) {
        this.wsConnection.close();
      }

      // Clear any existing reconnect timer
      if (this.wsReconnectTimer) {
        clearTimeout(this.wsReconnectTimer);
        this.wsReconnectTimer = null;
      }

      const wsUrl = 'ws://localhost:3001/ws';
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        this.originalConsole.info('WebSocket connection established for log streaming');
        this.wsReconnectAttempts = 0;
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data) as LogEntry;
          // Notify all listeners about the new log
          this.logStreamListeners.forEach(listener => listener(log));
        } catch (error) {
          this.originalConsole.error('Failed to parse WebSocket log message:', error);
        }
      };

      this.wsConnection.onerror = (error) => {
        this.originalConsole.error('WebSocket error:', error);
      };

      this.wsConnection.onclose = () => {
        this.originalConsole.info('WebSocket connection closed');
        this.wsConnection = null;
        
        // Attempt to reconnect if not exceeded max attempts
        if (this.wsReconnectAttempts < this.maxWsReconnectAttempts) {
          this.wsReconnectTimer = setTimeout(() => {
            this.wsReconnectAttempts++;
            this.connectWebSocket();
          }, 3000 * Math.pow(2, this.wsReconnectAttempts)); // Exponential backoff
        }
      };
    } catch (error) {
      this.originalConsole.error('Failed to establish WebSocket connection:', error);
    }
  }

  private formatArgs(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  private getStackTrace(): string {
    const error = new Error();
    return error.stack || '';
  }

  private async captureLog(level: LogLevel, category: LogCategory, message: string, metadata?: any) {
    if (!this.isCapturing) return;

    const logEntry: LogEntry = {
      level,
      category,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      stack: metadata?.stack
    };

    // Add to buffer
    this.logBuffer.push(logEntry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }

    // Send to backend immediately for important logs
    if (this.useBackendAPI && (level === 'error' || level === 'warn')) {
      await this.sendLogToBackend(logEntry);
    }
  }

  private async sendLogToBackend(log: LogEntry): Promise<void> {
    try {
      await api.post('/logs', log);
    } catch (error) {
      // Fall back to local storage if backend is unavailable
      this.originalConsole.warn('Failed to send log to backend, falling back to localStorage:', error);
      this.flushToLocalStorage([log]);
    }
  }

  // Public API for application logging
  public async log(level: LogLevel, category: LogCategory, message: string, metadata?: Record<string, any>) {
    await this.captureLog(level, category, message, metadata);
    
    // Also log to original console for debugging
    switch (level) {
      case 'error':
        this.originalConsole.error(`[${category}] ${message}`, metadata);
        break;
      case 'warn':
        this.originalConsole.warn(`[${category}] ${message}`, metadata);
        break;
      case 'debug':
        this.originalConsole.debug(`[${category}] ${message}`, metadata);
        break;
      default:
        this.originalConsole.info(`[${category}] ${message}`, metadata);
    }
  }

  // Convenience methods
  public info(category: LogCategory, message: string, metadata?: Record<string, any>) {
    return this.log('info', category, message, metadata);
  }

  public warn(category: LogCategory, message: string, metadata?: Record<string, any>) {
    return this.log('warn', category, message, metadata);
  }

  public error(category: LogCategory, message: string, metadata?: Record<string, any>) {
    return this.log('error', category, message, metadata);
  }

  public debug(category: LogCategory, message: string, metadata?: Record<string, any>) {
    return this.log('debug', category, message, metadata);
  }

  // System event logging
  public logAuthEvent(event: string, success: boolean, userId?: string) {
    return this.log(success ? 'info' : 'warn', 'auth', event, { userId, success });
  }

  public logPerformanceEvent(metric: string, value: number, threshold?: number) {
    const level = threshold && value > threshold ? 'warn' : 'info';
    return this.log(level, 'performance', `${metric}: ${value}`, { metric, value, threshold });
  }

  public logUIEvent(action: string, component: string, metadata?: Record<string, any>) {
    return this.log('debug', 'ui', `${component}: ${action}`, metadata);
  }

  public logAPIEvent(endpoint: string, method: string, status: number, duration: number) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    return this.log(level, 'api', `${method} ${endpoint} - ${status}`, { method, endpoint, status, duration });
  }

  // Control methods
  public startCapturing() {
    this.isCapturing = true;
    this.log('info', 'system', 'Real logging service started');
    this.startAutoFlush();
  }

  public stopCapturing() {
    this.isCapturing = false;
    this.log('info', 'system', 'Real logging service stopped');
    this.stopAutoFlush();
  }

  // Get logs from backend
  public async getLogs(filter?: LogFilter): Promise<LogEntry[]> {
    try {
      if (this.useBackendAPI) {
        const response = await api.get<{ logs: LogEntry[] }>('/logs', { 
          headers: {
            'Content-Type': 'application/json'
          }
        });
        return response.logs || [];
      }
    } catch (error) {
      this.originalConsole.warn('Failed to fetch logs from backend, using local buffer:', error);
    }
    
    // Fall back to local buffer
    let logs = this.getRecentLogs(filter?.limit || 100);
    
    if (filter) {
      logs = this.filterLogs(logs, filter);
    }
    
    return logs;
  }

  // Search logs
  public async searchLogs(query: string): Promise<LogEntry[]> {
    try {
      if (this.useBackendAPI) {
        const response = await api.get<{ logs: LogEntry[] }>(`/logs/search?query=${encodeURIComponent(query)}`);
        return response.logs || [];
      }
    } catch (error) {
      this.originalConsole.warn('Failed to search logs from backend, searching local buffer:', error);
    }
    
    // Fall back to local search
    return this.logBuffer.filter(log => 
      log.message.toLowerCase().includes(query.toLowerCase()) ||
      JSON.stringify(log.metadata || {}).toLowerCase().includes(query.toLowerCase())
    );
  }

  // Get log statistics
  public async getLogStats(): Promise<LogStats> {
    try {
      if (this.useBackendAPI) {
        return await api.get<LogStats>('/logs/stats');
      }
    } catch (error) {
      this.originalConsole.warn('Failed to fetch log stats from backend, calculating from local buffer:', error);
    }
    
    // Fall back to local calculation
    return this.calculateLocalStats();
  }

  // Export logs
  public async exportLogs(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      if (this.useBackendAPI) {
        const response = await api.get<{ data: string }>(`/logs/export?format=${format}`);
        return response.data;
      }
    } catch (error) {
      this.originalConsole.warn('Failed to export logs from backend, exporting local buffer:', error);
    }
    
    // Fall back to local export
    if (format === 'json') {
      return JSON.stringify(this.logBuffer, null, 2);
    } else {
      return this.convertToCSV(this.logBuffer);
    }
  }

  // Subscribe to real-time log stream
  public subscribeToLogStream(callback: (log: LogEntry) => void): () => void {
    this.logStreamListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.logStreamListeners.delete(callback);
    };
  }

  // Get current logs from buffer
  public getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  // Flush logs to backend
  public async flushToBackend(logs?: LogEntry[]) {
    const logsToFlush = logs || this.logBuffer.slice();
    
    if (!this.useBackendAPI || logsToFlush.length === 0) {
      return;
    }

    try {
      // Send logs in batches to avoid large payloads
      const batchSize = 100;
      for (let i = 0; i < logsToFlush.length; i += batchSize) {
        const batch = logsToFlush.slice(i, i + batchSize);
        await api.post('/logs/batch', { logs: batch });
      }
      
      // Clear buffer after successful flush
      if (!logs) {
        this.logBuffer = [];
      }
    } catch (error) {
      this.originalConsole.error('Failed to flush logs to backend, keeping in buffer:', error);
      // Fall back to localStorage
      this.flushToLocalStorage(logsToFlush);
    }
  }

  // Flush logs to localStorage as fallback
  private flushToLocalStorage(logs: LogEntry[]) {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      const updatedLogs = [...existingLogs, ...logs].slice(-this.maxBufferSize);
      localStorage.setItem('app_logs', JSON.stringify(updatedLogs));
    } catch (error) {
      this.originalConsole.error('Failed to save logs to localStorage:', error);
    }
  }

  // Flush logs to database (deprecated, kept for backward compatibility)
  public flushToDatabase(logs?: LogEntry[]) {
    const logsToFlush = logs || this.logBuffer.slice();
    
    logsToFlush.forEach(log => {
      try {
        database.createLog({
          level: log.level,
          category: log.category,
          message: log.message,
          metadata: JSON.stringify(log.metadata || {}),
          user_id: undefined // Will be set by database if user is available
        });
      } catch (error) {
        this.originalConsole.error('Failed to flush log to database:', error);
      }
    });

    // Clear buffer after flushing
    if (!logs) {
      this.logBuffer = [];
    }
  }

  // Auto-flush logs periodically
  public startAutoFlush(intervalMs: number = 30000) {
    this.stopAutoFlush(); // Clear any existing timer
    
    this.flushTimer = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flushToBackend();
      }
    }, intervalMs);
  }

  // Stop auto-flush
  public stopAutoFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // Enable/disable backend API usage
  public setUseBackendAPI(use: boolean) {
    this.useBackendAPI = use;
    if (use) {
      this.connectWebSocket();
    } else if (this.wsConnection) {
      this.wsConnection.close();
    }
  }

  // Restore original console methods
  public restoreConsole() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  // Helper methods
  private filterLogs(logs: LogEntry[], filter: LogFilter): LogEntry[] {
    return logs.filter(log => {
      if (filter.level && log.level !== filter.level) return false;
      if (filter.category && log.category !== filter.category) return false;
      if (filter.startDate && new Date(log.timestamp!) < new Date(filter.startDate)) return false;
      if (filter.endDate && new Date(log.timestamp!) > new Date(filter.endDate)) return false;
      if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    });
  }

  private calculateLocalStats(): LogStats {
    const stats: LogStats = {
      totalLogs: this.logBuffer.length,
      byLevel: { info: 0, warn: 0, error: 0, debug: 0 },
      byCategory: { system: 0, auth: 0, performance: 0, inference: 0, network: 0, ui: 0, api: 0, security: 0 },
      recentActivity: []
    };

    // Count by level and category
    this.logBuffer.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byCategory[log.category]++;
    });

    // Calculate recent activity (last 24 hours, hourly buckets)
    const now = new Date();
    const hourlyBuckets: Record<string, number> = {};
    
    this.logBuffer.forEach(log => {
      if (log.timestamp) {
        const logDate = new Date(log.timestamp);
        const hourDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60));
        
        if (hourDiff < 24) {
          const bucketTime = new Date(logDate);
          bucketTime.setMinutes(0, 0, 0);
          const bucketKey = bucketTime.toISOString();
          
          hourlyBuckets[bucketKey] = (hourlyBuckets[bucketKey] || 0) + 1;
        }
      }
    });

    stats.recentActivity = Object.entries(hourlyBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, count]) => ({ time, count }));

    return stats;
  }

  private convertToCSV(logs: LogEntry[]): string {
    const headers = ['timestamp', 'level', 'category', 'message', 'metadata'];
    const rows = logs.map(log => [
      log.timestamp || '',
      log.level,
      log.category,
      log.message,
      JSON.stringify(log.metadata || {})
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }
}

export const realLoggingService = RealLoggingService.getInstance();
export type { LogLevel, LogCategory, LogEntry, LogFilter, LogStats };