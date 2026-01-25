/**
 * ESLint Configuration
 * 
 * IMPORTANT: Do not import from ../../../../lib/* — always use '@/lib/*'.
 * 
 * Path aliases are configured in tsconfig.json:
 * - @/* maps to ./*
 * - @/lib/* maps to ./lib/*
 * 
 * This prevents fragile deep relative imports and ensures consistent module resolution.
 */

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Prevent deep relative imports - use path aliases instead
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../../../../lib/*', '../../../lib/*'],
            message: 'Do not import from ../../../../lib/* — always use "@/lib/*". Path aliases are configured in tsconfig.json.',
          },
        ],
      },
    ],
  },
  ignorePatterns: ['node_modules', '.next', 'dist', 'build', 'playwright-report', 'test-results'],
};


