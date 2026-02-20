import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for Electron E2E testing.
 *
 * IMPORTANT: Electron tests must run serially (workers: 1) because
 * only one instance of the app can run at a time.
 *
 * @see https://playwright.dev/docs/api/class-electron
 */
/**
 * E2E test environment variables (inherited from process.env):
 *   TEST_EMAIL    — Hub account email for authenticated tests
 *   TEST_PASSWORD — Hub account password for authenticated tests
 *   TEST_HUB_URL  — Hub server URL (default: http://localhost:3000)
 *
 * Copy .env.test.example to .env.test and fill in values before running.
 * Tests access these via process.env in fixtures and specs.
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
