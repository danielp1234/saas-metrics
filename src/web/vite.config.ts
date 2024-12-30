// vite.config.ts
// @vitejs/plugin-react v4.0.0
// vite v4.0.0
// vite-tsconfig-paths v4.0.0

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // React plugin configuration with Emotion support
  plugins: [
    react({
      fastRefresh: true,
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    // TypeScript path resolution
    tsconfigPaths({
      projects: ['./tsconfig.json']
    })
  ],

  // Development server configuration
  server: {
    port: 3000,
    host: true, // Listen on all local IPs
    strictPort: true,
    cors: true,
    hmr: {
      overlay: true // Show errors as overlay
    }
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: true,
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          vendor: ['react', 'react-dom'],
          material: ['@mui/material']
        }
      }
    }
  },

  // Path resolution configuration
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@utils': '/src/utils',
      '@hooks': '/src/hooks',
      '@store': '/src/store',
      '@services': '/src/services',
      '@assets': '/src/assets',
      '@config': '/src/config',
      '@interfaces': '/src/interfaces'
    }
  },

  // CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase',
      scopeBehaviour: 'local',
      generateScopedName: '[name]__[local]___[hash:base64:5]'
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/assets/styles/variables.css";',
        sourceMap: true
      }
    }
  },

  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/types/**'
      ],
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Global defines
  define: {
    __APP_VERSION__: 'JSON.stringify(process.env.npm_package_version)',
    __DEV__: "process.env.NODE_ENV === 'development'",
    __PROD__: "process.env.NODE_ENV === 'production'"
  }
});