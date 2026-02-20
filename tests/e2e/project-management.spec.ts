/**
 * E2E Tests: Project Management
 *
 * Verifies the project list page:
 * - Page loads at /projects
 * - Init Wizard button visible
 * - New Project button visible
 * - Empty state or project rows rendered
 * - Clicking a project navigates to tasks view
 * - No console errors
 *
 * Note: Projects is NOT a top-level sidebar nav item.
 * We navigate to /projects programmatically via the router.
 */
import { test, expect } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { assertPageLoaded } from './helpers/navigation';

import type { Page } from 'playwright';

/**
 * Navigate to the /projects route.
 *
 * Since Projects is not in the sidebar, we use the app's internal router
 * to navigate programmatically.
 */
async function navigateToProjects(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.history.pushState({}, '', '/projects');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForURL(/\/projects/, { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Project Management', () => {
  test('projects page loads', async ({ authenticatedWindow }) => {
    const page = authenticatedWindow;
    const console = createConsoleCollector(page);

    await navigateToProjects(page);
    await assertPageLoaded(page);

    // Verify the page heading
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    assertNoConsoleErrors(console);
  });

  test('Init Wizard button is visible', async ({ authenticatedWindow }) => {
    const page = authenticatedWindow;

    await navigateToProjects(page);

    // The "Init Wizard" button should be visible in the page header
    await expect(page.getByRole('button', { name: 'Init Wizard' })).toBeVisible();
  });

  test('New Project button is visible', async ({ authenticatedWindow }) => {
    const page = authenticatedWindow;

    await navigateToProjects(page);

    // The "New Project" button should be visible in the page header
    await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible();
  });

  test('shows empty state or project list', async ({ authenticatedWindow }) => {
    const page = authenticatedWindow;

    await navigateToProjects(page);

    // Wait for loading to complete (loader spinner disappears)
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10_000 });

    // Either empty state text or project rows should be visible
    const emptyState = page.getByText('No projects yet');
    const projectRows = page.locator('button', { hasText: /\.[\\/]|[A-Z]:\\|\/.*\// });

    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const projectCount = await projectRows.count();

    // One of the two states must be true
    expect(hasEmptyState || projectCount > 0).toBe(true);
  });

  test('project rows are clickable when projects exist', async ({ authenticatedWindow }) => {
    const page = authenticatedWindow;

    await navigateToProjects(page);

    // Wait for loading to complete
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10_000 });

    // Check if we have any projects
    const emptyState = page.getByText('No projects yet');
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      // No projects — verify empty state message
      await expect(page.getByText('Add a project folder to get started')).toBeVisible();
      return;
    }

    // Projects exist — click the first project row
    // Project rows are buttons with FolderOpen icon and project name
    const firstProjectRow = page.locator('button').filter({ has: page.locator('svg') }).filter({
      hasText: /\w/,
    });

    const rowCount = await firstProjectRow.count();

    if (rowCount > 0) {
      await firstProjectRow.first().click();

      // Clicking a project should navigate to /projects/:id/tasks
      await expect(page).toHaveURL(/\/projects\/[^/]+\/tasks/, { timeout: 10_000 });
    }
  });

  test('no console errors on projects page', async ({ authenticatedWindow }) => {
    const page = authenticatedWindow;
    const console = createConsoleCollector(page);

    await navigateToProjects(page);
    await assertPageLoaded(page);

    // Wait for any async data loading
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10_000 });

    assertNoConsoleErrors(console);
  });
});
