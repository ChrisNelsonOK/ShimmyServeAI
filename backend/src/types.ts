// Type definitions for the backend

export interface ConfigRule {
  type: 'string' | 'number' | 'boolean' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  enum?: string[];
}

export interface ConfigSchema {
  [key: string]: ConfigRule;
}

export interface User {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_active: string;
}

export interface LogEntry {
  id?: number;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  details?: any;
  user_id?: number;
}

export interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    loadAvg: number[];
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
  gpu?: {
    usage: number;
    memory: {
      used: number;
      total: number;
    };
    temperature: number;
  };
  services: {
    docker: boolean;
    kubernetes: boolean;
    ollama: boolean;
    shimmy: boolean;
  };
}

export interface ServerConfig {
  general: {
    serverName: string;
    port: number;
    maxConnections: number;
    timeout: number;
  };
  inference: {
    modelPath: string;
    batchSize: number;
    contextLength: number;
    temperature: number;
    topP: number;
    threads: number;
  };
  networking: {
    enableMPTCP: boolean;
    maxSubflows: number;
    congestionControl: string;
    bufferSize: number;
  };
  security: {
    enableAuth: boolean;
    tokenExpiry: number;
    rateLimiting: boolean;
    maxRequestsPerMinute: number;
  };
}