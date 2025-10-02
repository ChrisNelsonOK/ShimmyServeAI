export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  metadata?: any;
}

class Logger {
  private database: any;
  private logBuffer: LogEntry[] = [];
  private bufferSize = 100;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    // Lazy load database to avoid circular dependencies
    this.database = null;
    this.startBufferFlush();
  }

  private getDatabase() {
    if (!this.database) {
      const { Database } = require('../services/database');
      this.database = Database.getInstance();
    }
    return this.database;
  }

  private startBufferFlush(): void {
    setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
  }

  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const db = this.getDatabase();
      for (const log of logsToFlush) {
        await db.addLog({
          timestamp: log.timestamp,
          level: log.level,
          category: log.category,
          message: log.message,
          metadata: log.metadata ? JSON.stringify(log.metadata) : undefined
        });
      }
    } catch (error) {
      console.error('Failed to flush logs to database:', error);
      // Re-add failed logs to buffer (but limit to prevent infinite growth)
      this.logBuffer.unshift(...logsToFlush.slice(0, this.bufferSize / 2));
    }
  }

  private log(level: LogEntry['level'], category: string, message: string, metadata?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      metadata
    };

    // Always log to console
    const consoleMessage = `[${logEntry.timestamp}] ${level.toUpperCase()} [${category}] ${message}`;
    const consoleMetadata = metadata ? ` ${JSON.stringify(metadata)}` : '';
    
    switch (level) {
      case 'error':
        console.error(consoleMessage + consoleMetadata);
        break;
      case 'warn':
        console.warn(consoleMessage + consoleMetadata);
        break;
      case 'debug':
        console.debug(consoleMessage + consoleMetadata);
        break;
      default:
        console.log(consoleMessage + consoleMetadata);
    }

    // Add to buffer for database persistence
    this.logBuffer.push(logEntry);
    
    // Prevent buffer overflow
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer.shift();
    }
  }

  info(category: string, message: string, metadata?: any): void {
    this.log('info', category, message, metadata);
  }

  warn(category: string, message: string, metadata?: any): void {
    this.log('warn', category, message, metadata);
  }

  error(category: string, message: string, metadata?: any): void {
    this.log('error', category, message, metadata);
  }

  debug(category: string, message: string, metadata?: any): void {
    this.log('debug', category, message, metadata);
  }

  async getLogs(limit: number = 100, level?: string): Promise<LogEntry[]> {
    try {
      // Flush current buffer first
      await this.flushBuffer();
      
      return await this.database.getLogs(limit, level);
    } catch (error) {
      console.error('Failed to get logs from database:', error);
      return [];
    }
  }

  // Method to force flush buffer (useful for graceful shutdown)
  async flush(): Promise<void> {
    await this.flushBuffer();
  }
}

export const logger = new Logger();