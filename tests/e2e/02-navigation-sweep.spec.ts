/**
 * 02 — Navigation Sweep
 *
 * Verifies every top-level sidebar nav item + Settings are reachable
 * via real clicks. No programmatic navigation.
 */

import { test, expect } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import {
  assertPageLoaded,
  navigateToSettings,
  navigateToSidebarItem,
  ROUTE_URL_MAP,
  TOP_LEVEL_NAV_ITEMS,
} from './helpers/navigation';

test.describe('Navigation Sweep', () => {
  test('click Dashboard navigates to /dashboard', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await assertPageLoaded(page);
  });

  test('click Briefing navigates to /briefing', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Briefing');
    await expect(page).toHaveURL(/\/briefing/);
    await assertPageLoaded(page);
  });

  test('click My Work navigates to /my-work', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'My Work');
    await expect(page).toHaveURL(/\/my-work/);
    await assertPageLoaded(page);
  });

  test('click Notes navigates to /notes', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Notes');
    await expect(page).toHaveURL(/\/notes/);
    await assertPageLoaded(page);
  });

  test('click Fitness navigates to /fitness', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Fitness');
    await expect(page).toHaveURL(/\/fitness/);
    await assertPageLoaded(page);
  });

  test('click Planner navigates to /planner', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Planner');
    await expect(page).toHaveURL(/\/planner/);
    await assertPageLoaded(page);
  });

  test('click Productivity navigates to /productivity', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Productivity');
    await expect(page).toHaveURL(/\/productivity/);
    await assertPageLoaded(page);
  });

  test('click Alerts navigates to /alerts', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Alerts');
    await expect(page).toHaveURL(/\/alerts/);
    await assertPageLoaded(page);
  });

  test('click Comms navigates to /communications', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Comms');
    await expect(page).toHaveURL(/\/communications/);
    await assertPageLoaded(page);
  });

  test('click Settings navigates to /settings', async ({ authenticatedWindow: page }) => {
    await navigateToSettings(page);
    await expect(page).toHaveURL(/\/settings/);
    await assertPageLoaded(page);
  });

  test('full sequential sweep — all items, no error boundaries, no console errors', async ({
    authenticatedWindow: page,
  }) => {
    const collector = createConsoleCollector(page);

    // Navigate through every top-level item in order
    for (const label of TOP_LEVEL_NAV_ITEMS) {
      await navigateToSidebarItem(page, label);
      const expectedPath = ROUTE_URL_MAP[label];
      await expect(page).toHaveURL(new RegExp(expectedPath));
      await assertPageLoaded(page);
    }

    // Also hit Settings (in the sidebar footer, not inside nav)
    await navigateToSettings(page);
    await expect(page).toHaveURL(/\/settings/);
    await assertPageLoaded(page);

    // Assert no unexpected console errors accumulated during the sweep
    assertNoConsoleErrors(collector);
  });

  test('every page has content', async ({ authenticatedWindow: page }) => {
    for (const label of TOP_LEVEL_NAV_ITEMS) {
      await navigateToSidebarItem(page, label);
      await page.waitForLoadState('networkidle');

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(0);
    }

    // Settings page also has content
    await navigateToSettings(page);
    await page.waitForLoadState('networkidle');

    const settingsText = await page.locator('body').innerText();
    expect(settingsText.trim().length).toBeGreaterThan(0);
  });
});
