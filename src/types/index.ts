export interface SystemMetrics {
  cpu: number;
  memory: number;
  gpu: number;
  network: {
    inbound: number;
    outbound: number;
  };
  inference: {
    requestsPerSecond: number;
    averageLatency: number;
    activeConnections: number;
  };
  disk: {
    usage: number;
    read: number;
    write: number;
  };
  timestamp: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastActive: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'dataset' | 'model' | 'config';
  tags: string[];
  created_at: string;
  updated_at: string;
  size: number;
  status: 'processing' | 'ready' | 'error';
  created_by: string | null;
}

// TerminalCommand type moved to realTerminalService.ts for better integration

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

export interface TestResult {
  id: string;
  component: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  timestamp: Date;
  duration?: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Form validation types
export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'metrics' | 'log' | 'status' | 'error';
  payload: any;
  timestamp: string;
}

// Application state types
export interface AppState {
  isInitialized: boolean;
  hasError: boolean;
  lastUpdated: string;
}