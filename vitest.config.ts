import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/out/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/main/services/**/*.ts', 'src/shared/**/*.ts'],
      exclude: ['**/*.d.ts', '**/index.ts', '**/*.test.ts'],
      reportsDirectory: './coverage',
    },
    typecheck: {
      enabled: false,
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@features': resolve(__dirname, 'src/renderer/features'),
      '@ui': resolve(__dirname, 'src/renderer/shared/components/ui'),
      electron: resolve(__dirname, 'tests/setup/mocks/electron.ts'),
    },
  },
});
