/**
 * E2E Tests: Navigation
 *
 * Verifies sidebar navigation works correctly:
 * - Can navigate to Dashboard
 * - Can navigate to My Work
 * - Can navigate to Settings
 * - Active nav item is highlighted
 */
import { test, expect } from './electron.setup';

test.describe('Navigation', () => {
  test('can navigate to Dashboard', async ({ mainWindow }) => {
    // Click Dashboard in sidebar
    const dashboardButton = mainWindow.locator('button', { hasText: 'Dashboard' });
    await dashboardButton.click();

    // Wait for navigation to complete
    await mainWindow.waitForURL(/\/dashboard/, { timeout: 5000 });

    // Verify we're on the dashboard page by checking URL or content
    const url = mainWindow.url();
    expect(url).toContain('/dashboard');
  });

  test('can navigate to My Work', async ({ mainWindow }) => {
    // Click My Work in sidebar
    const myWorkButton = mainWindow.locator('button', { hasText: 'My Work' });
    await myWorkButton.click();

    // Wait for navigation to complete
    await mainWindow.waitForURL(/\/my-work/, { timeout: 5000 });

    // Verify we're on the My Work page
    const url = mainWindow.url();
    expect(url).toContain('/my-work');
  });

  test('can navigate to Settings', async ({ mainWindow }) => {
    // Click Settings in sidebar
    const settingsButton = mainWindow.locator('button', { hasText: 'Settings' });
    await settingsButton.click();

    // Wait for navigation to complete
    await mainWindow.waitForURL(/\/settings/, { timeout: 5000 });

    // Verify we're on the Settings page
    const url = mainWindow.url();
    expect(url).toContain('/settings');
  });

  test('active nav item is highlighted', async ({ mainWindow }) => {
    // Navigate to Dashboard
    const dashboardButton = mainWindow.locator('button', { hasText: 'Dashboard' });
    await dashboardButton.click();
    await mainWindow.waitForURL(/\/dashboard/, { timeout: 5000 });

    // Check that Dashboard button has the active style class
    // The active style includes 'bg-accent' and 'font-medium'
    await expect(dashboardButton).toHaveClass(/bg-accent/);

    // Navigate to Settings and verify it becomes active
    const settingsButton = mainWindow.locator('button', { hasText: 'Settings' });
    await settingsButton.click();
    await mainWindow.waitForURL(/\/settings/, { timeout: 5000 });

    // Settings should now be active
    await expect(settingsButton).toHaveClass(/bg-accent/);

    // Dashboard should no longer be active (should have muted-foreground)
    await expect(dashboardButton).toHaveClass(/text-muted-foreground/);
  });

  test('can navigate to Notes', async ({ mainWindow }) => {
    // Click Notes in sidebar
    const notesButton = mainWindow.locator('button', { hasText: 'Notes' });
    await notesButton.click();

    // Wait for navigation to complete
    await mainWindow.waitForURL(/\/notes/, { timeout: 5000 });

    // Verify we're on the Notes page
    const url = mainWindow.url();
    expect(url).toContain('/notes');
  });

  test('can navigate to Planner', async ({ mainWindow }) => {
    // Click Planner in sidebar
    const plannerButton = mainWindow.locator('button', { hasText: 'Planner' });
    await plannerButton.click();

    // Wait for navigation to complete
    await mainWindow.waitForURL(/\/planner/, { timeout: 5000 });

    // Verify we're on the Planner page
    const url = mainWindow.url();
    expect(url).toContain('/planner');
  });

  test('can navigate to Alerts', async ({ mainWindow }) => {
    // Click Alerts in sidebar
    const alertsButton = mainWindow.locator('button', { hasText: 'Alerts' });
    await alertsButton.click();

    // Wait for navigation to complete
    await mainWindow.waitForURL(/\/alerts/, { timeout: 5000 });

    // Verify we're on the Alerts page
    const url = mainWindow.url();
    expect(url).toContain('/alerts');
  });

  test('sidebar collapse toggle works', async ({ mainWindow }) => {
    // Find the collapse toggle button (contains PanelLeftClose icon when expanded)
    const collapseButton = mainWindow.locator('aside button').first();

    // Verify sidebar is initially expanded (shows "Claude UI" text)
    const sidebarTitle = mainWindow.locator('text=Claude UI');
    await expect(sidebarTitle).toBeVisible();

    // Click to collapse
    await collapseButton.click();

    // After collapse, the title should be hidden
    await expect(sidebarTitle).not.toBeVisible();

    // Click to expand
    await collapseButton.click();

    // Title should be visible again
    await expect(sidebarTitle).toBeVisible();
  });

  test('navigation maintains state on page reload', async ({ mainWindow }) => {
    // Navigate to Settings
    const settingsButton = mainWindow.locator('button', { hasText: 'Settings' });
    await settingsButton.click();
    await mainWindow.waitForURL(/\/settings/, { timeout: 5000 });

    // Reload the page
    await mainWindow.reload();
    await mainWindow.waitForLoadState('domcontentloaded');

    // Verify we're still on Settings after reload
    const url = mainWindow.url();
    expect(url).toContain('/settings');
  });
});
