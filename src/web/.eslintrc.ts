import type { Linter } from 'eslint';

// @typescript-eslint/eslint-plugin ^5.0.0
// @typescript-eslint/parser ^5.0.0
// eslint-config-airbnb ^19.0.0
// eslint-config-prettier ^8.0.0
// eslint-plugin-react ^7.0.0
// eslint-plugin-react-hooks ^4.0.0
// eslint-import-resolver-typescript ^3.0.0

const config: Linter.Config = {
  // Use TypeScript parser for enhanced type checking and TypeScript-specific features
  parser: '@typescript-eslint/parser',

  // Parser options aligned with tsconfig.json
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },

  // Extend recommended configurations and style guides
  extends: [
    'airbnb',
    'airbnb/hooks',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // Must be last to override other formatting rules
  ],

  // Required plugins for TypeScript and React
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'import',
  ],

  // Environment and global settings
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },

  // Specific rule configurations
  rules: {
    // TypeScript-specific rules
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      vars: 'all',
      args: 'after-used',
      ignoreRestSiblings: true,
    }],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',

    // React-specific rules
    'react/jsx-filename-extension': ['warn', {
      extensions: ['.tsx'],
    }],
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'off', // Use TypeScript types instead
    'react/require-default-props': 'off', // TypeScript handles this
    'react/jsx-props-no-spreading': ['warn', {
      html: 'enforce',
      custom: 'enforce',
      exceptions: ['Component'],
    }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Import rules
    'import/extensions': ['error', 'ignorePackages', {
      ts: 'never',
      tsx: 'never',
    }],
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: [
        'tests/**/*',
        'vite.config.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
      ],
    }],
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],

    // General code style rules
    'max-len': ['error', {
      code: 100,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
    }],
    'no-console': ['warn', {
      allow: ['warn', 'error'],
    }],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
      { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
    ],
  },

  // Override rules for specific file patterns
  overrides: [
    {
      files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};

export default config;