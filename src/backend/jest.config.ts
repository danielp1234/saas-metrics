import type { Config } from '@jest/types';

/**
 * Comprehensive Jest configuration for backend testing with strict coverage requirements
 * to ensure 99.9% data validation success rate through thorough testing.
 * 
 * @version Jest 29.0.0
 * @see https://jestjs.io/docs/configuration
 */
const config: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Set Node.js as the test environment
  testEnvironment: 'node',

  // Define test file locations
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Test file patterns
  testRegex: '(/tests/.*\\.(test|spec))\\.[jt]sx?$',

  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Module path aliases for clean imports
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@config/(.*)': '<rootDir>/src/config/$1',
    '@interfaces/(.*)': '<rootDir>/src/interfaces/$1',
    '@models/(.*)': '<rootDir>/src/models/$1',
    '@services/(.*)': '<rootDir>/src/services/$1',
    '@utils/(.*)': '<rootDir>/src/utils/$1',
    '@middleware/(.*)': '<rootDir>/src/api/middleware/$1',
    '@controllers/(.*)': '<rootDir>/src/api/controllers/$1',
    '@validators/(.*)': '<rootDir>/src/api/validators/$1',
    '@routes/(.*)': '<rootDir>/src/api/routes/$1',
    '@workers/(.*)': '<rootDir>/src/workers/$1',
    '@lib/(.*)': '<rootDir>/src/lib/$1',
    '@types/(.*)': '<rootDir>/src/types/$1'
  },

  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*'
  ],

  // Strict coverage thresholds to ensure high test coverage
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],

  // Test timeout in milliseconds
  testTimeout: 5000,

  // Detailed test output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocked state between tests
  restoreMocks: true,

  // Additional reporter for test results
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],

  // Global test settings
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: true
    }
  },

  // Error handling
  bail: 1,
  maxWorkers: '50%'
};

export default config;