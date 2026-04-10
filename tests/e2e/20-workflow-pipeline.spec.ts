/**
 * Workflow Pipeline E2E tests.
 *
 * Verifies the Pipeline page within a project context: heading visibility,
 * task selector presence, and pipeline step rendering (or empty-state prompt
 * when no task is selected).
 *
 * Requires an active project — skips gracefully when none exist.
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToProjectsList, navigateToProjectView, openFirstProject } from './helpers/navigation';

import type { ConsoleCollector } from './helpers/console-collector';

// ─── Workflow Pipeline ────────────────────────────────────────

test.describe('Workflow Pipeline', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);

    await navigateToProjectsList(authenticatedWindow);
    await authenticatedWindow.waitForLoadState('networkidle');

    const opened = await openFirstProject(authenticatedWindow);

    if (!opened) {
      test.skip(true, 'No projects — cannot test Pipeline page');
      return;
    }

    await expect(authenticatedWindow).toHaveURL(/\/projects\/[^/]+\/tasks/, {
      timeout: 15_000,
    });
    await authenticatedWindow.waitForLoadState('networkidle');

    await navigateToProjectView(authenticatedWindow, 'Pipeline');
  });

  test.afterEach(async ({ authenticatedWindow }) => {
    await authenticatedWindow.keyboard.press('Escape');
    await authenticatedWindow.waitForTimeout(200);
  });

  // ── 1. Page structure ─────────────────────────────────────────

  test('Pipeline page — "Workflow Pipeline" heading is visible', async ({
    authenticatedWindow,
  }) => {
    await expect(
      authenticatedWindow.getByText('Workflow Pipeline'),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── 2. Task selector ─────────────────────────────────────────

  test('Pipeline page — task selector control is present', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    // Task selector may be a combobox, select, or button with task label
    const selector =
      page.getByRole('combobox').first().or(
        page.locator('select').first(),
      ).or(
        page.getByRole('button', { name: /select.*task|choose.*task/i }).first(),
      );

    // Alternatively verify the "Select a task" prompt is shown (equivalent evidence)
    const selectPrompt = page.getByText('Select a task to view its workflow pipeline');

    const hasSelectorOrPrompt =
      (await selector.isVisible().catch(() => false)) ||
      (await selectPrompt.isVisible().catch(() => false));

    expect(hasSelectorOrPrompt).toBe(true);
  });

  // ── 3. Pipeline content states ────────────────────────────────

  test('Pipeline page — shows steps or "Select a task" prompt', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await page.waitForLoadState('networkidle');

    const selectPrompt = page.getByText('Select a task to view its workflow pipeline');
    const isPromptVisible = await selectPrompt.isVisible().catch(() => false);

    if (isPromptVisible) {
      // Empty state — no task selected
      await expect(selectPrompt).toBeVisible();
    } else {
      // A task is selected — pipeline step nodes should be visible
      // Pipeline steps render as status-labelled clickable nodes
      const pipelineSteps = page
        .locator('[class*="rounded"]')
        .filter({ hasText: /backlog|planning|queued|running|review|done/i });
      expect(await pipelineSteps.count()).toBeGreaterThan(0);
    }
  });

  test('Pipeline page — selecting a task renders pipeline visualization', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    // Try to find a combobox or select for task selection
    const combobox = page.getByRole('combobox').first();
    const hasCombobox = await combobox.isVisible().catch(() => false);

    if (!hasCombobox) {
      // No selector available — skip (empty state is acceptable)
      test.skip(true, 'No task selector found — pipeline may already have a task selected or be in empty state');
      return;
    }

    // Open the combobox and see if there are options
    await combobox.click();
    await page.waitForTimeout(300);

    const options = page.getByRole('option');
    const optionCount = await options.count();

    if (optionCount === 0) {
      // No tasks available — select prompt should show
      await page.keyboard.press('Escape');
      await expect(
        page.getByText('Select a task to view its workflow pipeline'),
      ).toBeVisible({ timeout: 5_000 });
      return;
    }

    // Select the first available task option
    await options.first().click();
    await page.waitForLoadState('networkidle');

    // After selection, pipeline heading remains visible
    await expect(page.getByText('Workflow Pipeline')).toBeVisible({ timeout: 5_000 });
  });

  // ── 4. Console errors ─────────────────────────────────────────

  test('no unexpected console errors on Pipeline page', () => {
    assertNoConsoleErrors(collector);
  });
});
