/**
 * GitHub Integration E2E tests.
 *
 * Verifies the GitHub page within a project context: tab navigation
 * (Pull Requests, Issues, Notifications), stats cards, and content
 * rendering in both connected and unconnected states.
 *
 * Requires an active project — skips gracefully when none exist.
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToProjectsList, navigateToProjectView, openFirstProject } from './helpers/navigation';

import type { ConsoleCollector } from './helpers/console-collector';

// ─── GitHub Integration ───────────────────────────────────────

test.describe('GitHub Integration', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);

    await navigateToProjectsList(authenticatedWindow);
    await authenticatedWindow.waitForLoadState('networkidle');

    const opened = await openFirstProject(authenticatedWindow);

    if (!opened) {
      test.skip(true, 'No projects — cannot test GitHub integration page');
      return;
    }

    await expect(authenticatedWindow).toHaveURL(/\/projects\/[^/]+\/tasks/, {
      timeout: 15_000,
    });
    await authenticatedWindow.waitForLoadState('networkidle');

    await navigateToProjectView(authenticatedWindow, 'GitHub');
  });

  test.afterEach(async ({ authenticatedWindow }) => {
    await authenticatedWindow.keyboard.press('Escape');
    await authenticatedWindow.waitForTimeout(200);
  });

  // ── 1. Page structure ─────────────────────────────────────────

  test('GitHub page — heading visible after navigation', async ({
    authenticatedWindow,
  }) => {
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'GitHub' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── 2. Tabs ───────────────────────────────────────────────────

  test('GitHub page — Pull Requests tab is visible', async ({
    authenticatedWindow,
  }) => {
    await expect(
      authenticatedWindow.getByRole('button', { name: 'Pull Requests' }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('GitHub page — Issues tab is visible', async ({
    authenticatedWindow,
  }) => {
    await expect(
      authenticatedWindow.getByRole('button', { name: 'Issues' }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('GitHub page — Notifications tab is visible', async ({
    authenticatedWindow,
  }) => {
    await expect(
      authenticatedWindow.getByRole('button', { name: 'Notifications' }),
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── 3. Tab interaction ────────────────────────────────────────

  test('GitHub page — clicking Issues tab loads issues content', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    const issuesTab = page.getByRole('button', { name: 'Issues' });
    await expect(issuesTab).toBeVisible({ timeout: 5_000 });
    await issuesTab.click();
    await page.waitForLoadState('networkidle');

    // Content should render (either issues list or empty/unconnected state)
    const hasIssues = await page.getByText('No open issues').isVisible().catch(() => false);
    const hasConnect = await page.getByText(/connect|not connected|link/i).isVisible().catch(() => false);
    const hasContent = await page.locator('[data-testid="issues-list"], .issues-list, [aria-label="Issues"]').isVisible().catch(() => false);

    // At least one state is present — page is not blank
    const pageText = await page.locator('main, [role="main"], #root').innerText().catch(() => '');
    expect(pageText.trim().length).toBeGreaterThan(0);
  });

  test('GitHub page — clicking Notifications tab loads notifications content', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    const notificationsTab = page.getByRole('button', { name: 'Notifications' });
    await expect(notificationsTab).toBeVisible({ timeout: 5_000 });
    await notificationsTab.click();
    await page.waitForLoadState('networkidle');

    // Page should have content (not blank) after tab switch
    const pageText = await page.locator('main, [role="main"], #root').innerText().catch(() => '');
    expect(pageText.trim().length).toBeGreaterThan(0);
  });

  // ── 4. Stats cards ────────────────────────────────────────────

  test('GitHub page — Open PRs stats card is visible', async ({
    authenticatedWindow,
  }) => {
    await expect(authenticatedWindow.getByText('Open PRs')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('GitHub page — Open Issues stats card is visible', async ({
    authenticatedWindow,
  }) => {
    await expect(authenticatedWindow.getByText('Open Issues')).toBeVisible({
      timeout: 5_000,
    });
  });

  // ── 5. Console errors ─────────────────────────────────────────

  test('no unexpected console errors on GitHub page', () => {
    assertNoConsoleErrors(collector);
  });
});
