import sqlite3 from 'sqlite3';
import { logger } from '../utils/logger';
import path from 'path';

export interface LogEntry {
  id?: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  metadata?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  last_active: string;
  status: string;
}

export interface SystemMetric {
  id?: number;
  timestamp: string;
  metric_type: string;
  value: number;
  metadata?: string;
}

export class Database {
  private static instance: Database;
  private db: sqlite3.Database | null = null;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async initialize(): Promise<void> {
    const dbPath = path.join(process.cwd(), 'data', 'shimmy.db');
    
    this.db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        logger.error('database', 'Failed to open database', { error: err.message });
        throw err;
      }
      logger.info('database', `Database opened: ${dbPath}`);
      
      this.createTables();
      await this.seedDefaultData();
    });
  }

  private createTables(): void {
    if (!this.db) return;

    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        level TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS system_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL,
        metadata TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS configurations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    tables.forEach((sql, index) => {
      this.db!.run(sql, (err) => {
        if (err) {
          logger.error('database', `Failed to create table ${index + 1}`, { error: err.message });
        } else {
          logger.debug('database', `Table ${index + 1} created or verified`);
        }
      });
    });
  }

  private async seedDefaultData(): Promise<void> {
    if (!this.db) return;

    // Check if users exist
    this.db.get('SELECT COUNT(*) as count FROM users', async (err, row: any) => {
      if (err) {
        logger.error('database', 'Failed to check users table', { error: err.message });
        return;
      }

      if (row.count === 0) {
        // Insert default users (passwords will be hashed by auth service)
        const bcrypt = require('bcrypt');
        const saltRounds = 10;

        const defaultUsers = [
          {
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin123456',
            role: 'admin'
          },
          {
            username: 'demo',
            email: 'demo@example.com',
            password: 'demo123456',
            role: 'user'
          }
        ];

        for (const user of defaultUsers) {
          try {
            const hashedPassword = await bcrypt.hash(user.password, saltRounds);
            await new Promise<void>((resolve, reject) => {
              this.db!.run(
                'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [user.username, user.email, hashedPassword, user.role],
                (err) => {
                  if (err) {
                    logger.error('database', `Failed to create user ${user.username}`, { error: err.message });
                    reject(err);
                  } else {
                    logger.info('database', `Default user created: ${user.username}`);
                    resolve();
                  }
                }
              );
            });
          } catch (error) {
            logger.error('database', `Failed to hash password for ${user.username}`, { error: error?.toString() });
          }
        }
      }
    });
  }

  // User operations
  async getUser(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row: User) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  async getUserById(id: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err, row: User) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  async updateUserLogin(userId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [userId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async createUser(userData: {
    email: string;
    username: string;
    password_hash: string;
    role: string;
  }): Promise<User> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const { email, username, password_hash, role } = userData;
      const db = this.db;
      
      db.run(
        `INSERT INTO users (email, username, password_hash, role, status, created_at, updated_at, last_active) 
         VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'), datetime('now'))`,
        [email, username, password_hash, role],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Get the created user
            const userId = this.lastID;
            db.get(
              'SELECT * FROM users WHERE id = ?',
              [userId],
              (err, row: User | undefined) => {
                if (err || !row) {
                  reject(err || new Error('User not found after creation'));
                } else {
                  resolve(row);
                }
              }
            );
          }
        }
      );
    });
  }

  // Log operations
  async addLog(log: Omit<LogEntry, 'id'>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(
        'INSERT INTO logs (timestamp, level, category, message, metadata) VALUES (?, ?, ?, ?, ?)',
        [log.timestamp, log.level, log.category, log.message, log.metadata || null],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getLogs(limit: number = 100, level?: string): Promise<LogEntry[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      let sql = 'SELECT * FROM logs';
      const params: any[] = [];

      if (level && level !== 'all') {
        sql += ' WHERE level = ?';
        params.push(level);
      }

      sql += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      this.db.all(sql, params, (err, rows: LogEntry[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // System metrics operations
  async addMetric(metric: Omit<SystemMetric, 'id'>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(
        'INSERT INTO system_metrics (timestamp, metric_type, value, metadata) VALUES (?, ?, ?, ?)',
        [metric.timestamp, metric.metric_type, metric.value, metric.metadata || null],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getMetrics(metricType?: string, hours: number = 24): Promise<SystemMetric[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      let sql = 'SELECT * FROM system_metrics WHERE timestamp > datetime("now", "-' + hours + ' hours")';
      const params: any[] = [];

      if (metricType) {
        sql += ' AND metric_type = ?';
        params.push(metricType);
      }

      sql += ' ORDER BY timestamp DESC';

      this.db.all(sql, params, (err, rows: SystemMetric[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Configuration operations
  async setConfig(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

      this.db.run(
        'INSERT OR REPLACE INTO configurations (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [key, valueStr],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getConfig(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(
        'SELECT value FROM configurations WHERE key = ?',
        [key],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            if (row) {
              try {
                resolve(JSON.parse(row.value));
              } catch {
                resolve(row.value);
              }
            } else {
              resolve(null);
            }
          }
        }
      );
    });
  }

  close(): void {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          logger.error('database', 'Error closing database', { error: err.message });
        } else {
          logger.info('database', 'Database connection closed');
        }
      });
    }
  }
}