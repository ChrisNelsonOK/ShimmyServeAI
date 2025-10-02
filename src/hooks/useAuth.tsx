import { createContext, useContext, useEffect, useState } from 'react';
import { authRateLimiter, getUserIdentifier } from '../utils/rateLimiter';
import { authService } from '../services/authService';
import { realLoggingService } from '../services/realLoggingService';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
  last_active?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = async (email: string, password: string) => {
    // Check rate limit for authentication attempts
    const identifier = getUserIdentifier();
    const rateLimitResult = authRateLimiter.check(identifier);
    
    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime);
      const errorMsg = `Too many login attempts. Please try again after ${resetDate.toLocaleTimeString()}`;
      realLoggingService.warn('auth', 'Rate limit exceeded for login attempts', { email, identifier });
      throw new Error(errorMsg);
    }

    try {
      const response = await authService.login(email, password);
      const userProfile: UserProfile = {
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        role: response.user.role as 'admin' | 'user' | 'viewer',
        status: response.user.status as 'active' | 'inactive' | 'suspended',
        created_at: response.user.created_at,
        updated_at: response.user.updated_at,
        last_active: response.user.last_active
      };

      setUser(userProfile);
      setUserProfile(userProfile);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed');
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const response = await authService.register(email, password, username);
      const userProfile: UserProfile = {
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        role: response.user.role as 'admin' | 'user' | 'viewer',
        status: response.user.status as 'active' | 'inactive' | 'suspended',
        created_at: response.user.created_at,
        updated_at: response.user.updated_at,
        last_active: response.user.last_active
      };

      setUser(userProfile);
      setUserProfile(userProfile);
      
      console.log('✅ User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create user account');
    }
  };

  const signOut = async () => {
    const currentUser = userProfile?.username || 'unknown';
    realLoggingService.info('auth', `User logout: ${currentUser}`, { userId: userProfile?.id });
    
    authService.logout();
    setUser(null);
    setUserProfile(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing authentication...');
        
        // Check if we have existing tokens and verify them
        if (authService.isAuthenticated()) {
          try {
            const verifyResponse = await authService.verify();
            
            if (verifyResponse.valid && verifyResponse.user) {
              console.log('✅ Valid session found for user:', verifyResponse.user.username);
              const userProfile: UserProfile = {
                id: verifyResponse.user.id,
                username: verifyResponse.user.username,
                email: verifyResponse.user.email,
                role: verifyResponse.user.role as 'admin' | 'user' | 'viewer',
                status: verifyResponse.user.status as 'active' | 'inactive' | 'suspended',
                created_at: verifyResponse.user.created_at,
                updated_at: verifyResponse.user.updated_at,
                last_active: verifyResponse.user.last_active
              };
              
              setUser(userProfile);
              setUserProfile(userProfile);
            } else {
              console.log('⚠️ Invalid or expired session, clearing...');
              authService.logout();
            }
          } catch (error) {
            console.error('Error verifying session:', error);
            authService.logout();
          }
        }
        
        setLoading(false);
        console.log('✅ Authentication initialized');
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        setLoading(false);
      }
    };

    // Demo mode for E2E testing
    if (window.location.search.includes('demo=true')) {
      console.log('🎭 Demo mode enabled for E2E testing');
      
      // Use a demo user for testing
      const demoUser: UserProfile = {
        id: 'demo-user-123',
        username: 'demo-user',
        email: 'demo@example.com',
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      };
      
      setUser(demoUser);
      setUserProfile(demoUser);
      setLoading(false);
      return;
    }

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}