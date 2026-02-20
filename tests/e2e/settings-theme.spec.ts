/**
 * E2E Tests: Settings Page & Theme Switching
 *
 * Verifies:
 * - Settings page loads with all expected sections
 * - Theme/appearance mode selector is interactive (Light/Dark/System)
 * - Switching color theme changes data-theme attribute on <html>
 * - Dark mode toggle changes class on <html>
 * - Sidebar background adapts after theme change
 * - Card backgrounds adapt after theme change
 * - Background color changes after dark mode toggle
 * - Hub settings section is visible
 * - Profile section is accessible
 * - No console errors during theme switching
 */

import { test, expect } from './electron.setup';
import { createConsoleCollector, assertNoConsoleErrors } from './helpers/console-collector';

import type { Page } from 'playwright';

/**
 * Navigate to the settings page from an authenticated window.
 * Clicks the Settings button in the sidebar and waits for the route.
 */
async function navigateToSettings(page: Page): Promise<void> {
  const settingsButton = page.locator('button', { hasText: 'Settings' });
  await settingsButton.click();
  await page.waitForURL(/\/settings/, { timeout: 10_000 });
  // Wait for the settings heading to confirm page loaded
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10_000 });
}

test.describe('Settings Page & Theme Switching', () => {
  test('settings page loads with all expected sections', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    // Verify key section headings are visible
    await expect(page.getByText('Appearance')).toBeVisible();
    await expect(page.getByText('Color Theme')).toBeVisible();
    await expect(page.getByText('Hub Connection')).toBeVisible();
    await expect(page.getByText('Language')).toBeVisible();
    await expect(page.getByText('About')).toBeVisible();
  });

  test('appearance mode selector is present and interactive', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSettings(page);

    // Three mode buttons should be visible: Light, Dark, System
    const lightButton = page.getByRole('button', { name: 'Light' });
    const darkButton = page.getByRole('button', { name: 'Dark' });
    const systemButton = page.getByRole('button', { name: 'System' });

    await expect(lightButton).toBeVisible();
    await expect(darkButton).toBeVisible();
    await expect(systemButton).toBeVisible();

    // Dark mode is the default — its button should have the active style
    await expect(darkButton).toHaveClass(/border-primary/);

    // Click Light — it should become active
    await lightButton.click();
    await expect(lightButton).toHaveClass(/border-primary/);
  });

  test('switching color theme changes data-theme attribute on html', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSettings(page);

    const htmlElement = page.locator('html');

    // Default theme: data-theme attribute should be absent
    const initialTheme = await htmlElement.getAttribute('data-theme');
    // "default" theme removes the attribute entirely
    expect(initialTheme).toBeNull();

    // Scroll to Color Theme section and click the "Ocean" theme swatch
    const oceanButton = page.getByRole('button', { name: 'Ocean' });
    await oceanButton.scrollIntoViewIfNeeded();
    await oceanButton.click();

    // Verify data-theme changed to "ocean"
    await expect(htmlElement).toHaveAttribute('data-theme', 'ocean');

    // Switch to Forest
    const forestButton = page.getByRole('button', { name: 'Forest' });
    await forestButton.click();
    await expect(htmlElement).toHaveAttribute('data-theme', 'forest');

    // Switch back to default (Oscura)
    const defaultButton = page.getByRole('button', { name: 'Oscura' });
    await defaultButton.click();

    // Default removes the attribute
    const resetTheme = await htmlElement.getAttribute('data-theme');
    expect(resetTheme).toBeNull();
  });

  test('dark mode toggle changes class on html', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    const htmlElement = page.locator('html');

    // Default is dark mode — html should have "dark" class
    const hasDarkInitially = await htmlElement.evaluate((el) => el.classList.contains('dark'));
    expect(hasDarkInitially).toBe(true);

    // Click Light to switch mode
    const lightButton = page.getByRole('button', { name: 'Light' });
    await lightButton.click();

    // Now html should have "light" class and no "dark" class
    const hasDarkAfterLight = await htmlElement.evaluate((el) => el.classList.contains('dark'));
    const hasLightAfterLight = await htmlElement.evaluate((el) => el.classList.contains('light'));
    expect(hasDarkAfterLight).toBe(false);
    expect(hasLightAfterLight).toBe(true);

    // Switch back to dark
    const darkButton = page.getByRole('button', { name: 'Dark' });
    await darkButton.click();

    const hasDarkRestored = await htmlElement.evaluate((el) => el.classList.contains('dark'));
    expect(hasDarkRestored).toBe(true);
  });

  test('sidebar background adapts after theme change', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSettings(page);

    const sidebar = page.locator('aside').first();

    // Capture sidebar background before theme change
    const bgBefore = await sidebar.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Switch to Ocean theme
    const oceanButton = page.getByRole('button', { name: 'Ocean' });
    await oceanButton.scrollIntoViewIfNeeded();
    await oceanButton.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');

    // Capture sidebar background after theme change
    const bgAfter = await sidebar.evaluate((el) => getComputedStyle(el).backgroundColor);

    // The background should have changed (different theme = different colors)
    expect(bgAfter).not.toBe(bgBefore);

    // Reset to default
    const defaultButton = page.getByRole('button', { name: 'Oscura' });
    await defaultButton.click();
  });

  test('card backgrounds adapt after theme change', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    // Find an element with bg-card class (settings sections use border-border bg-card)
    const cardElement = page.locator('.bg-card').first();

    // Capture card background before theme change
    const bgBefore = await cardElement.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Switch to Lime theme
    const limeButton = page.getByRole('button', { name: 'Lime' });
    await limeButton.scrollIntoViewIfNeeded();
    await limeButton.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'lime');

    // Capture card background after theme change
    const bgAfter = await cardElement.evaluate((el) => getComputedStyle(el).backgroundColor);

    // The card background should differ between themes
    expect(bgAfter).not.toBe(bgBefore);

    // Reset to default
    const defaultButton = page.getByRole('button', { name: 'Oscura' });
    await defaultButton.click();
  });

  test('background color changes after dark mode toggle', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSettings(page);

    // Capture body/root background in dark mode
    const bgDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Switch to light mode
    const lightButton = page.getByRole('button', { name: 'Light' });
    await lightButton.click();

    // Wait for class change to take effect
    await expect(page.locator('html')).toHaveClass(/light/);

    // Capture body background in light mode
    const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Dark and light backgrounds should differ
    expect(bgLight).not.toBe(bgDark);

    // Restore dark mode
    const darkButton = page.getByRole('button', { name: 'Dark' });
    await darkButton.click();
  });

  test('hub settings section is visible', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    // Scroll to Hub Connection section
    const hubHeading = page.getByText('Hub Connection', { exact: true }).first();
    await hubHeading.scrollIntoViewIfNeeded();
    await expect(hubHeading).toBeVisible();

    // The Hub Connection sub-component should show its heading
    const hubSubHeading = page.getByText('Hub Connection').last();
    await expect(hubSubHeading).toBeVisible();

    // Should show status or connection form
    const statusOrForm =
      (await page.getByText('Connected').isVisible().catch(() => false)) ||
      (await page.getByText('Disconnected').isVisible().catch(() => false)) ||
      (await page.getByText('Hub URL').isVisible().catch(() => false));
    expect(statusOrForm).toBe(true);
  });

  test('profile section is accessible', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    // Profiles section heading
    const profilesHeading = page.getByText('Profiles', { exact: true });
    await profilesHeading.scrollIntoViewIfNeeded();
    await expect(profilesHeading).toBeVisible();

    // "Add Profile" button should be visible
    const addProfileButton = page.getByRole('button', { name: 'Add Profile' });
    await expect(addProfileButton).toBeVisible();
  });

  test('no console errors during theme switching', async ({ authenticatedWindow: page }) => {
    const collector = createConsoleCollector(page);

    await navigateToSettings(page);

    // Perform multiple theme switches to exercise theme system
    const oceanButton = page.getByRole('button', { name: 'Ocean' });
    await oceanButton.scrollIntoViewIfNeeded();
    await oceanButton.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');

    const forestButton = page.getByRole('button', { name: 'Forest' });
    await forestButton.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'forest');

    // Toggle dark/light mode
    const lightButton = page.getByRole('button', { name: 'Light' });
    await lightButton.click();
    await expect(page.locator('html')).toHaveClass(/light/);

    const darkButton = page.getByRole('button', { name: 'Dark' });
    await darkButton.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Switch to another theme while changing modes
    const retroButton = page.getByRole('button', { name: 'Retro' });
    await retroButton.scrollIntoViewIfNeeded();
    await retroButton.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'retro');

    // Reset to default
    const defaultButton = page.getByRole('button', { name: 'Oscura' });
    await defaultButton.click();

    // Assert no unexpected console errors occurred
    assertNoConsoleErrors(collector);
  });
});
