/**
 * @fileoverview Main Express application configuration file for SaaS Metrics Platform
 * Implements comprehensive middleware stack, security controls, monitoring, and error handling
 * @version 1.0.0
 */

// External imports with versions
import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.x
import cors from 'cors'; // ^2.8.x
import helmet from 'helmet'; // ^7.0.x
import compression from 'compression'; // ^1.7.x
import rateLimit from 'express-rate-limit'; // ^6.x
import { Counter, Histogram } from 'prom-client'; // ^14.x

// Internal imports
import { config } from './config';
import router from './api/routes';
import { logger } from './lib/logger';
import { errorHandler } from './api/middleware/error.middleware';
import { loggingMiddleware } from './api/middleware/logging.middleware';

/**
 * Main application class that initializes and configures the Express server
 * with comprehensive security, monitoring, and performance features
 */
export class App {
  private app: Express;
  private readonly requestCounter: Counter;
  private readonly responseTime: Histogram;

  constructor() {
    this.app = express();
    
    // Initialize Prometheus metrics
    this.requestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status']
    });

    this.responseTime = new Histogram({
      name: 'http_response_time_seconds',
      help: 'HTTP response time in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initializes comprehensive middleware stack with security and monitoring
   * @private
   */
  private initializeMiddleware(): void {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", config.security.apiEndpoints],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "same-site" },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.security.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Request-Id'],
      credentials: true,
      maxAge: 86400
    }));

    // Request parsing and compression
    this.app.use(express.json({ limit: '10kb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10kb' }));
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per window
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: 429,
        message: 'Too many requests, please try again later'
      }
    });
    this.app.use('/api/', limiter);

    // Request correlation ID
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-Id', req.id);
      next();
    });

    // Logging and monitoring
    this.app.use(loggingMiddleware);
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const timer = this.responseTime.startTimer();
      res.on('finish', () => {
        timer({ method: req.method, path: req.path });
        this.requestCounter.inc({
          method: req.method,
          path: req.path,
          status: res.statusCode
        });
      });
      next();
    });
  }

  /**
   * Initializes API routes with security middleware
   * @private
   */
  private initializeRoutes(): void {
    this.app.use('/api/v1', router);

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        status: 404,
        message: 'Resource not found',
        path: req.path
      });
    });
  }

  /**
   * Initializes comprehensive error handling
   * @private
   */
  private initializeErrorHandling(): void {
    this.app.use(errorHandler);

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason: Error) => {
      logger.error('Unhandled Rejection', {
        error: reason.message,
        stack: reason.stack
      });
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });
  }

  /**
   * Returns configured Express application instance
   * @returns Express application
   */
  public getApp(): Express {
    return this.app;
  }

  /**
   * Starts the Express server with the specified port
   * @param port - Port number to listen on
   */
  public listen(port: number): void {
    this.app.listen(port, () => {
      logger.info(`Server started on port ${port}`, {
        port,
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version
      });
    });
  }
}

// Export singleton instance
export const app = new App().getApp();