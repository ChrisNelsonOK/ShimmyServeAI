/**
 * API Client for backend communication
 */

// Get the base URL from environment or default to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  // Load token from localStorage
  private loadToken() {
    this.token = localStorage.getItem('shimmy-auth-token');
  }

  // Save token to localStorage
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('shimmy-auth-token', token);
    } else {
      localStorage.removeItem('shimmy-auth-token');
    }
  }

  // Get authorization headers
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config: RequestInit = {
        method,
        headers: this.getHeaders(),
      };

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          details: data.details,
        };
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return {
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // GET request
  get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'GET');
  }

  // POST request
  post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'POST', body);
  }

  // PUT request
  put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PUT', body);
  }

  // DELETE request
  delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'DELETE');
  }

  // Check if backend is available
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
export const api = new ApiClient(API_BASE_URL);

// Terminal API specific methods
export const terminalApi = {
  async execute(command: string): Promise<ApiResponse<{
    command: string;
    output: string;
    isShimmerCommand: boolean;
    timestamp: string;
  }>> {
    const isAuthenticated = !!api['token'];
    return api.post('/terminal/execute', { command, isAuthenticated });
  }
};

// System API specific methods
export const systemApi = {
  async getMetrics(): Promise<ApiResponse<any>> {
    return api.get('/system/metrics');
  },

  async getInfo(): Promise<ApiResponse<any>> {
    return api.get('/system/info');
  },

  async getHealth(): Promise<ApiResponse<any>> {
    return api.get('/system/health');
  },

  async getProcesses(): Promise<ApiResponse<any[]>> {
    return api.get('/system/processes');
  },

  async getStatus(): Promise<ApiResponse<any>> {
    return api.get('/system/status');
  }
};

// Shimmy API specific methods
export const shimmyApi = {
  async getStatus(): Promise<ApiResponse<any>> {
    return api.get('/shimmy/status');
  },

  async getLogs(lines: number = 100): Promise<ApiResponse<any>> {
    return api.get(`/shimmy/logs?lines=${lines}`);
  },

  async restart(): Promise<ApiResponse<any>> {
    return api.post('/shimmy/restart');
  },

  async stop(): Promise<ApiResponse<any>> {
    return api.post('/shimmy/stop');
  },

  async start(): Promise<ApiResponse<any>> {
    return api.post('/shimmy/start');
  }
};