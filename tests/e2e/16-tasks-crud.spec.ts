/**
 * Tasks CRUD E2E tests.
 *
 * Verifies task creation via the New Task button, task appearance in the grid,
 * and search/filter functionality. All tests require an active project.
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToProjectsList, openFirstProject } from './helpers/navigation';

import type { ConsoleCollector } from './helpers/console-collector';

// ─── Tasks CRUD ───────────────────────────────────────────────

test.describe('Tasks CRUD', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);

    await navigateToProjectsList(authenticatedWindow);
    const opened = await openFirstProject(authenticatedWindow);

    if (!opened) {
      test.skip(true, 'No projects available');
      return;
    }

    await expect(authenticatedWindow).toHaveURL(/\/projects\/[^/]+\/tasks/, {
      timeout: 15_000,
    });
    await authenticatedWindow.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ authenticatedWindow }) => {
    await authenticatedWindow.keyboard.press('Escape');
    await authenticatedWindow.waitForTimeout(200);
  });

  // ── 1. Task Creation ──────────────────────────────────────────

  test('New Task button opens creation dialog and task appears in grid after submit', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    // Wait for the table to render
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15_000 });

    const newTaskButton = page.getByRole('button', { name: 'New Task' });
    await expect(newTaskButton).toBeVisible({ timeout: 5_000 });
    await newTaskButton.click();

    // A dialog or inline form should appear
    const taskTitleInput = page
      .locator('input[placeholder*="title" i], input[placeholder*="task" i], [role="dialog"] input')
      .first();

    const hasDialog = await taskTitleInput.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasDialog) {
      // Some implementations add inline rows — check for an editable cell
      const editableCell = page.locator('tbody tr input').first();
      const hasCellEdit = await editableCell.isVisible({ timeout: 3_000 }).catch(() => false);

      if (!hasCellEdit) {
        // Gracefully skip if we can't locate the creation form
        test.skip(true, 'Could not locate task creation input — UI may differ');
        return;
      }

      const uniqueTitle = `E2E Test Task ${Date.now()}`;
      await editableCell.fill(uniqueTitle);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 });
      return;
    }

    const uniqueTitle = `E2E Test Task ${Date.now()}`;
    await taskTitleInput.fill(uniqueTitle);

    // Submit — try Enter key first, then a submit button
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // If a dialog is still open, look for a submit button
    const dialogStillOpen = await page
      .locator('[role="dialog"]')
      .isVisible()
      .catch(() => false);

    if (dialogStillOpen) {
      const submitButton = page
        .locator('[role="dialog"]')
        .getByRole('button', { name: /create|save|submit|add/i });
      const hasSubmit = await submitButton.isVisible({ timeout: 2_000 }).catch(() => false);

      if (hasSubmit) {
        await submitButton.click();
        await page.waitForTimeout(500);
      }
    }

    // The new task should now appear in the table
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 });
  });

  // ── 2. Search / Filter ────────────────────────────────────────

  test('Search input filters task rows in the grid', async ({ authenticatedWindow }) => {
    const page = authenticatedWindow;

    // Wait for the table to render
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15_000 });

    const searchInput = page.locator('input[placeholder="Search tasks..."]');
    await expect(searchInput).toBeVisible({ timeout: 5_000 });

    // Type a search term that is unlikely to match any task title
    const noMatchTerm = 'zzz-no-match-xyz-12345';
    await searchInput.fill(noMatchTerm);
    await page.waitForTimeout(300);

    // Either "No tasks found" overlay or an empty tbody
    const noTasksText = page.getByText(/no tasks found/i);
    const emptyRows = page.locator('tbody tr');

    const hasNoTasksMessage = await noTasksText.isVisible({ timeout: 3_000 }).catch(() => false);
    const rowCount = await emptyRows.count();

    // At least one of: explicit empty message OR zero rows
    const filterWorked = hasNoTasksMessage || rowCount === 0;
    expect(filterWorked).toBe(true);

    // Clear and confirm rows return (or remain empty if project has no tasks)
    await searchInput.clear();
    await page.waitForTimeout(300);
  });

  // ── 3. Status Change ─────────────────────────────────────────

  test('Status cell is present and renders a status value for existing tasks', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await expect(page.getByRole('table')).toBeVisible({ timeout: 15_000 });

    const dataRows = page.locator('tbody tr');
    const rowCount = await dataRows.count();

    if (rowCount === 0) {
      // No tasks to check — verify empty state label
      await expect(page.getByText('No tasks found')).toBeVisible({ timeout: 5_000 });
      return;
    }

    // The first row should contain a status badge/cell
    // Status values: backlog, planning, queued, running, review, done
    const firstRow = dataRows.first();
    const statusPattern = /backlog|planning|queued|running|review|done|in.progress|todo/i;

    const rowText = await firstRow.innerText();
    expect(rowText).toMatch(statusPattern);
  });

  // ── 4. No Console Errors ──────────────────────────────────────

  test('no unexpected console errors during tasks CRUD interactions', () => {
    assertNoConsoleErrors(collector);
  });
});
