/**
 * @fileoverview Entry point server file for SaaS Metrics Platform
 * Implements enterprise-grade server initialization with graceful shutdown,
 * connection draining, health monitoring, and comprehensive error handling.
 * @version 1.0.0
 */

// External imports with versions
import http from 'http'; // Node.js built-in
import { Counter, Gauge, register } from 'prom-client'; // ^14.0.0

// Internal imports
import { app } from './app';
import { serverConfig } from './config/server.config';
import { logger } from './lib/logger';

// Constants
const SHUTDOWN_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds

// Track active connections for graceful shutdown
const activeConnections = new Map<string, http.Socket>();
let isShuttingDown = false;

// Prometheus metrics
const activeConnectionsGauge = new Gauge({
  name: 'server_active_connections',
  help: 'Number of active server connections'
});

const serverUptimeGauge = new Gauge({
  name: 'server_uptime_seconds',
  help: 'Server uptime in seconds'
});

const requestCounter = new Counter({
  name: 'server_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status']
});

/**
 * Initializes and starts the HTTP server with health checks and metrics
 * @returns Promise<http.Server> Running HTTP server instance
 */
async function startServer(): Promise<http.Server> {
  try {
    // Create HTTP server instance
    const server = http.createServer(app);

    // Setup connection tracking
    server.on('connection', (socket: http.Socket) => {
      const id = `${socket.remoteAddress}:${socket.remotePort}`;
      activeConnections.set(id, socket);
      activeConnectionsGauge.inc();

      socket.on('close', () => {
        activeConnections.delete(id);
        activeConnectionsGauge.dec();
      });
    });

    // Start server
    await new Promise<void>((resolve) => {
      server.listen(serverConfig.port, serverConfig.host, () => {
        logger.info(`Server started successfully`, {
          port: serverConfig.port,
          host: serverConfig.host,
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        });
        resolve();
      });
    });

    // Initialize health checks
    setupHealthCheck(server);

    // Start metrics collection
    const startTime = Date.now();
    setInterval(() => {
      serverUptimeGauge.set((Date.now() - startTime) / 1000);
    }, 10000);

    return server;
  } catch (error) {
    logger.error('Failed to start server', { error });
    throw error;
  }
}

/**
 * Handles graceful server shutdown with connection draining
 * @param server - HTTP server instance to shutdown
 */
async function handleShutdown(server: http.Server): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Initiating graceful shutdown');

  try {
    // Stop accepting new connections
    server.close(() => {
      logger.info('Server closed to new connections');
    });

    // Set shutdown timeout
    const shutdownTimeout = setTimeout(() => {
      logger.warn('Shutdown timeout reached, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    // Close existing connections
    for (const [id, socket] of activeConnections) {
      logger.info(`Closing connection: ${id}`);
      socket.destroy();
      activeConnections.delete(id);
    }

    // Clear metrics
    await register.clear();

    // Clear shutdown timeout
    clearTimeout(shutdownTimeout);

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

/**
 * Initializes server health check endpoint and monitoring
 * @param server - HTTP server instance to monitor
 */
function setupHealthCheck(server: http.Server): void {
  const healthCheck = () => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const connections = activeConnections.size;

    return {
      status: isShuttingDown ? 'shutting_down' : 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      connections,
      environment: process.env.NODE_ENV
    };
  };

  // Regular health check logging
  setInterval(() => {
    const health = healthCheck();
    logger.info('Health check', { health });
  }, HEALTH_CHECK_INTERVAL);
}

// Process event handlers
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  const server = await startServer();
  await handleShutdown(server);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  const server = await startServer();
  await handleShutdown(server);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

// Start server
startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});