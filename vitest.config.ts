import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom', // Use jsdom for React component tests
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    // Override environment for specific test directories
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'test-data/',
        '*.config.js',
        '*.config.ts'
      ]
    },
    // Mock environment variables - tests run without real API keys
    env: {
      GEMINI_API_KEY: 'mock-api-key-for-testing',
      NODE_ENV: 'test'
    },
    // Setup files run before tests
    setupFiles: ['./tests/setup.js'],
    // Additional setup for UI tests
    setupFilesAfterEnv: ['./tests/ui/setup.ts']
  },
  // TypeScript support
  esbuild: {
    target: 'node18'
  }
});

