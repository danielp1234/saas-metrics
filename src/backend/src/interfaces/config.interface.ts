// External imports
// ioredis v5.0.0
import { RedisOptions } from 'ioredis';

/**
 * Google OAuth 2.0 authentication configuration interface
 * Defines settings for Google OAuth integration
 */
export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  allowedDomains: string[];
  enforceHttps: boolean;
}

/**
 * JWT token configuration interface with strict algorithm typing
 * Defines comprehensive JWT settings for token management
 */
export interface JWTConfig {
  secret: string;
  publicKey: string;
  privateKey: string;
  expiresIn: number;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  refreshEnabled: boolean;
  refreshExpiresIn: number;
}

/**
 * Session management configuration with security settings
 * Defines session handling and security parameters
 */
export interface SessionConfig {
  maxAge: number;
  secure: boolean;
  httpOnly: boolean;
  name: string;
  maxConcurrent: number;
  domain: string;
  rolling: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

/**
 * Database connection pool configuration with performance settings
 * Defines connection pool behavior and limits
 */
export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  acquireTimeoutMillis: number;
  reapIntervalMillis: number;
  fifo: boolean;
  priorityRange: number;
}

/**
 * Metrics validation configuration with strict mode options
 * Defines validation rules for metric values
 */
export interface ValidationConfig {
  enabled: boolean;
  strictMode: boolean;
  maxDecimals: number;
  minValue: number;
  maxValue: number;
  allowNegative: boolean;
  allowedUnits: string[];
}

/**
 * Metrics caching configuration with performance settings
 * Defines caching behavior and storage options
 */
export interface CachingConfig {
  enabled: boolean;
  ttlSeconds: number;
  compression: boolean;
  maxSize: number;
  evictionPolicy: 'lru' | 'lfu';
  persistToDisk: boolean;
}

/**
 * Comprehensive authentication configuration interface
 * Combines all authentication-related configurations
 */
export interface AuthConfig {
  google: GoogleAuthConfig;
  jwt: JWTConfig;
  session: SessionConfig;
}

/**
 * Redis cache configuration interface with clustering support
 * Defines Redis connection and cluster settings
 */
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  ttl: number;
  options: RedisOptions;
  cluster: boolean;
  sentinels: Array<{ host: string; port: number }>;
}

/**
 * Database configuration interface with replication support
 * Defines database connection and replication settings
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolConfig: PoolConfig;
  replication: {
    readReplicas: Array<{ host: string; port: number }>;
  };
}

/**
 * Metrics service configuration interface with performance settings
 * Defines comprehensive metrics handling configuration
 */
export interface MetricsConfig {
  enabled: boolean;
  prefix: string;
  defaultLabels: Record<string, string>;
  validation: ValidationConfig;
  caching: CachingConfig;
  performance: {
    sampleRate: number;
    aggregationInterval: number;
  };
}