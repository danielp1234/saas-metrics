// @typescript-eslint/eslint-plugin version: ^5.59.0
// @typescript-eslint/parser version: ^5.59.0
// eslint-config-airbnb-base version: ^15.0.0
// eslint-config-prettier version: ^8.8.0
// eslint-plugin-import version: ^2.27.5
// eslint-plugin-prettier version: ^4.2.1

export default {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    // Prettier Integration
    'prettier/prettier': 'error',

    // Import Rules
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        ts: 'never',
      },
    ],
    'import/prefer-default-export': 'off',

    // TypeScript Rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-useless-constructor': 'error',

    // Class Rules
    'class-methods-use-this': 'off',
    'no-useless-constructor': 'off',
  },
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '**/*.js',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],
};