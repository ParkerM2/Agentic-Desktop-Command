/**
 * Project management E2E tests.
 *
 * Verifies the project list page, Init Wizard modal, Create Project wizard,
 * empty/populated states, project row navigation, TopBar tabs, and clean
 * console output.
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToProjectsList } from './helpers/navigation';

import type { ConsoleCollector } from './helpers/console-collector';

// ─── Project Management ───────────────────────────────────────────

test.describe('Project Management', () => {
  let collector: ConsoleCollector;

  test.beforeEach(({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);
  });

  // 1. Navigate to projects via TopBar
  test('navigate to projects via TopBar "+" button', async ({ authenticatedWindow }) => {
    // Use the navigation helper that clicks the "+" button (title="Open project")
    await navigateToProjectsList(authenticatedWindow);

    // Verify URL includes /projects
    await expect(authenticatedWindow).toHaveURL(/\/projects/, { timeout: 10_000 });
  });

  // 2. Projects page has header
  test('projects page displays "Projects" heading', async ({ authenticatedWindow }) => {
    await navigateToProjectsList(authenticatedWindow);

    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Projects' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  // 3. Init Wizard button visible
  test('Init Wizard button is visible and clickable', async ({ authenticatedWindow }) => {
    await navigateToProjectsList(authenticatedWindow);

    const initWizardButton = authenticatedWindow.getByRole('button', { name: 'Init Wizard' });
    await expect(initWizardButton).toBeVisible({ timeout: 10_000 });
    await expect(initWizardButton).toBeEnabled();
  });

  // 4. Init Wizard opens modal
  test('Init Wizard opens modal with step indicators', async ({ authenticatedWindow }) => {
    await navigateToProjectsList(authenticatedWindow);

    // Click Init Wizard button
    await authenticatedWindow.getByRole('button', { name: 'Init Wizard' }).click();

    // Verify the modal dialog appeared
    const dialog = authenticatedWindow.locator('[role="dialog"][aria-label="Initialize project"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Verify "Initialize Project" heading inside the modal
    await expect(dialog.getByText('Initialize Project')).toBeVisible();

    // Verify step indicator labels are present
    await expect(dialog.getByText('Select Folder')).toBeVisible();
    await expect(dialog.getByText('Detection')).toBeVisible();
    await expect(dialog.getByText('Configure')).toBeVisible();
    await expect(dialog.getByText('Confirm')).toBeVisible();
  });

  // 5. Close Init Wizard
  test('Init Wizard closes via close button', async ({ authenticatedWindow }) => {
    await navigateToProjectsList(authenticatedWindow);

    // Open the wizard
    await authenticatedWindow.getByRole('button', { name: 'Init Wizard' }).click();

    const dialog = authenticatedWindow.locator('[role="dialog"][aria-label="Initialize project"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Click the Close button (aria-label="Close")
    await dialog.getByLabel('Close').click();

    // Verify the modal is gone
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  // 6. New Project button visible
  test('New Project button is visible and clickable', async ({ authenticatedWindow }) => {
    await navigateToProjectsList(authenticatedWindow);

    const newProjectButton = authenticatedWindow.getByRole('button', { name: 'New Project' });
    await expect(newProjectButton).toBeVisible({ timeout: 10_000 });
    await expect(newProjectButton).toBeEnabled();
  });

  // 7. New Project opens wizard
  test('New Project opens wizard modal with step indicators', async ({ authenticatedWindow }) => {
    await navigateToProjectsList(authenticatedWindow);

    // Click New Project button
    await authenticatedWindow.getByRole('button', { name: 'New Project' }).click();

    // Verify the Create New Project dialog appeared
    const dialog = authenticatedWindow.locator('[role="dialog"][aria-label="Create new project"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Verify heading
    await expect(dialog.getByText('Create New Project')).toBeVisible();

    // Verify step indicator labels
    await expect(dialog.getByText('Details')).toBeVisible();
    await expect(dialog.getByText('Tech Stack')).toBeVisible();
    await expect(dialog.getByText('GitHub')).toBeVisible();
    await expect(dialog.getByText('Review')).toBeVisible();
  });

  // 8. Close New Project wizard
  test('New Project wizard closes via close button', async ({ authenticatedWindow }) => {
    await navigateToProjectsList(authenticatedWindow);

    // Open the wizard
    await authenticatedWindow.getByRole('button', { name: 'New Project' }).click();

    const dialog = authenticatedWindow.locator('[role="dialog"][aria-label="Create new project"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Click the Close button (aria-label="Close")
    await dialog.getByLabel('Close').click();

    // Verify the modal is gone
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  // 9. Empty state or project list
  test('shows empty state or project list with rows', async ({ authenticatedWindow }) => {
    await navigateToProjectsList(authenticatedWindow);

    // Wait for loading to finish (the loader spinner should be gone)
    await authenticatedWindow.waitForLoadState('networkidle');

    // Either the empty state or project rows should be visible
    const emptyStateText = authenticatedWindow.getByText('No projects yet');
    const projectRows = authenticatedWindow.locator('button:has(.lucide-folder-open)');

    // Wait a moment for data to load
    await authenticatedWindow.waitForTimeout(2_000);

    const hasEmptyState = await emptyStateText.isVisible().catch(() => false);
    const projectCount = await projectRows.count();

    if (hasEmptyState) {
      // Verify empty state has helpful message
      await expect(authenticatedWindow.getByText('Add a project folder to get started')).toBeVisible();
    } else {
      // Verify project rows exist with folder icons
      expect(projectCount).toBeGreaterThan(0);

      // Each project row should have a name (text content)
      const firstRow = projectRows.first();
      await expect(firstRow).toBeVisible();
    }
  });

  // 10. Project row click navigates to project tasks view
  test('clicking a project row navigates to project tasks page', async ({ authenticatedWindow }) => {
    await navigateToProjectsList(authenticatedWindow);
    await authenticatedWindow.waitForLoadState('networkidle');
    await authenticatedWindow.waitForTimeout(2_000);

    const projectRows = authenticatedWindow.locator('button:has(.lucide-folder-open)');
    const count = await projectRows.count();

    if (count === 0) {
      // No projects — skip this test gracefully
      test.skip(true, 'No projects available to test row click');
      return;
    }

    // Click the first project row
    await projectRows.first().click();

    // Should navigate to /projects/<id>/tasks
    await expect(authenticatedWindow).toHaveURL(/\/projects\/[^/]+\/tasks/, {
      timeout: 15_000,
    });
  });

  // 11. TopBar project tabs after opening a project
  test('TopBar shows project tab after opening a project', async ({ authenticatedWindow }) => {
    await navigateToProjectsList(authenticatedWindow);
    await authenticatedWindow.waitForLoadState('networkidle');
    await authenticatedWindow.waitForTimeout(2_000);

    const projectRows = authenticatedWindow.locator('button:has(.lucide-folder-open)');
    const count = await projectRows.count();

    if (count === 0) {
      test.skip(true, 'No projects available to test TopBar tabs');
      return;
    }

    // Get the project name before clicking
    const firstRow = projectRows.first();
    const projectName = await firstRow.locator('p.font-medium').first().innerText();

    // Click the project
    await firstRow.click();
    await expect(authenticatedWindow).toHaveURL(/\/projects\/[^/]+\/tasks/, {
      timeout: 15_000,
    });

    // Verify a tab appeared in the TopBar with the project name
    // TopBar tabs are buttons inside the top bar area with the project name text
    const topBar = authenticatedWindow.locator('.border-b.bg-card').first();
    const projectTab = topBar.locator('button', { hasText: projectName });
    await expect(projectTab).toBeVisible({ timeout: 10_000 });

    // Verify the tab has a folder icon (lucide-folder-open)
    await expect(projectTab.locator('.lucide-folder-open')).toBeVisible();
  });

  // 12. No console errors throughout all project management tests
  test('no unexpected console errors during project management', () => {
    assertNoConsoleErrors(collector);
  });
});
