import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { SystemMonitor } from './systemMonitor';
import { DockerService } from './docker';
import { KubernetesService } from './kubernetes';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  id?: string;
}

export interface ConnectedClient {
  id: string;
  ws: WebSocket;
  userId?: number;
  subscriptions: Set<string>;
  lastPing: number;
}

export class WebSocketManager {
  private clients: Map<string, ConnectedClient> = new Map();
  private systemMonitor: SystemMonitor;
  private dockerService: DockerService;
  private kubernetesService: KubernetesService;
  private pingInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;

  constructor(private wss: WebSocketServer) {
    this.systemMonitor = new SystemMonitor();
    this.dockerService = new DockerService();
    this.kubernetesService = new KubernetesService();

    this.setupWebSocketServer();
    this.startPingInterval();
    this.startMetricsStreaming();

    logger.info('websocket', 'WebSocket manager initialized');
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      const client: ConnectedClient = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        lastPing: Date.now()
      };

      this.clients.set(clientId, client);
      logger.info('websocket', `Client connected: ${clientId}`, { 
        clientsCount: this.clients.size,
        userAgent: request.headers['user-agent']
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        data: { clientId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      });

      // Handle messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleClientMessage(clientId, message);
        } catch (error) {
          logger.error('websocket', `Invalid message from client ${clientId}`, { 
            error: error?.toString(),
            data: data.toString() 
          });
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info('websocket', `Client disconnected: ${clientId}`, { 
          clientsCount: this.clients.size 
        });
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('websocket', `WebSocket error for client ${clientId}`, { 
          error: error.message 
        });
      });

      // Handle pong
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });
    });
  }

  private handleClientMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    logger.debug('websocket', `Message from ${clientId}`, { type: message.type });

    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message.data.channel);
        break;

      case 'unsubscribe':
        this.handleUnsubscription(clientId, message.data.channel);
        break;

      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
        break;

      case 'auth':
        this.handleAuthentication(clientId, message.data);
        break;

      case 'request_metrics':
        this.sendSystemMetrics(clientId);
        break;

      case 'request_docker_status':
        this.sendDockerStatus(clientId);
        break;

      case 'request_k8s_status':
        this.sendKubernetesStatus(clientId);
        break;

      default:
        logger.warn('websocket', `Unknown message type: ${message.type}`, { clientId });
    }
  }

  private handleSubscription(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(channel);
    logger.info('websocket', `Client ${clientId} subscribed to ${channel}`);

    this.sendToClient(clientId, {
      type: 'subscribed',
      data: { channel },
      timestamp: new Date().toISOString()
    });

    // Send initial data for the channel
    this.sendInitialChannelData(clientId, channel);
  }

  private handleUnsubscription(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(channel);
    logger.info('websocket', `Client ${clientId} unsubscribed from ${channel}`);

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      data: { channel },
      timestamp: new Date().toISOString()
    });
  }

  private handleAuthentication(clientId: string, authData: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // TODO: Implement proper JWT token verification
    // For now, accept any auth data
    client.userId = authData.userId || 1;
    
    this.sendToClient(clientId, {
      type: 'auth_success',
      data: { userId: client.userId },
      timestamp: new Date().toISOString()
    });

    logger.info('websocket', `Client ${clientId} authenticated as user ${client.userId}`);
  }

  private async sendInitialChannelData(clientId: string, channel: string): Promise<void> {
    try {
      switch (channel) {
        case 'system_metrics':
          await this.sendSystemMetrics(clientId);
          break;

        case 'docker_status':
          await this.sendDockerStatus(clientId);
          break;

        case 'kubernetes_status':
          await this.sendKubernetesStatus(clientId);
          break;

        case 'logs':
          // Logs will be sent as they occur
          break;

        default:
          logger.warn('websocket', `Unknown channel: ${channel}`);
      }
    } catch (error) {
      logger.error('websocket', `Failed to send initial data for channel ${channel}`, { 
        error: error?.toString() 
      });
    }
  }

  private async sendSystemMetrics(clientId: string): Promise<void> {
    try {
      const metrics = await this.systemMonitor.getSystemMetrics();
      this.sendToClient(clientId, {
        type: 'system_metrics',
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('websocket', 'Failed to get system metrics', { error: error?.toString() });
    }
  }

  private async sendDockerStatus(clientId: string): Promise<void> {
    try {
      const status = await this.dockerService.getStatus();
      this.sendToClient(clientId, {
        type: 'docker_status',
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('websocket', 'Failed to get Docker status', { error: error?.toString() });
    }
  }

  private async sendKubernetesStatus(clientId: string): Promise<void> {
    try {
      const status = await this.kubernetesService.getClusterStatus();
      this.sendToClient(clientId, {
        type: 'kubernetes_status',
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('websocket', 'Failed to get Kubernetes status', { error: error?.toString() });
    }
  }

  public broadcast(message: WebSocketMessage, channel?: string): void {
    const targets = channel 
      ? Array.from(this.clients.values()).filter(client => client.subscriptions.has(channel))
      : Array.from(this.clients.values());

    targets.forEach(client => {
      this.sendToClient(client.id, message);
    });

    if (targets.length > 0) {
      logger.debug('websocket', `Broadcasted ${message.type} to ${targets.length} clients`, { channel });
    }
  }

  public sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('websocket', `Failed to send message to client ${clientId}`, { 
        error: error?.toString() 
      });
      this.clients.delete(clientId);
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const staleClients: string[] = [];

      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          // Check if client is stale (no pong in 60 seconds)
          if (now - client.lastPing > 60000) {
            staleClients.push(clientId);
          } else {
            // Send ping
            try {
              client.ws.ping();
            } catch (error) {
              staleClients.push(clientId);
            }
          }
        } else {
          staleClients.push(clientId);
        }
      });

      // Remove stale clients
      staleClients.forEach(clientId => {
        logger.info('websocket', `Removing stale client: ${clientId}`);
        this.clients.delete(clientId);
      });

    }, 30000); // Every 30 seconds
  }

  private startMetricsStreaming(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        // Stream system metrics
        const metrics = await this.systemMonitor.getSystemMetrics();
        this.broadcast({
          type: 'system_metrics_update',
          data: metrics,
          timestamp: new Date().toISOString()
        }, 'system_metrics');

        // Stream Docker status (less frequently)
        if (Date.now() % 60000 < 10000) { // Every minute
          const dockerStatus = await this.dockerService.getStatus();
          this.broadcast({
            type: 'docker_status_update',
            data: dockerStatus,
            timestamp: new Date().toISOString()
          }, 'docker_status');
        }

        // Stream Kubernetes status (less frequently)
        if (Date.now() % 120000 < 10000) { // Every 2 minutes
          const k8sStatus = await this.kubernetesService.getClusterStatus();
          this.broadcast({
            type: 'kubernetes_status_update',
            data: k8sStatus,
            timestamp: new Date().toISOString()
          }, 'kubernetes_status');
        }

      } catch (error) {
        logger.error('websocket', 'Failed to stream metrics', { error: error?.toString() });
      }
    }, 10000); // Every 10 seconds
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.clients.values())
        .reduce((total, client) => total + client.subscriptions.size, 0)
    };
  }

  public cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
    });
    this.clients.clear();

    logger.info('websocket', 'WebSocket manager cleaned up');
  }
}