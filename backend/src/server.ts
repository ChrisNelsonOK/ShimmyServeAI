import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { authRoutes } from './routes/auth';
import { systemRoutes } from './routes/system';
import { dockerRoutes } from './routes/docker';
import { kubernetesRoutes } from './routes/kubernetes';
import { ollamaRoutes } from './routes/ollama';
import { shimmyRoutes } from './routes/shimmy';
import { logsRoutes } from './routes/logs';
import { configRoutes } from './routes/config';
import { metricsRoutes } from './routes/metrics';
import { terminalRoutes } from './routes/terminal';
import { WebSocketManager } from './services/websocket';
import { Database } from './services/database';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Initialize database
(async () => {
  await Database.getInstance().initialize();
})();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:4173',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-CSRF-Token', 'x-csrf-token'],
  exposedHeaders: ['Content-Length', 'X-Request-Id', 'X-Response-Time'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Explicitly handle OPTIONS requests for all routes
app.options('*', cors());

// Rate limiting - Disabled for testing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased limit for testing
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info('http', message.trim());
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/docker', dockerRoutes);
app.use('/api/kubernetes', kubernetesRoutes);
app.use('/api/ollama', ollamaRoutes);
app.use('/api/shimmy', shimmyRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/terminal', terminalRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('server', 'Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

const wsManager = new WebSocketManager(wss);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('server', 'SIGTERM received, shutting down gracefully');
  server.close(() => {
    Database.getInstance().close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('server', 'SIGINT received, shutting down gracefully');
  server.close(() => {
    Database.getInstance().close();
    process.exit(0);
  });
});

server.listen(PORT, () => {
  logger.info('server', `ShimmyServe Backend API server running on port ${PORT}`);
  logger.info('server', `Frontend CORS enabled for: ${FRONTEND_URL}`);
  logger.info('server', `WebSocket server available at ws://localhost:${PORT}/ws`);
});

export { app, server };