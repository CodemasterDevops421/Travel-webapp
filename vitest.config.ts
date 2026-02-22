import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'tests/mocks/server-only.ts')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      all: false,
      exclude: ['**/node_modules/**', '**/node_modules.bak*/**'],
      thresholds: {
        lines: 20,
        functions: 30,
        branches: 20,
        statements: 20
      }
    }
  }
});
