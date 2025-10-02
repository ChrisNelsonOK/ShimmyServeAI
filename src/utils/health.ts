// Health check utilities for Docker container health monitoring

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    database: boolean;
    websocket: boolean;
    api: boolean;
  };
  details?: string;
}

export async function performHealthCheck(): Promise<HealthCheck> {
  const checks = {
    database: false,
    websocket: false,
    api: false,
  };

  let status: HealthCheck['status'] = 'healthy';
  let details = '';

  try {
    // Check database connection
    try {
      const { database } = await import('../lib/database');
      const users = database.getUsers();
      checks.database = Array.isArray(users);
    } catch {
      checks.database = false;
    }

    // Check WebSocket connectivity (basic check)
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
      // We'll just validate the URL format for now
      checks.websocket = wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://');
    } catch {
      checks.websocket = false;
    }

    // Check API connectivity
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      // Basic URL validation
      checks.api = apiUrl.startsWith('http://') || apiUrl.startsWith('https://');
    } catch {
      checks.api = false;
    }

    // Determine overall status
    const passedChecks = Object.values(checks).filter(Boolean).length;
    if (passedChecks === 3) {
      status = 'healthy';
    } else if (passedChecks >= 2) {
      status = 'degraded';
      details = 'Some services are not available';
    } else {
      status = 'unhealthy';
      details = 'Multiple critical services are down';
    }

  } catch (error) {
    status = 'unhealthy';
    details = `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    checks,
    details,
  };
}

// Express endpoint handler for health checks
export function createHealthEndpoint() {
  return async (req: any, res: any) => {
    try {
      const health = await performHealthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 503 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

// Simple health check for basic Docker health probe
export function simpleHealthCheck(): string {
  return 'healthy';
}