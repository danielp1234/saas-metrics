// @types/node version: ^18.0.0
import { ProcessEnv as NodeProcessEnv } from '@types/node';

/**
 * Type augmentation for NodeJS.ProcessEnv to provide strict typing for
 * environment variables used throughout the SaaS Metrics Platform.
 * 
 * This ensures type safety and proper configuration across different environments:
 * - Development
 * - Staging 
 * - Production
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv extends NodeProcessEnv {
      // Application Environment
      NODE_ENV: 'development' | 'staging' | 'production';
      PORT: string;
      LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';

      // Database Configuration - Neon PostgreSQL
      DATABASE_URL: string;
      DATABASE_HOST: string;
      DATABASE_PORT: string;
      DATABASE_NAME: string;
      DATABASE_USER: string;
      DATABASE_PASSWORD: string;
      DATABASE_SSL: 'require' | 'prefer' | 'disable';
      DATABASE_POOL_MIN: string;
      DATABASE_POOL_MAX: string;

      // Cache Configuration - Upstash Redis
      REDIS_URL: string;
      REDIS_HOST: string;
      REDIS_PORT: string;
      REDIS_PASSWORD: string;
      REDIS_TLS: 'true' | 'false';

      // Authentication - Google OAuth 2.0
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      GOOGLE_CALLBACK_URL: string;

      // JWT Configuration
      JWT_SECRET: string;
      JWT_EXPIRES_IN: string; // Duration in seconds
      JWT_REFRESH_SECRET: string;
      JWT_REFRESH_EXPIRES_IN: string; // Duration in seconds

      // Session Management
      SESSION_SECRET: string;
      SESSION_DURATION: string; // Duration in seconds

      // API Rate Limiting
      API_RATE_LIMIT: string; // Requests per minute
      API_RATE_LIMIT_WINDOW: string; // Window in seconds
    }
  }
}

/**
 * Re-export ProcessEnv interface to allow direct imports
 * This enables type checking when accessing process.env in other files
 */
export interface ProcessEnv extends NodeJS.ProcessEnv {}

/**
 * Type guard to check if environment variables are properly configured
 * @param key - Environment variable key to check
 * @returns boolean indicating if the environment variable is defined
 */
export function isEnvDefined(key: keyof NodeJS.ProcessEnv): boolean {
  return typeof process.env[key] !== 'undefined';
}

/**
 * Type guard to validate environment variable value against allowed options
 * @param key - Environment variable key to validate
 * @param allowedValues - Array of allowed values
 * @returns boolean indicating if the environment variable has a valid value
 */
export function isEnvValid<T extends string>(
  key: keyof NodeJS.ProcessEnv,
  allowedValues: readonly T[]
): boolean {
  return allowedValues.includes(process.env[key] as T);
}

// Prevent automatic export of all declarations
export {};