/**
 * E2E Tests: App Launch
 *
 * Verifies basic application startup behavior:
 * - Window visibility
 * - Correct app title
 * - Sidebar presence
 * - No console errors
 */
import { test, expect } from './electron.setup';

test.describe('App Launch', () => {
  test('app launches successfully with visible window', async ({ electronApp, mainWindow }) => {
    // Verify app is running
    expect(electronApp).toBeDefined();

    // Verify window is visible by checking body has content
    const bodyLength = await mainWindow.evaluate(() => document.body.innerHTML.length);
    expect(bodyLength).toBeGreaterThan(0);
  });

  test('app title contains ADC', async ({ electronApp }) => {
    // Get the app name from Electron
    const appName = await electronApp.evaluate(({ app }) => app.getName());

    // App name should contain adc (case-insensitive)
    expect(appName.toLowerCase()).toContain('adc');
  });

  test('app shows sidebar', async ({ mainWindow }) => {
    // The sidebar contains "ADC" text in its header
    const sidebarHeader = mainWindow.locator('text=ADC');
    await expect(sidebarHeader).toBeVisible({ timeout: 10_000 });

    // Also verify the aside element exists (sidebar container)
    const sidebarAside = mainWindow.locator('aside');
    await expect(sidebarAside).toBeVisible();
  });

  test('no console errors on startup', async ({ mainWindow }) => {
    const consoleErrors: string[] = [];

    // Collect console errors
    mainWindow.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit for any async errors to appear
    await mainWindow.waitForTimeout(2000);

    // Filter out known acceptable errors (e.g., network errors in test env)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        // Ignore network-related errors that may occur in test environment
        !error.includes('net::ERR_') &&
        !error.includes('Failed to fetch') &&
        !error.includes('NetworkError') &&
        // Ignore React DevTools errors (not installed in test)
        !error.includes('Download the React DevTools'),
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('app window has minimum dimensions', async ({ electronApp }) => {
    // Get window bounds
    const appWindow = await electronApp.firstWindow();
    const width = await appWindow.evaluate(() => globalThis.innerWidth);
    const height = await appWindow.evaluate(() => globalThis.innerHeight);

    // Window should have reasonable minimum dimensions
    expect(width).toBeGreaterThan(400);
    expect(height).toBeGreaterThan(300);
  });

  test('app loads within acceptable time', async ({ electronApp }) => {
    const startTime = Date.now();

    // Wait for the main window to be ready
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // App should load within 10 seconds (generous for CI environments)
    expect(loadTime).toBeLessThan(10_000);
  });
});
