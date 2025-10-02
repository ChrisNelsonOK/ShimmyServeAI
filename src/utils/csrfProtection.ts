// CSRF (Cross-Site Request Forgery) protection utilities

interface CSRFConfig {
  tokenName: string;
  tokenLength: number;
  cookieName: string;
  headerName: string;
  excludeRoutes: string[];
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

class CSRFProtection {
  private config: CSRFConfig;
  private tokens: Map<string, number> = new Map(); // token -> expiry timestamp

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = {
      tokenName: 'csrf_token',
      tokenLength: 32,
      cookieName: 'csrf_token',
      headerName: 'X-CSRF-Token',
      excludeRoutes: ['/health', '/api/auth/refresh'],
      secure: window.location.protocol === 'https:',
      sameSite: 'strict',
      ...config,
    };

    // Clean up expired tokens every 30 minutes
    setInterval(() => this.cleanupExpiredTokens(), 30 * 60 * 1000);
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, expiry] of this.tokens.entries()) {
      if (expiry < now) {
        this.tokens.delete(token);
      }
    }
  }

  private generateSecureToken(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  public generateToken(): string {
    const token = this.generateSecureToken(this.config.tokenLength);
    const expiry = Date.now() + (4 * 60 * 60 * 1000); // 4 hours
    this.tokens.set(token, expiry);
    
    // Store in localStorage for client-side access
    localStorage.setItem(this.config.tokenName, token);
    
    return token;
  }

  public getToken(): string | null {
    return localStorage.getItem(this.config.tokenName);
  }

  public validateToken(token: string): boolean {
    if (!token) return false;
    
    const expiry = this.tokens.get(token);
    if (!expiry) return false;
    
    if (expiry < Date.now()) {
      this.tokens.delete(token);
      return false;
    }
    
    return true;
  }

  public refreshToken(): string {
    const oldToken = this.getToken();
    if (oldToken) {
      this.tokens.delete(oldToken);
    }
    
    return this.generateToken();
  }

  public removeToken(): void {
    const token = this.getToken();
    if (token) {
      this.tokens.delete(token);
      localStorage.removeItem(this.config.tokenName);
    }
  }

  private shouldProtectRoute(url: string): boolean {
    return !this.config.excludeRoutes.some(route => url.includes(route));
  }

  public createFetchWrapper() {
    const originalFetch = window.fetch;
    
    return async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Only protect non-GET requests to protected routes
      if (init.method && init.method !== 'GET' && this.shouldProtectRoute(url)) {
        const token = this.getToken();
        
        if (!token) {
          throw new Error('CSRF token not found. Please refresh the page and try again.');
        }
        
        if (!this.validateToken(token)) {
          this.refreshToken();
          throw new Error('CSRF token expired. Please refresh the page and try again.');
        }
        
        // Add CSRF token to headers
        init.headers = {
          ...init.headers,
          [this.config.headerName]: token,
        };
      }
      
      return originalFetch(input, init);
    };
  }

  public createAxiosInterceptor() {
    return {
      request: (config: any) => {
        // Only protect non-GET requests to protected routes
        if (config.method !== 'get' && this.shouldProtectRoute(config.url)) {
          const token = this.getToken();
          
          if (!token) {
            throw new Error('CSRF token not found. Please refresh the page and try again.');
          }
          
          if (!this.validateToken(token)) {
            this.refreshToken();
            throw new Error('CSRF token expired. Please refresh the page and try again.');
          }
          
          config.headers[this.config.headerName] = token;
        }
        
        return config;
      },
      
      response: (response: any) => response,
      
      error: (error: any) => {
        if (error.response?.status === 403 && error.response?.data?.error === 'Invalid CSRF token') {
          this.refreshToken();
        }
        return Promise.reject(error);
      },
    };
  }
}

// Global CSRF protection instance
const csrfProtection = new CSRFProtection();

// Initialize CSRF protection
export function initializeCSRF(): void {
  // Generate initial token
  csrfProtection.generateToken();
  
  // Replace global fetch with CSRF-protected version
  window.fetch = csrfProtection.createFetchWrapper();
  
  console.log('✅ CSRF protection initialized');
}

// React hook for CSRF token management
export function useCSRF() {
  const getToken = (): string | null => {
    return csrfProtection.getToken();
  };
  
  const refreshToken = (): string => {
    return csrfProtection.refreshToken();
  };
  
  const validateToken = (token: string): boolean => {
    return csrfProtection.validateToken(token);
  };
  
  const removeToken = (): void => {
    csrfProtection.removeToken();
  };
  
  return {
    getToken,
    refreshToken,
    validateToken,
    removeToken,
  };
}

// Express middleware for server-side CSRF validation
export function createCSRFMiddleware(csrfInstance?: CSRFProtection) {
  const csrf = csrfInstance || csrfProtection;
  
  return (req: any, res: any, next: any) => {
    // Skip validation for excluded routes and GET requests
    if (req.method === 'GET' || !csrf['shouldProtectRoute'](req.url)) {
      return next();
    }
    
    const token = req.headers['x-csrf-token'] || req.body.csrf_token;
    
    if (!token) {
      return res.status(403).json({
        error: 'CSRF token missing',
        message: 'CSRF token is required for this request',
      });
    }
    
    if (!csrf.validateToken(token)) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        message: 'CSRF token is invalid or expired',
      });
    }
    
    next();
  };
}

// Utility to add CSRF token to forms
export function addCSRFToForm(form: HTMLFormElement): void {
  const token = csrfProtection.getToken();
  if (!token) return;
  
  // Remove existing CSRF input if present
  const existingInput = form.querySelector('input[name="csrf_token"]');
  if (existingInput) {
    existingInput.remove();
  }
  
  // Add new CSRF input
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'csrf_token';
  input.value = token;
  form.appendChild(input);
}

// Utility to get CSRF token for manual requests
export function getCSRFToken(): string | null {
  return csrfProtection.getToken();
}

// Utility to refresh CSRF token
export function refreshCSRFToken(): string {
  return csrfProtection.refreshToken();
}

export { CSRFProtection, csrfProtection };
export type { CSRFConfig };