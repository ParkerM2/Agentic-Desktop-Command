/**
 * Electron test fixtures for Playwright E2E testing.
 *
 * Provides:
 * - electronApp: Launches and closes the Electron application
 * - mainWindow: Gets the first window and waits for DOM content loaded
 *
 * Usage:
 * ```typescript
 * import { test, expect } from './electron.setup';
 *
 * test('my test', async ({ mainWindow }) => {
 *   await expect(mainWindow.locator('h1')).toBeVisible();
 * });
 * ```
 *
 * @see https://playwright.dev/docs/api/class-electron
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test as base, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

import type { ElectronApplication, Page } from 'playwright';

interface TestFixtures {
  electronApp: ElectronApplication;
  mainWindow: Page;
}

// ESM-compatible dirname equivalent
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);

/**
 * Extended test with Electron fixtures.
 */
export const test = base.extend<TestFixtures>({
  electronApp: async ({}, use) => {
    // Path to the built Electron app entry point
    const appPath = join(currentDir, '../../out/main/index.cjs');

    const app = await electron.launch({
      args: [appPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_IS_TEST: '1',
      },
    });

    await use(app);
    await app.close();
  },

  mainWindow: async ({ electronApp }, use) => {
    // Wait for the first window to appear
    const window = await electronApp.firstWindow();

    // Wait for the page to be fully loaded
    await window.waitForLoadState('domcontentloaded');

    await use(window);
  },
});

export { expect };
