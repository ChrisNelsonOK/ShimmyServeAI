import { realLoggingService } from './realLoggingService';

const API_BASE_URL = 'http://localhost:3001/api/auth';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    status: string;
    created_at: string;
    updated_at: string;
    last_active: string;
  };
}

interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    status: string;
    created_at: string;
    updated_at: string;
    last_active: string;
  };
}

interface VerifyResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
    status: string;
    created_at: string;
    updated_at: string;
    last_active: string;
  };
}

export class AuthService {
  private static instance: AuthService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private constructor() {
    // Load tokens from localStorage on initialization
    this.loadTokens();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadTokens(): void {
    this.accessToken = localStorage.getItem('shimmy-access-token');
    this.refreshToken = localStorage.getItem('shimmy-refresh-token');
  }

  private saveTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('shimmy-access-token', accessToken);
    localStorage.setItem('shimmy-refresh-token', refreshToken);
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('shimmy-access-token');
    localStorage.removeItem('shimmy-refresh-token');
    localStorage.removeItem('shimmy-auth-user');
  }

  private async request<T>(endpoint: string, options: RequestInit, retry = true): Promise<T> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add auth token if available
      if (this.accessToken && !endpoint.includes('/refresh')) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for CORS
      });

      if (!response.ok) {
        // If token expired and we haven't retried yet
        if (response.status === 401 && retry && this.refreshToken && !endpoint.includes('/refresh')) {
          realLoggingService.info('auth-service', 'Token expired, attempting refresh');
          try {
            await this.refresh();
            // Retry the original request with new token
            return this.request<T>(endpoint, options, false);
          } catch (refreshError) {
            // Refresh failed, clear tokens and throw original error
            this.clearTokens();
            throw new Error('Session expired. Please login again.');
          }
        }
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          throw new Error(`Too many attempts. Please try again in ${retryAfter} seconds.`);
        }
        
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || error.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      realLoggingService.error('auth-service', `API request failed: ${error}`);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    realLoggingService.info('auth-service', `Login attempt for email: ${email}`);
    
    try {
      const response = await this.request<LoginResponse>('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      this.saveTokens(response.accessToken, response.refreshToken);
      
      // Store user info for backward compatibility
      localStorage.setItem('shimmy-auth-user', JSON.stringify(response.user));
      
      realLoggingService.info('auth-service', `Successful login for user: ${response.user.username}`, 
        { userId: response.user.id, role: response.user.role });
      
      return response;
    } catch (error) {
      realLoggingService.warn('auth-service', `Login failed: ${error}`);
      throw error;
    }
  }

  async register(email: string, password: string, username: string): Promise<RegisterResponse> {
    realLoggingService.info('auth-service', `Registration attempt for email: ${email}`);
    
    try {
      const response = await this.request<RegisterResponse>('/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, username }),
      });

      this.saveTokens(response.accessToken, response.refreshToken);
      
      // Store user info for backward compatibility
      localStorage.setItem('shimmy-auth-user', JSON.stringify(response.user));
      
      realLoggingService.info('auth-service', `Successful registration for user: ${response.user.username}`, 
        { userId: response.user.id });
      
      return response;
    } catch (error) {
      realLoggingService.error('auth-service', `Registration failed: ${error}`);
      throw error;
    }
  }

  async verify(): Promise<VerifyResponse> {
    if (!this.accessToken) {
      return { valid: false };
    }

    try {
      const response = await this.request<VerifyResponse>('/verify', {
        method: 'GET',
      });
      
      if (response.valid && response.user) {
        // Update stored user info
        localStorage.setItem('shimmy-auth-user', JSON.stringify(response.user));
      } else {
        this.clearTokens();
      }
      
      return response;
    } catch (error) {
      realLoggingService.warn('auth-service', `Token verification failed: ${error}`);
      // If verification fails, try to refresh
      return this.handleTokenRefresh();
    }
  }

  async refresh(): Promise<LoginResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.request<LoginResponse>('/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      this.saveTokens(response.accessToken, response.refreshToken);
      
      // Update stored user info
      localStorage.setItem('shimmy-auth-user', JSON.stringify(response.user));
      
      return response;
    } catch (error) {
      realLoggingService.error('auth-service', `Token refresh failed: ${error}`);
      this.clearTokens();
      throw error;
    }
  }

  private async handleTokenRefresh(): Promise<VerifyResponse> {
    try {
      await this.refresh();
      // Retry verification after refresh
      return this.verify();
    } catch (error) {
      return { valid: false };
    }
  }

  logout(): void {
    realLoggingService.info('auth-service', 'User logged out');
    this.clearTokens();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

export const authService = AuthService.getInstance();