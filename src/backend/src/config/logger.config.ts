import { format, transports, LoggerOptions, LogEntry } from 'winston';
import { ElasticsearchTransport, ElasticsearchTransportOptions } from 'winston-elasticsearch';
import { Environment } from '../types/environment';

/**
 * @version 1.0.0
 * @description Centralized logging configuration for the SaaS Metrics Platform
 * with ELK Stack integration, security features, and performance optimizations.
 */

// Define standardized log levels with numeric priorities
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5,
};

// Service identification constants
const SERVICE_NAME = 'saas-metrics-platform';
const SERVICE_VERSION = process.env.npm_package_version || '1.0.0';

// Elasticsearch configuration
const ELASTICSEARCH_NODE = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const ELASTICSEARCH_AUTH = {
  username: process.env.ELASTICSEARCH_USER,
  password: process.env.ELASTICSEARCH_PASS,
};

/**
 * Determines the appropriate log level based on the environment
 * @returns {string} The determined log level
 */
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV;
  switch (env) {
    case 'development':
      return 'trace';
    case 'staging':
      return 'debug';
    case 'production':
      return 'info';
    default:
      return 'info';
  }
};

/**
 * Creates a comprehensive log format configuration with security and metadata
 * @returns {object} Combined Winston format configuration
 */
const createLogFormat = () => {
  const sanitizeFields = ['password', 'token', 'authorization', 'cookie'];
  
  return format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]',
    }),
    format.metadata({
      fillWith: ['service', 'version', 'trace_id', 'span_id'],
    }),
    format.errors({ stack: true }),
    format((info) => {
      // Add service metadata
      info.service = SERVICE_NAME;
      info.version = SERVICE_VERSION;
      
      // Sanitize sensitive data
      if (info.metadata) {
        sanitizeFields.forEach((field) => {
          if (info.metadata[field]) {
            info.metadata[field] = '[REDACTED]';
          }
        });
      }
      
      return info;
    })(),
    format.json(),
    format.printf((info) => {
      const { timestamp, level, message, metadata, ...rest } = info;
      return JSON.stringify({
        '@timestamp': timestamp,
        level,
        message,
        ...metadata,
        ...rest,
        log_format_version: '1.0',
      });
    })
  );
};

/**
 * Creates Elasticsearch transport configuration with security and performance settings
 * @returns {ElasticsearchTransportOptions} Elasticsearch transport options
 */
const createElasticsearchOptions = (): ElasticsearchTransportOptions => {
  return {
    level: 'info',
    clientOpts: {
      node: ELASTICSEARCH_NODE,
      auth: ELASTICSEARCH_AUTH,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
      maxRetries: 5,
      requestTimeout: 10000,
    },
    indexPrefix: `logs-${SERVICE_NAME}`,
    indexSuffixPattern: 'YYYY.MM.DD',
    bufferLimit: 100,
    flushInterval: 2000,
    pipeline: 'logs-pipeline',
    ensureMappingTemplate: true,
    mappingTemplate: {
      index_patterns: [`logs-${SERVICE_NAME}-*`],
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
        index: {
          refresh_interval: '5s',
        },
      },
      mappings: {
        dynamic_templates: [
          {
            strings_as_keywords: {
              match_mapping_type: 'string',
              mapping: {
                type: 'keyword',
              },
            },
          },
        ],
      },
    },
  };
};

/**
 * Comprehensive logger configuration with security, performance, and monitoring capabilities
 */
export const loggerConfig: LoggerOptions = {
  level: getLogLevel(),
  levels: LOG_LEVELS,
  format: createLogFormat(),
  transports: [
    // Console transport for local development and debugging
    new transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
    
    // File transport for persistent local logging
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
    
    // Elasticsearch transport for centralized logging
    new ElasticsearchTransport(createElasticsearchOptions()),
  ],
  
  // Additional configuration options
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test',
};