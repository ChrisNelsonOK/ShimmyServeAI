// Type definitions for backend services

export interface ConfigRule {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  min?: number;
  max?: number;
  enum?: string[];
}

export interface ConfigSchema {
  [key: string]: ConfigRule;
}

export interface ShimmyConfig {
  port?: number;
  host?: string;
  workers?: number;
  maxConnections?: number;
  timeout?: number;
  enableLogging?: boolean;
  logLevel?: string;
}

export interface ShimmyPerformance {
  uptime: number;
  connections: number;
  requests: number;
  responseTime: number;
  memory: number;
  cpu: number;
}

export interface KubernetesServiceInfo {
  namespace: string;
  name: string;
  type: string;
  clusterIp: string;
  externalIp: string;
  ports: string;
  age: string;
}