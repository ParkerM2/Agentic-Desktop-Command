/**
 * E2E: Settings Page — Full sweep
 *
 * Verifies all Settings page sections render correctly,
 * theme mode toggling works (light/dark), color theme switching
 * applies data-theme attributes, and interactive controls are visible.
 */

import { test, expect } from './electron.setup';

import { createConsoleCollector, assertNoConsoleErrors } from './helpers/console-collector';
import { navigateToSettings } from './helpers/navigation';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Settings Page', () => {
  test('Settings loads via sidebar footer click', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);
    await expect(page).toHaveURL(/\/settings/);
  });

  test('Settings heading visible', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);
    const heading = page.locator('h1', { hasText: 'Settings' });
    await expect(heading).toBeVisible();
  });

  test('Appearance section visible', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);
    const sectionHeading = page.locator('h2', { hasText: 'Appearance' });
    await expect(sectionHeading).toBeVisible();
  });

  test('Light, Dark, System mode buttons visible', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    await expect(page.locator('button', { hasText: 'Light' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Dark' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'System' })).toBeVisible();
  });

  test('Click Light mode applies light class to html', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    await page.locator('button', { hasText: 'Light' }).click();

    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('light');
    expect(htmlClasses).not.toContain('dark');
    await takeScreenshot(page, 'settings-light-mode');
  });

  test('Click Dark mode applies dark class to html', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    // First switch to Light so we can verify Dark toggle works
    await page.locator('button', { hasText: 'Light' }).click();
    await page.locator('button', { hasText: 'Dark' }).click();

    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('dark');
    await takeScreenshot(page, 'settings-dark-mode');
  });

  test('Color Theme section visible', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    const sectionHeading = page.locator('h2', { hasText: 'Color Theme' });
    await sectionHeading.scrollIntoViewIfNeeded();
    await expect(sectionHeading).toBeVisible();
  });

  test('Click Ocean theme swatch sets data-theme="ocean"', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSettings(page);

    const oceanButton = page.locator('button', { hasText: 'Ocean' });
    await oceanButton.scrollIntoViewIfNeeded();
    await oceanButton.click();

    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBe('ocean');
    await takeScreenshot(page, 'settings-ocean-theme');
  });

  test('Switch to Forest theme sets data-theme="forest"', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSettings(page);

    const forestButton = page.locator('button', { hasText: 'Forest' });
    await forestButton.scrollIntoViewIfNeeded();
    await forestButton.click();

    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBe('forest');
  });

  test('Reset to Oscura (default) removes data-theme', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    // First set a non-default theme
    const oceanButton = page.locator('button', { hasText: 'Ocean' });
    await oceanButton.scrollIntoViewIfNeeded();
    await oceanButton.click();

    // Now click Oscura to reset
    const oscuraButton = page.locator('button', { hasText: 'Oscura' });
    await oscuraButton.scrollIntoViewIfNeeded();
    await oscuraButton.click();

    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBeNull();
  });

  test('UI Scale section visible with range input', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    const sectionHeading = page.locator('h2', { hasText: 'UI Scale' });
    await sectionHeading.scrollIntoViewIfNeeded();
    await expect(sectionHeading).toBeVisible();

    const rangeInput = page.locator('input[type="range"][aria-label="UI scale percentage"]');
    await expect(rangeInput).toBeVisible();
  });

  test('Typography section visible with font controls', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    const fontFamilyHeading = page.locator('h2', { hasText: 'Font Family' });
    await fontFamilyHeading.scrollIntoViewIfNeeded();
    await expect(fontFamilyHeading).toBeVisible();

    // Font family dropdown (combobox)
    const fontDropdown = page.locator('button[role="combobox"][aria-label="Select font family"]');
    await expect(fontDropdown).toBeVisible();

    // Font size section
    const fontSizeHeading = page.locator('h2', { hasText: 'Font Size' });
    await fontSizeHeading.scrollIntoViewIfNeeded();
    await expect(fontSizeHeading).toBeVisible();

    const fontSizeRange = page.locator('input[type="range"][aria-label="Font size in pixels"]');
    await expect(fontSizeRange).toBeVisible();
  });

  test('Language section visible with English', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    const languageHeading = page.locator('h2', { hasText: 'Language' });
    await languageHeading.scrollIntoViewIfNeeded();
    await expect(languageHeading).toBeVisible();

    await expect(page.locator('text=English')).toBeVisible();
    await expect(page.locator('text=Only language available')).toBeVisible();
  });

  test('Hub Connection section visible with status', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    const hubHeading = page.locator('h2', { hasText: 'Hub Connection' }).first();
    await hubHeading.scrollIntoViewIfNeeded();
    await expect(hubHeading).toBeVisible();

    // Should show either connection form or connected status
    const hubContent = page.locator('text=Hub Connection').first();
    await expect(hubContent).toBeVisible();
  });

  test('Profiles section visible', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    const profilesHeading = page.locator('h2', { hasText: 'Profiles' });
    await profilesHeading.scrollIntoViewIfNeeded();
    await expect(profilesHeading).toBeVisible();
  });

  test('Storage Management section visible', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    const storageHeading = page.locator('h2', { hasText: 'Storage Management' });
    await storageHeading.scrollIntoViewIfNeeded();
    await expect(storageHeading).toBeVisible();
  });

  test('About section visible with ADC version text', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);

    const aboutHeading = page.locator('h2', { hasText: 'About' });
    await aboutHeading.scrollIntoViewIfNeeded();
    await expect(aboutHeading).toBeVisible();

    await expect(page.locator('text=ADC v0.1.0')).toBeVisible();
  });

  test('Reset to Dark mode and Oscura theme as defaults', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSettings(page);

    // Ensure Dark mode
    await page.locator('button', { hasText: 'Dark' }).click();
    const htmlClasses = await page.locator('html').getAttribute('class');
    expect(htmlClasses).toContain('dark');

    // Ensure Oscura (default) color theme
    const oscuraButton = page.locator('button', { hasText: 'Oscura' });
    await oscuraButton.scrollIntoViewIfNeeded();
    await oscuraButton.click();

    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBeNull();
  });

  test('No console errors during settings interaction', async ({ authenticatedWindow: page }) => {
    const collector = createConsoleCollector(page);

    await navigateToSettings(page);

    // Exercise various sections to trigger any lazy-loaded errors
    await page.locator('button', { hasText: 'Light' }).click();
    await page.locator('button', { hasText: 'Dark' }).click();

    const oceanButton = page.locator('button', { hasText: 'Ocean' });
    await oceanButton.scrollIntoViewIfNeeded();
    await oceanButton.click();

    const oscuraButton = page.locator('button', { hasText: 'Oscura' });
    await oscuraButton.scrollIntoViewIfNeeded();
    await oscuraButton.click();

    // Scroll to bottom to trigger all lazy sections
    const aboutHeading = page.locator('h2', { hasText: 'About' });
    await aboutHeading.scrollIntoViewIfNeeded();

    // Wait briefly for any async errors to surface
    await page.waitForTimeout(1000);

    assertNoConsoleErrors(collector);
  });
});
