import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Database } from '../services/database';
import { logger } from '../utils/logger';

const router = express.Router();
const database = Database.getInstance();

// Rate limiting for auth endpoints - DISABLED FOR TESTING
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased limit for testing
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth routes
router.use(authLimiter);

const JWT_SECRET = process.env.JWT_SECRET || 'shimmy-dev-secret-change-in-production';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    logger.info('auth', `Login attempt for: ${email}`);

    // Get user from database
    const user = await database.getUser(email);
    if (!user) {
      logger.warn('auth', `Login failed: User not found - ${email}`);
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      logger.warn('auth', `Login failed: Invalid password for user ${user.username}`);
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Update last login
    await database.updateUserLogin(user.id);

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('auth', `Successful login for user: ${user.username}`, { 
      userId: user.id, 
      role: user.role 
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_active: user.last_active
      }
    });

  } catch (error) {
    logger.error('auth', 'Login error', { error: error?.toString() });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({
        error: 'Email, password, and username are required'
      });
    }

    logger.info('auth', `Registration attempt for: ${email}`);

    // Check if user already exists
    const existingUser = await database.getUser(email);
    if (existingUser) {
      logger.warn('auth', `Registration failed: User already exists - ${email}`);
      return res.status(409).json({
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await database.createUser({
      email,
      username,
      password_hash: passwordHash,
      role: 'user'
    });

    // Create JWT tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('auth', `Successful registration for user: ${user.username}`, { 
      userId: user.id, 
      role: user.role 
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_active: user.last_active
      }
    });

  } catch (error) {
    logger.error('auth', 'Registration error', { error: error?.toString() });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Token verification endpoint
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({
        error: 'Authorization header with Bearer token is required'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Get fresh user data
      const user = await database.getUser(decoded.email);
      if (!user) {
        return res.status(401).json({
          error: 'User not found'
        });
      }

      res.json({
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_active: user.last_active
        }
      });

    } catch (jwtError) {
      logger.warn('auth', 'Invalid token verification attempt');
      res.status(401).json({
        valid: false,
        error: 'Invalid token'
      });
    }

  } catch (error) {
    logger.error('auth', 'Token verification error', { error: error?.toString() });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
      
      // Get user from database
      const user = await database.getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          error: 'User not found'
        });
      }

      // Generate new tokens
      const accessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      logger.info('auth', `Token refreshed for user: ${user.username}`, { userId: user.id });

      res.json({
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_active: user.last_active
        }
      });

    } catch (jwtError) {
      logger.warn('auth', 'Invalid refresh token attempt');
      res.status(401).json({
        error: 'Invalid or expired refresh token'
      });
    }

  } catch (error) {
    logger.error('auth', 'Token refresh error', { error: error?.toString() });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Logout endpoint (client-side token removal, but log the event)
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        logger.info('auth', `User logged out: ${decoded.email}`, { userId: decoded.userId });
      } catch {
        // Token might be expired, that's okay
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('auth', 'Logout error', { error: error?.toString() });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Middleware to authenticate requests
export const authenticateToken = (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid token'
      });
    }

    req.user = decoded;
    next();
  });
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (!err) {
        req.user = decoded;
      }
    });
  }

  next();
};

// User info endpoint
router.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await database.getUser(req.user.email);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      last_login: user.last_login
    });

  } catch (error) {
    logger.error('auth', 'Get user info error', { error: error?.toString() });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export { router as authRoutes };