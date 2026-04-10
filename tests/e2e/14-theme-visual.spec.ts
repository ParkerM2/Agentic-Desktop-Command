/**
 * E2E: Theme Visual Verification
 *
 * Verifies that theme mode switching (dark/light) actually changes computed
 * styles on DOM elements. Goes beyond data-attribute checks to confirm visual
 * rendering by inspecting computed backgroundColor values.
 *
 * Note: Named color themes (Ocean, Forest, etc.) were replaced by the custom
 * theme editor at /settings/themes. Visual theming is now user-defined via
 * CSS custom properties at runtime.
 */

import { test, expect } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToSettings } from './helpers/navigation';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Theme Visual Verification', () => {
  test.afterEach(async ({ authenticatedWindow: page }) => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  });

  test('Default dark mode — html has class "dark" and no data-theme', async ({
    authenticatedWindow: page,
  }) => {
    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('dark');

    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBeNull();
    await takeScreenshot(page, 'theme-default-dark');
  });

  test('Light mode changes body background', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    // Ensure we start in Dark mode
    await page.locator('button', { hasText: 'Dark' }).click();
    await page.waitForTimeout(300);

    const darkBodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Switch to Light mode
    await page.locator('button', { hasText: 'Light' }).click();

    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('light');
    expect(htmlClasses).not.toContain('dark');

    await page.waitForTimeout(300);

    const lightBodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Light mode body should differ from dark mode body
    expect(lightBodyBg).not.toBe(darkBodyBg);
    await takeScreenshot(page, 'theme-light-mode');
  });

  test('Dark mode restores after Light mode', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    // Capture initial Dark mode background
    const initialDarkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Switch to Light, then back to Dark
    await page.locator('button', { hasText: 'Light' }).click();
    await page.waitForTimeout(300);

    await page.locator('button', { hasText: 'Dark' }).click();
    await page.waitForTimeout(300);

    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('dark');

    const restoredDarkBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(restoredDarkBg).toBe(initialDarkBg);
  });

  test('Customize Theme button navigates to theme editor', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSettings(page);

    const customizeButton = page.locator('button', { hasText: 'Customize Theme' });
    await customizeButton.scrollIntoViewIfNeeded();
    await customizeButton.click();

    await expect(page).toHaveURL(/\/settings\/themes/, { timeout: 10_000 });
    await takeScreenshot(page, 'theme-editor-page');
  });

  test('No console errors during theme mode switching', async ({ authenticatedWindow: page }) => {
    const collector = createConsoleCollector(page);

    await navigateToSettings(page);

    // Cycle through all theme modes
    await page.locator('button', { hasText: 'Light' }).click();
    await page.waitForTimeout(200);

    await page.locator('button', { hasText: 'Dark' }).click();
    await page.waitForTimeout(200);

    await page.locator('button', { hasText: 'System' }).click();
    await page.waitForTimeout(200);

    // Switch back to Dark for clean state
    await page.locator('button', { hasText: 'Dark' }).click();
    await page.waitForTimeout(200);

    // Wait for any async errors to surface
    await page.waitForTimeout(1000);

    assertNoConsoleErrors(collector);
  });
});
