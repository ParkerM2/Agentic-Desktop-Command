/**
 * E2E: Theme Visual Verification
 *
 * Verifies that theme switching (color themes + appearance modes) actually
 * changes computed styles on DOM elements. Goes beyond data-attribute checks
 * to confirm visual rendering by inspecting computed backgroundColor values.
 */

import { test, expect } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToSettings } from './helpers/navigation';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Theme Visual Verification', () => {
  test('Default dark mode — html has class "dark" and no data-theme', async ({
    authenticatedWindow: page,
  }) => {
    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('dark');

    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBeNull();
    await takeScreenshot(page, 'theme-default-dark');
  });

  test('Ocean theme changes sidebar background', async ({ authenticatedWindow: page }) => {
    // Capture default sidebar background before any theme change
    const defaultSidebarBg = await page.evaluate(() => {
      const sidebar = document.querySelector('aside');
      return sidebar ? getComputedStyle(sidebar).backgroundColor : null;
    });
    expect(defaultSidebarBg).not.toBeNull();

    // Navigate to Settings and apply Ocean theme
    await navigateToSettings(page);

    const oceanButton = page.locator('button', { hasText: 'Ocean' });
    await oceanButton.scrollIntoViewIfNeeded();
    await oceanButton.click();

    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBe('ocean');

    // Capture sidebar background after Ocean theme applied
    const oceanSidebarBg = await page.evaluate(() => {
      const sidebar = document.querySelector('aside');
      return sidebar ? getComputedStyle(sidebar).backgroundColor : null;
    });
    expect(oceanSidebarBg).not.toBeNull();
    expect(oceanSidebarBg).not.toBe(defaultSidebarBg);
    await takeScreenshot(page, 'theme-ocean-dark');
  });

  test('Forest theme changes card background', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    // Apply Ocean first to get a baseline
    const oceanButton = page.locator('button', { hasText: 'Ocean' });
    await oceanButton.scrollIntoViewIfNeeded();
    await oceanButton.click();

    // Wait for theme to settle
    await page.waitForTimeout(300);

    const oceanCardBg = await page.evaluate(() => {
      const card = document.querySelector('.bg-card');
      return card ? getComputedStyle(card).backgroundColor : null;
    });

    // Now switch to Forest
    const forestButton = page.locator('button', { hasText: 'Forest' });
    await forestButton.scrollIntoViewIfNeeded();
    await forestButton.click();

    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBe('forest');

    // Wait for theme to settle
    await page.waitForTimeout(300);

    const forestCardBg = await page.evaluate(() => {
      const card = document.querySelector('.bg-card');
      return card ? getComputedStyle(card).backgroundColor : null;
    });

    // Forest and Ocean should have different card backgrounds
    if (oceanCardBg !== null && forestCardBg !== null) {
      expect(forestCardBg).not.toBe(oceanCardBg);
    }
    await takeScreenshot(page, 'theme-forest-dark');
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

  test('Reset defaults — Oscura theme removes data-theme', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSettings(page);

    // Ensure Dark mode
    await page.locator('button', { hasText: 'Dark' }).click();

    // Apply a non-default theme first
    const oceanButton = page.locator('button', { hasText: 'Ocean' });
    await oceanButton.scrollIntoViewIfNeeded();
    await oceanButton.click();
    expect(await page.locator('html').getAttribute('data-theme')).toBe('ocean');

    // Click Oscura to reset
    const oscuraButton = page.locator('button', { hasText: 'Oscura' });
    await oscuraButton.scrollIntoViewIfNeeded();
    await oscuraButton.click();

    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBeNull();

    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('dark');
  });

  test('No console errors during theme switching', async ({ authenticatedWindow: page }) => {
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

    // Cycle through all color themes
    const themeLabels = ['Oscura', 'Dusk', 'Lime', 'Ocean', 'Retro', 'Neo', 'Forest'];
    for (const label of themeLabels) {
      const button = page.locator('button', { hasText: label });
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await page.waitForTimeout(200);
    }

    // Reset to defaults
    const oscuraButton = page.locator('button', { hasText: 'Oscura' });
    await oscuraButton.scrollIntoViewIfNeeded();
    await oscuraButton.click();

    // Wait for any async errors to surface
    await page.waitForTimeout(1000);

    assertNoConsoleErrors(collector);
  });
});
