// Browser-compatible mock database implementation
// In production, this would be replaced with a proper server-side SQLite implementation
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Database types (matching the previous Supabase schema)
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string; // For local authentication
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  last_active: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  metadata: string; // JSON string
  user_id?: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'dataset' | 'model' | 'config';
  tags: string; // JSON string array
  created_at: string;
  updated_at: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  created_by?: string;
}

export interface MetricEntry {
  id: string;
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  gpu_usage: number;
  network_inbound: number;
  network_outbound: number;
  inference_rps: number;
  inference_latency: number;
  active_connections: number;
  metadata: string; // JSON string
}

class DatabaseManager {
  private data: {
    users: User[];
    logs: LogEntry[];
    knowledge: KnowledgeItem[];
    metrics: MetricEntry[];
  };
  private static instance: DatabaseManager;

  private constructor() {
    // Initialize in-memory storage for browser compatibility
    this.data = {
      users: [],
      logs: [],
      knowledge: [],
      metrics: []
    };
    
    this.loadFromLocalStorage();
    this.seedDefaultData();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private loadFromLocalStorage() {
    try {
      const storedData = localStorage.getItem('shimmy-serve-database');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        this.data = { ...this.data, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load data from localStorage:', error);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem('shimmy-serve-database', JSON.stringify(this.data));
    } catch (error) {
      console.warn('Failed to save data to localStorage:', error);
    }
  }

  private seedDefaultData() {
    // Check if we already have data
    if (this.data.users.length === 0) {
      // Initialize with temporary users - will be replaced with real hashed passwords
      this.initializeDefaultUsers();
      this.seedSampleData();
    }
  }

  // Initialize default users with real password hashes
  public async initializeDefaultUsers() {
    // Check if users already exist or have real password hashes
    const existingAdmin = this.data.users.find(u => u.email === 'admin@example.com');
    const existingDemo = this.data.users.find(u => u.email === 'demo@example.com');
    
    // Only recreate if users don't exist or have dummy hashes
    if (!existingAdmin || existingAdmin.password_hash.includes('dummy')) {
      const adminId = existingAdmin?.id || uuidv4();
      const now = new Date().toISOString();
      
      // Create real password hash for admin (password: "admin123")
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      
      const adminUser: User = {
        id: adminId,
        username: 'admin',
        email: 'admin@example.com',
        password_hash: adminPasswordHash,
        role: 'admin',
        status: 'active',
        created_at: existingAdmin?.created_at || now,
        updated_at: now,
        last_active: existingAdmin?.last_active || now
      };
      
      // Replace or add admin user
      const adminIndex = this.data.users.findIndex(u => u.email === 'admin@example.com');
      if (adminIndex >= 0) {
        this.data.users[adminIndex] = adminUser;
      } else {
        this.data.users.push(adminUser);
      }
    }

    if (!existingDemo || existingDemo.password_hash.includes('dummy')) {
      const userId = existingDemo?.id || uuidv4();
      const now = new Date().toISOString();
      
      // Create real password hash for demo user (password: "demo123")
      const demoPasswordHash = await bcrypt.hash('demo123', 10);
      
      const demoUser: User = {
        id: userId,
        username: 'demouser',
        email: 'demo@example.com',
        password_hash: demoPasswordHash,
        role: 'user',
        status: 'active',
        created_at: existingDemo?.created_at || now,
        updated_at: now,
        last_active: existingDemo?.last_active || now
      };
      
      // Replace or add demo user
      const demoIndex = this.data.users.findIndex(u => u.email === 'demo@example.com');
      if (demoIndex >= 0) {
        this.data.users[demoIndex] = demoUser;
      } else {
        this.data.users.push(demoUser);
      }
    }

    this.saveToLocalStorage();
  }

  private seedSampleData() {
    const adminUser = this.data.users.find(u => u.email === 'admin@example.com');
    const adminId = adminUser?.id || uuidv4();
    const now = new Date().toISOString();

    // Only seed if knowledge items don't exist
    if (this.data.knowledge.length === 0) {
      // Create sample knowledge items
      const knowledgeItems = [
        {
          title: 'Getting Started Guide',
          content: 'Welcome to ShimmyServe AI! This guide will help you get started with the platform...',
          type: 'document' as const,
          tags: '["guide", "onboarding", "documentation"]'
        },
        {
          title: 'Model Configuration',
          content: 'Configuration settings for AI inference models...',
          type: 'config' as const,
          tags: '["configuration", "models", "settings"]'
        },
        {
          title: 'Training Dataset',
          content: 'Sample training dataset for model fine-tuning...',
          type: 'dataset' as const,
          tags: '["training", "data", "ml"]'
        }
      ];

      knowledgeItems.forEach(item => {
        const knowledgeItem: KnowledgeItem = {
          id: uuidv4(),
          title: item.title,
          content: item.content,
          type: item.type,
          tags: item.tags,
          created_at: now,
          updated_at: now,
          size: item.content.length,
          status: 'ready',
          created_by: adminId
        };
        this.data.knowledge.push(knowledgeItem);
      });
    }

    // Only seed if log entries don't exist
    if (this.data.logs.length === 0) {
      // Create sample log entries
      const logEntries = [
        { level: 'info' as const, category: 'system', message: 'ShimmyServe AI started successfully' },
        { level: 'info' as const, category: 'auth', message: 'User authentication configured' },
        { level: 'warn' as const, category: 'performance', message: 'High memory usage detected' },
        { level: 'info' as const, category: 'inference', message: 'Model loaded and ready for inference' },
        { level: 'error' as const, category: 'network', message: 'Connection timeout to external service' }
      ];

      logEntries.forEach(entry => {
        const logEntry: LogEntry = {
          id: uuidv4(),
          timestamp: now,
          level: entry.level,
          category: entry.category,
          message: entry.message,
          metadata: '{}',
          user_id: adminId
        };
        this.data.logs.push(logEntry);
      });
    }

    this.saveToLocalStorage();
    console.log('✅ Mock database initialized with sample data');
  }

  // User operations
  public getUsers(): User[] {
    return [...this.data.users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getUserById(id: string): User | null {
    return this.data.users.find(user => user.id === id) || null;
  }

  public getUserByEmail(email: string): User | null {
    return this.data.users.find(user => user.email === email) || null;
  }

  public createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const newUser: User = {
      id,
      username: userData.username,
      email: userData.email,
      password_hash: userData.password_hash,
      role: userData.role,
      status: userData.status,
      created_at: now,
      updated_at: now,
      last_active: userData.last_active
    };

    this.data.users.push(newUser);
    this.saveToLocalStorage();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): void {
    const userIndex = this.data.users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      this.data.users[userIndex] = {
        ...this.data.users[userIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.saveToLocalStorage();
    }
  }

  public deleteUser(id: string): void {
    this.data.users = this.data.users.filter(user => user.id !== id);
    this.saveToLocalStorage();
  }

  // Knowledge operations
  public getKnowledgeItems(): KnowledgeItem[] {
    return [...this.data.knowledge].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public createKnowledgeItem(data: Omit<KnowledgeItem, 'id' | 'created_at' | 'updated_at'>): KnowledgeItem {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const newItem: KnowledgeItem = {
      id,
      title: data.title,
      content: data.content,
      type: data.type,
      tags: data.tags,
      size: data.size,
      status: data.status,
      created_by: data.created_by,
      created_at: now,
      updated_at: now
    };

    this.data.knowledge.push(newItem);
    this.saveToLocalStorage();
    return newItem;
  }

  public updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>): void {
    const itemIndex = this.data.knowledge.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
      this.data.knowledge[itemIndex] = {
        ...this.data.knowledge[itemIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.saveToLocalStorage();
    }
  }

  public deleteKnowledgeItem(id: string): void {
    this.data.knowledge = this.data.knowledge.filter(item => item.id !== id);
    this.saveToLocalStorage();
  }

  // Log operations
  public getLogs(limit = 100): LogEntry[] {
    return [...this.data.logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public createLog(data: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const newLog: LogEntry = {
      id,
      timestamp,
      level: data.level,
      category: data.category,
      message: data.message,
      metadata: data.metadata || '{}',
      user_id: data.user_id
    };

    this.data.logs.push(newLog);
    this.saveToLocalStorage();
    return newLog;
  }

  // Metrics operations
  public getMetrics(limit = 100): MetricEntry[] {
    return [...this.data.metrics]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public createMetric(data: Omit<MetricEntry, 'id' | 'timestamp'>): MetricEntry {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const newMetric: MetricEntry = {
      id,
      timestamp,
      cpu_usage: data.cpu_usage,
      memory_usage: data.memory_usage,
      gpu_usage: data.gpu_usage,
      network_inbound: data.network_inbound,
      network_outbound: data.network_outbound,
      inference_rps: data.inference_rps,
      inference_latency: data.inference_latency,
      active_connections: data.active_connections,
      metadata: data.metadata || '{}'
    };

    this.data.metrics.push(newMetric);
    this.saveToLocalStorage();
    return newMetric;
  }

  public close(): void {
    // For in-memory database, this is a no-op
    // In production, this would close the actual database connection
  }
}

// Export the singleton instance
export const database = DatabaseManager.getInstance();

// Note: This replaces the SQLite implementation with a browser-compatible
// in-memory database that persists data to localStorage. In production,
// this should be replaced with a proper server-side database implementation.