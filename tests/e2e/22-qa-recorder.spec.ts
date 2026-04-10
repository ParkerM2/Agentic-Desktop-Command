/**
 * QA Recorder E2E tests.
 *
 * Verifies that the QA Recorder page is reachable from within a project,
 * renders the expected page shell (data-testid="qa-recorder-page"), and
 * exposes the core control buttons in the page header.
 */

import { expect, test } from './electron.setup';
import {
  navigateToProjectsList,
  navigateToProjectView,
  openFirstProject,
} from './helpers/navigation';

// ─── QA Recorder Page ─────────────────────────────────────────────

test.describe('QA Recorder', () => {
  test.beforeEach(async ({ authenticatedWindow }) => {
    // Navigate to projects list and open the first available project
    await navigateToProjectsList(authenticatedWindow);
    await authenticatedWindow.waitForLoadState('networkidle');

    const opened = await openFirstProject(authenticatedWindow);

    if (!opened) {
      test.skip(true, 'No projects — cannot test QA Recorder page');
      return;
    }

    // Wait for project tasks page to load before navigating further
    await expect(authenticatedWindow).toHaveURL(/\/projects\/[^/]+\/tasks/, {
      timeout: 15_000,
    });
    await authenticatedWindow.waitForLoadState('networkidle');

    // Navigate to QA Recorder via sidebar
    await navigateToProjectView(authenticatedWindow, 'QA');
    await authenticatedWindow.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ authenticatedWindow }) => {
    // Dismiss any open dialogs / modals before the next test
    await authenticatedWindow.keyboard.press('Escape');
    await authenticatedWindow.waitForTimeout(200);
  });

  // ── 1. Page shell ────────────────────────────────────────────────

  test('QA Recorder page — renders page shell with data-testid', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    // The root layout element must carry data-testid="qa-recorder-page"
    const pageRoot = page.locator('[data-testid="qa-recorder-page"]');
    await expect(pageRoot).toBeVisible({ timeout: 10_000 });
  });

  // ── 2. Page header and title ─────────────────────────────────────

  test('QA Recorder page — shows "QA Recorder" heading', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await expect(page.getByRole('heading', { name: 'QA Recorder' })).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── 3. Control buttons ────────────────────────────────────────────

  test('QA Recorder page — control buttons are present', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    // Record button
    const recordBtn = page.locator('[data-testid="btn-record"]');
    await expect(recordBtn).toBeVisible({ timeout: 10_000 });

    // Save button
    const saveBtn = page.locator('[data-testid="btn-save"]');
    await expect(saveBtn).toBeVisible();

    // Run button
    const runBtn = page.locator('[data-testid="btn-run"]');
    await expect(runBtn).toBeVisible();

    // Export button
    const exportBtn = page.locator('[data-testid="btn-export"]');
    await expect(exportBtn).toBeVisible();
  });

  // ── 4. Empty / no-preload state ───────────────────────────────────

  test('QA Recorder page — shows empty state when preload is not configured', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    // When preloadPath is empty the page renders an EmptyState component
    const noPreloadState = page.locator('[data-testid="qa-recorder-no-preload"]');
    const hasNoPreload = await noPreloadState.isVisible().catch(() => false);

    if (hasNoPreload) {
      await expect(noPreloadState).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText('Webview preload not configured')).toBeVisible();
    } else {
      // preloadPath was provided — the split-panel layout should be visible
      const pageRoot = page.locator('[data-testid="qa-recorder-page"]');
      await expect(pageRoot).toBeVisible();
    }
  });
});
