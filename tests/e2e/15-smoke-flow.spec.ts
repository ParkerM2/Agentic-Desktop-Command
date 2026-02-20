/**
 * 15 — Full Smoke Flow
 *
 * ONE sequential canary test that walks the entire app via real clicks.
 * If this test passes, the core app is functional end-to-end.
 *
 * Steps:
 * 1. Dashboard (already here after login)
 * 2. All top-level sidebar items (Dashboard -> Briefing -> ... -> Comms)
 * 3. Projects list via TopBar "+" button, open first project if available
 * 4. Project-scoped sidebar items (Tasks -> Terminals -> ... -> Insights)
 * 5. Settings via sidebar footer, theme switching
 * 6. Keyboard shortcuts (Ctrl+K CommandBar, Ctrl+J Assistant)
 * 7. Return to Dashboard
 * 8. Assert clean console
 */

import { test, expect } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import {
  assertPageLoaded,
  navigateToProjectView,
  navigateToProjectsList,
  navigateToSettings,
  navigateToSidebarItem,
  openFirstProject,
  PROJECT_NAV_ITEMS,
  ROUTE_URL_MAP,
  TOP_LEVEL_NAV_ITEMS,
} from './helpers/navigation';
import { waitForPageContent } from './helpers/page-helpers';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Full Smoke Flow', () => {
  test('complete app walkthrough via real clicks', async ({ authenticatedWindow }) => {
    test.setTimeout(180_000); // 3 minutes for full walkthrough
    const page = authenticatedWindow;
    const collector = createConsoleCollector(page);

    // ── Step 1: Dashboard (already here after login) ──────────────────
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Verify sidebar is visible
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Verify page has content (greeting header or dashboard widgets)
    await assertPageLoaded(page);
    await takeScreenshot(page, 'smoke-dashboard');

    // ── Step 2: Click through ALL top-level sidebar items ─────────────
    for (const label of TOP_LEVEL_NAV_ITEMS) {
      await navigateToSidebarItem(page, label);
      const expectedPath = ROUTE_URL_MAP[label];
      await expect(page).toHaveURL(new RegExp(expectedPath), { timeout: 10_000 });
      await assertPageLoaded(page);
      await waitForPageContent(page);
    }

    // ── Step 3: Navigate to Projects via TopBar "+" button ────────────
    await navigateToProjectsList(page);
    await expect(page).toHaveURL(/\/projects/, { timeout: 10_000 });
    await assertPageLoaded(page);

    const projectOpened = await openFirstProject(page);

    // ── Step 4: Project-scoped sidebar items (if a project was opened) ─
    if (projectOpened) {
      await expect(page).toHaveURL(/\/projects\/[^/]+\/tasks/, { timeout: 15_000 });
      await assertPageLoaded(page);

      // Walk through all project-scoped nav items
      for (const label of PROJECT_NAV_ITEMS) {
        await navigateToProjectView(page, label);
        await assertPageLoaded(page);
        await waitForPageContent(page);
      }
      await takeScreenshot(page, 'smoke-project-scoped');
    }

    // ── Step 5: Settings via sidebar footer ───────────────────────────
    await navigateToSettings(page);
    await expect(page).toHaveURL(/\/settings/, { timeout: 10_000 });
    await assertPageLoaded(page);

    // Switch to Ocean theme
    const oceanButton = page.locator('button', { hasText: 'Ocean' });
    await oceanButton.scrollIntoViewIfNeeded();
    await oceanButton.click();

    const dataThemeAfterOcean = await page.locator('html').getAttribute('data-theme');
    expect(dataThemeAfterOcean).toBe('ocean');
    await takeScreenshot(page, 'smoke-settings-ocean');

    // Reset to Oscura (default)
    const oscuraButton = page.locator('button', { hasText: 'Oscura' });
    await oscuraButton.scrollIntoViewIfNeeded();
    await oscuraButton.click();

    const dataThemeAfterReset = await page.locator('html').getAttribute('data-theme');
    expect(dataThemeAfterReset).toBeNull();

    // ── Step 6: Keyboard shortcuts ───────────────────────────────────

    // Navigate away from Settings first so CommandBar input is accessible
    await navigateToSidebarItem(page, 'Dashboard');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Ctrl+K — focus CommandBar
    const commandInput = page.getByPlaceholder('Ask Claude... (notes, tasks, reminders)');
    await page.keyboard.press('Control+k');
    await expect(commandInput).toBeFocused({ timeout: 5_000 });

    // Escape — dismiss CommandBar focus
    await page.keyboard.press('Escape');

    // Ctrl+J — open Assistant panel
    await page.keyboard.press('Control+j');
    const assistantHeading = page.getByRole('heading', { name: 'Assistant' });
    await expect(assistantHeading).toBeVisible({ timeout: 10_000 });

    // Ctrl+J again — close Assistant panel
    await page.keyboard.press('Control+j');
    await expect(assistantHeading).not.toBeVisible({ timeout: 5_000 });

    // ── Step 7: Return to Dashboard ──────────────────────────────────
    await navigateToSidebarItem(page, 'Dashboard');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    await assertPageLoaded(page);

    // ── Step 8: Assert clean console ─────────────────────────────────
    assertNoConsoleErrors(collector);
  });
});
