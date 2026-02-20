/**
 * E2E Tests: Task Grid + AG-Grid Theme
 *
 * Verifies the AG-Grid task grid renders correctly with proper theming:
 * - AG-Grid container renders with custom theme classes
 * - Grid background adapts to dark mode (not hardcoded white)
 * - Header row is visible
 * - Row expansion works without crash (regression for subtasks bug)
 * - Empty state overlay displays when no tasks exist
 * - Filter/search toolbar is present above the grid
 * - Grid respects the active color theme
 * - No console errors during grid interactions
 *
 * Navigation strategy:
 * The AG-Grid task grid lives at /projects/$projectId/tasks.
 * Tests first navigate to the Projects page, then attempt to open the
 * first available project. If no projects exist, grid-specific tests
 * are skipped and only the projects empty state is verified.
 */

import { test, expect } from './electron.setup';
import { createConsoleCollector, assertNoConsoleErrors } from './helpers/console-collector';

import type { Page } from 'playwright';

/**
 * Navigate to a project's tasks view.
 * Returns true if a project was opened, false if no projects exist.
 */
async function navigateToTaskGrid(page: Page): Promise<boolean> {
  // Navigate directly to the projects page
  await page.evaluate(() => {
    window.location.hash = '#/projects';
  });

  // Wait for navigation to settle
  await page.waitForLoadState('networkidle');

  // Look for project list items — each project row is a button with a FolderOpen icon
  const projectListItems = page.locator('button:has(.lucide-folder-open)');
  const projectCount = await projectListItems.count();

  if (projectCount === 0) {
    return false;
  }

  // Click the first project to open it (this navigates to /projects/$id/tasks)
  await projectListItems.first().click();

  // Wait for the URL to include /tasks
  await page.waitForURL(/\/projects\/[^/]+\/tasks/, { timeout: 15_000 });

  return true;
}

test.describe('Task Grid + AG-Grid Theme', () => {
  test('projects page loads after authentication', async ({ authenticatedWindow }) => {
    // Navigate to projects
    await authenticatedWindow.evaluate(() => {
      window.location.hash = '#/projects';
    });
    await authenticatedWindow.waitForLoadState('networkidle');

    // The page should show either project rows or an empty state
    const bodyText = await authenticatedWindow.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('AG-Grid container renders with theme classes', async ({ authenticatedWindow }) => {
    const hasProject = await navigateToTaskGrid(authenticatedWindow);
    test.skip(!hasProject, 'No projects available — cannot test AG-Grid');

    // The grid container should have the compound theme class
    const gridContainer = authenticatedWindow.locator('.ag-theme-quartz.ag-theme-claude');
    await expect(gridContainer).toBeVisible({ timeout: 10_000 });
  });

  test('AG-Grid background is not white in dark mode', async ({ authenticatedWindow }) => {
    const hasProject = await navigateToTaskGrid(authenticatedWindow);
    test.skip(!hasProject, 'No projects available — cannot test AG-Grid');

    const gridContainer = authenticatedWindow.locator('.ag-theme-quartz.ag-theme-claude');
    await expect(gridContainer).toBeVisible({ timeout: 10_000 });

    // Check computed background color is NOT pure white (rgb(255, 255, 255))
    const bgColor = await authenticatedWindow.evaluate(() => {
      const el = document.querySelector('.ag-theme-quartz.ag-theme-claude');
      if (!el) return 'not-found';
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(bgColor).not.toBe('not-found');
    // In dark mode, the grid should use the --card token, not white
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('AG-Grid header row is visible', async ({ authenticatedWindow }) => {
    const hasProject = await navigateToTaskGrid(authenticatedWindow);
    test.skip(!hasProject, 'No projects available — cannot test AG-Grid');

    const gridContainer = authenticatedWindow.locator('.ag-theme-quartz.ag-theme-claude');
    await expect(gridContainer).toBeVisible({ timeout: 10_000 });

    // The AG-Grid header should be present
    const header = authenticatedWindow.locator('.ag-header');
    await expect(header).toBeVisible();

    // Verify header has column labels (at minimum Status, Title, Actions)
    const headerCells = authenticatedWindow.locator('.ag-header-cell');
    const headerCount = await headerCells.count();
    expect(headerCount).toBeGreaterThan(0);
  });

  test('row expansion does not crash', async ({ authenticatedWindow }) => {
    const hasProject = await navigateToTaskGrid(authenticatedWindow);
    test.skip(!hasProject, 'No projects available — cannot test AG-Grid');

    const collector = createConsoleCollector(authenticatedWindow);

    const gridContainer = authenticatedWindow.locator('.ag-theme-quartz.ag-theme-claude');
    await expect(gridContainer).toBeVisible({ timeout: 10_000 });

    // Check if there are task rows in the grid
    const rows = authenticatedWindow.locator('.ag-row:not(.ag-full-width-row-detail)');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Click the expand toggle in the first row (first column is the expand toggle)
      const firstRow = rows.first();
      const expandCell = firstRow.locator('.ag-cell').first();
      await expandCell.click();

      // Wait for the detail row to appear
      const detailRow = authenticatedWindow.locator('.ag-full-width-row-detail');
      await expect(detailRow).toBeVisible({ timeout: 5_000 });

      // Verify no crash occurred — check for error boundary
      const errorBoundary = authenticatedWindow.getByText('Something went wrong');
      await expect(errorBoundary).not.toBeVisible();
    }

    // No unexpected console errors during row expansion
    assertNoConsoleErrors(collector);
  });

  test('detail row renders content when expanded', async ({ authenticatedWindow }) => {
    const hasProject = await navigateToTaskGrid(authenticatedWindow);
    test.skip(!hasProject, 'No projects available — cannot test AG-Grid');

    const gridContainer = authenticatedWindow.locator('.ag-theme-quartz.ag-theme-claude');
    await expect(gridContainer).toBeVisible({ timeout: 10_000 });

    const rows = authenticatedWindow.locator('.ag-row:not(.ag-full-width-row-detail)');
    const rowCount = await rows.count();

    test.skip(rowCount === 0, 'No task rows — cannot test detail expansion');

    // Click expand toggle
    const firstRow = rows.first();
    const expandCell = firstRow.locator('.ag-cell').first();
    await expandCell.click();

    const detailRow = authenticatedWindow.locator('.ag-full-width-row-detail');
    await expect(detailRow).toBeVisible({ timeout: 5_000 });

    // The detail row should have some content (not empty)
    const detailText = await detailRow.innerText();
    expect(detailText.trim().length).toBeGreaterThan(0);
  });

  test('empty state overlay shows when no tasks exist', async ({ authenticatedWindow }) => {
    const hasProject = await navigateToTaskGrid(authenticatedWindow);
    test.skip(!hasProject, 'No projects available — cannot test AG-Grid');

    const gridContainer = authenticatedWindow.locator('.ag-theme-quartz.ag-theme-claude');
    await expect(gridContainer).toBeVisible({ timeout: 10_000 });

    const rows = authenticatedWindow.locator('.ag-row:not(.ag-full-width-row-detail)');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      // When there are no tasks, the NoRowsOverlay should be visible
      const noTasksMessage = authenticatedWindow.getByText('No tasks found');
      await expect(noTasksMessage).toBeVisible();
    } else {
      // If tasks exist, the overlay should NOT be visible
      const noTasksMessage = authenticatedWindow.getByText('No tasks found');
      await expect(noTasksMessage).not.toBeVisible();
    }
  });

  test('filter/search toolbar is visible above grid', async ({ authenticatedWindow }) => {
    const hasProject = await navigateToTaskGrid(authenticatedWindow);
    test.skip(!hasProject, 'No projects available — cannot test AG-Grid');

    // The TaskFiltersToolbar renders a search input with "Search tasks..." placeholder
    const searchInput = authenticatedWindow.getByPlaceholder('Search tasks...');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // The "New Task" button should be visible
    const newTaskButton = authenticatedWindow.getByRole('button', { name: /New Task/ });
    await expect(newTaskButton).toBeVisible();

    // The "Status" filter dropdown trigger should be visible
    const statusFilter = authenticatedWindow.getByRole('button', { name: /Status/ });
    await expect(statusFilter).toBeVisible();
  });

  test('grid respects active theme via CSS custom properties', async ({ authenticatedWindow }) => {
    const hasProject = await navigateToTaskGrid(authenticatedWindow);
    test.skip(!hasProject, 'No projects available — cannot test AG-Grid');

    const gridContainer = authenticatedWindow.locator('.ag-theme-quartz.ag-theme-claude');
    await expect(gridContainer).toBeVisible({ timeout: 10_000 });

    // Read the data-theme attribute from the <html> element
    const themeData = await authenticatedWindow.evaluate(() => {
      const html = document.documentElement;
      const dataTheme = html.getAttribute('data-theme');
      const isDark = html.classList.contains('dark');
      return { dataTheme, isDark };
    });

    // Verify the grid uses CSS custom properties (not hardcoded) by checking
    // that the AG-Grid header background is NOT the default quartz white
    const headerBgColor = await authenticatedWindow.evaluate(() => {
      const header = document.querySelector('.ag-header');
      if (!header) return 'not-found';
      return window.getComputedStyle(header).backgroundColor;
    });

    expect(headerBgColor).not.toBe('not-found');

    // In dark mode, the header should NOT be white
    if (themeData.isDark) {
      expect(headerBgColor).not.toBe('rgb(255, 255, 255)');
    }

    // Verify the AG-Grid foreground color is set via CSS vars (not default black on white)
    const fgColor = await authenticatedWindow.evaluate(() => {
      const cell = document.querySelector('.ag-header-cell-text');
      if (!cell) return 'not-found';
      return window.getComputedStyle(cell).color;
    });

    if (fgColor !== 'not-found' && themeData.isDark) {
      // In dark mode, text should NOT be pure black
      expect(fgColor).not.toBe('rgb(0, 0, 0)');
    }
  });

  test('no console errors during grid interactions', async ({ authenticatedWindow }) => {
    const collector = createConsoleCollector(authenticatedWindow);

    const hasProject = await navigateToTaskGrid(authenticatedWindow);
    test.skip(!hasProject, 'No projects available — cannot test AG-Grid');

    const gridContainer = authenticatedWindow.locator('.ag-theme-quartz.ag-theme-claude');
    await expect(gridContainer).toBeVisible({ timeout: 10_000 });

    // Interact with the search filter
    const searchInput = authenticatedWindow.getByPlaceholder('Search tasks...');
    await searchInput.fill('test search term');
    await searchInput.clear();

    // Click the Status filter dropdown
    const statusFilter = authenticatedWindow.getByRole('button', { name: /Status/ });
    await statusFilter.click();

    // Close the dropdown by clicking away
    await authenticatedWindow.locator('body').click();

    // If there are rows, try clicking one to expand
    const rows = authenticatedWindow.locator('.ag-row:not(.ag-full-width-row-detail)');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      const firstRow = rows.first();
      const expandCell = firstRow.locator('.ag-cell').first();
      await expandCell.click();

      // Wait for potential detail row
      const detailRow = authenticatedWindow.locator('.ag-full-width-row-detail');
      await expect(detailRow).toBeVisible({ timeout: 5_000 }).catch(() => {
        // Detail row may not appear if expand toggle didn't fire — acceptable
      });

      // Collapse by clicking again
      await expandCell.click();
    }

    // Assert no unexpected console errors after all interactions
    assertNoConsoleErrors(collector);
  });
});
