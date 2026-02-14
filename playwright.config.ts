import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for Electron E2E testing.
 *
 * IMPORTANT: Electron tests must run serially (workers: 1) because
 * only one instance of the app can run at a time.
 *
 * @see https://playwright.dev/docs/api/class-electron
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 2,
  workers: 1, // Electron tests must run serially
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  reporter: [['html', { open: 'never' }]],
  expect: {
    timeout: 10_000,
  },
});
