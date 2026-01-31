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
    environment: 'node', // Use node environment for unit tests (File.arrayBuffer() support)
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
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
    // Setup files run before tests - ensures File.arrayBuffer() polyfill is loaded
    setupFiles: ['./tests/setup.js'],
    // Additional setup for UI tests
    setupFilesAfterEnv: ['./tests/ui/setup.ts']
  },
  // TypeScript support
  esbuild: {
    target: 'node18'
  }
});

