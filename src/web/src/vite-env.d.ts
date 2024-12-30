/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables used throughout the application.
 * These environment variables are prefixed with VITE_ and are exposed to the client-side code.
 * @version 4.0.0
 */
interface ImportMetaEnv {
  /**
   * Backend API endpoint URL for service communication
   * @example 'https://api.saasmetrics.dev'
   */
  readonly VITE_API_URL: string;

  /**
   * Google OAuth client ID for authentication integration
   * @example '123456789-abcdef.apps.googleusercontent.com'
   */
  readonly VITE_GOOGLE_CLIENT_ID: string;

  /**
   * Application environment identifier
   * @example 'development' | 'staging' | 'production'
   */
  readonly VITE_APP_ENV: string;

  /**
   * Application version from package.json for version tracking
   * @example '1.0.0'
   */
  readonly VITE_APP_VERSION: string;
}

/**
 * Type augmentation for Vite's import.meta.env object
 * Ensures type safety when accessing environment variables through import.meta.env
 */
interface ImportMeta {
  /**
   * Typed environment variables object
   * @see ImportMetaEnv for available environment variables
   */
  readonly env: ImportMetaEnv;
}