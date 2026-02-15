import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/integration/**/*.test.ts', 'tests/integration/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/out/**'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
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
