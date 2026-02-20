/**
 * 03 — Sidebar Mechanics
 *
 * Verifies sidebar visibility, collapse/expand, active state tracking,
 * Settings footer placement, persistence, and project-scoped item states.
 */

import { test, expect } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import {
  navigateToSettings,
  navigateToSidebarItem,
  PROJECT_NAV_ITEMS,
  toggleSidebarCollapse,
} from './helpers/navigation';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Sidebar Mechanics', () => {
  test('sidebar visible after login', async ({ authenticatedWindow: page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // "ADC" brand text should be visible when sidebar is expanded
    const adcText = sidebar.locator('text=ADC');
    await expect(adcText).toBeVisible();
    await takeScreenshot(page, 'sidebar-expanded');
  });

  test('collapse toggle hides ADC text and narrows sidebar', async ({
    authenticatedWindow: page,
  }) => {
    const sidebar = page.locator('aside');

    // Verify sidebar starts expanded with ADC text visible
    const adcText = sidebar.locator('text=ADC');
    await expect(adcText).toBeVisible();

    // Get initial width for comparison
    const initialBox = await sidebar.boundingBox();
    expect(initialBox).not.toBeNull();

    // Click collapse button
    await page.locator('aside button[aria-label="Collapse sidebar"]').click();

    // ADC text should disappear
    await expect(adcText).not.toBeVisible();

    // Sidebar should be narrower
    const collapsedBox = await sidebar.boundingBox();
    expect(collapsedBox).not.toBeNull();
    expect(collapsedBox!.width).toBeLessThan(initialBox!.width);
    await takeScreenshot(page, 'sidebar-collapsed');
  });

  test('expand toggle restores ADC text', async ({ authenticatedWindow: page }) => {
    const sidebar = page.locator('aside');

    // First collapse
    await page.locator('aside button[aria-label="Collapse sidebar"]').click();
    const adcText = sidebar.locator('text=ADC');
    await expect(adcText).not.toBeVisible();

    // Now expand
    await page.locator('aside button[aria-label="Expand sidebar"]').click();

    // ADC text should reappear
    await expect(adcText).toBeVisible();
  });

  test('active item highlighted on Dashboard', async ({ authenticatedWindow: page }) => {
    // After login we should be on dashboard already
    await navigateToSidebarItem(page, 'Dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // The Dashboard button inside aside nav should have the active style
    const dashboardButton = page.locator('aside nav button', { hasText: 'Dashboard' });
    await expect(dashboardButton).toBeVisible();

    // Check for active style class — bg-accent and font-medium per ACTIVE_STYLE constant
    const classes = await dashboardButton.getAttribute('class');
    expect(classes).toContain('bg-accent');
    expect(classes).toContain('font-medium');
  });

  test('active state changes on navigation', async ({ authenticatedWindow: page }) => {
    // Navigate to Dashboard first
    await navigateToSidebarItem(page, 'Dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    const dashboardButton = page.locator('aside nav button', { hasText: 'Dashboard' });
    const notesButton = page.locator('aside nav button', { hasText: 'Notes' });

    // Dashboard should be active
    const dashboardClassesBefore = await dashboardButton.getAttribute('class');
    expect(dashboardClassesBefore).toContain('bg-accent');

    // Navigate to Notes
    await navigateToSidebarItem(page, 'Notes');
    await expect(page).toHaveURL(/\/notes/);

    // Notes should now be active
    const notesClasses = await notesButton.getAttribute('class');
    expect(notesClasses).toContain('bg-accent');
    expect(notesClasses).toContain('font-medium');

    // Dashboard should no longer be active
    const dashboardClassesAfter = await dashboardButton.getAttribute('class');
    expect(dashboardClassesAfter).not.toContain('bg-accent');
  });

  test('Settings button is in footer outside nav and still clickable', async ({
    authenticatedWindow: page,
  }) => {
    // Settings button is NOT inside <nav>, it's in the sidebar footer
    const settingsInNav = page.locator('aside nav button', { hasText: 'Settings' });
    const settingsInFooter = page.locator('aside button', { hasText: 'Settings' });

    // Should not be inside nav
    await expect(settingsInNav).toHaveCount(0);

    // Should exist in the sidebar footer and be clickable
    await expect(settingsInFooter).toBeVisible();
    await navigateToSettings(page);
    await expect(page).toHaveURL(/\/settings/);
  });

  test('sidebar persists across navigation', async ({ authenticatedWindow: page }) => {
    const sidebar = page.locator('aside');

    // Navigate to several pages, verify sidebar stays visible each time
    const pages = ['Dashboard', 'Briefing', 'Notes', 'Fitness', 'Alerts'];

    for (const label of pages) {
      await navigateToSidebarItem(page, label);
      await expect(sidebar).toBeVisible();
    }

    // Also check after navigating to Settings
    await navigateToSettings(page);
    await expect(sidebar).toBeVisible();
  });

  test('project-scoped items disabled without active project', async ({
    authenticatedWindow: page,
  }) => {
    // Ensure we are on a top-level page (no active project)
    await navigateToSidebarItem(page, 'Dashboard');

    // All project-scoped nav items should be disabled
    for (const label of PROJECT_NAV_ITEMS) {
      const button = page.locator('aside nav button', { hasText: label });
      await expect(button).toBeDisabled();
    }
  });

  test('no console errors throughout sidebar interactions', async ({
    authenticatedWindow: page,
  }) => {
    const collector = createConsoleCollector(page);

    // Perform various sidebar interactions
    await navigateToSidebarItem(page, 'Dashboard');
    await navigateToSidebarItem(page, 'Notes');
    await navigateToSidebarItem(page, 'Fitness');

    // Collapse and expand
    await toggleSidebarCollapse(page);
    await page.waitForTimeout(300);
    await toggleSidebarCollapse(page);
    await page.waitForTimeout(300);

    // Navigate to Settings
    await navigateToSettings(page);

    // Assert no unexpected console errors
    assertNoConsoleErrors(collector);
  });
});
