/**
 * My Work page E2E tests.
 *
 * Verifies the cross-project task view loads, status filter is present
 * and interactive, task list or empty state renders, and no unexpected
 * console errors occur.
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToSidebarItem, waitForRoute } from './helpers/navigation';
import { hasEmptyState, verifyEmptyState, waitForPageContent } from './helpers/page-helpers';

import type { ConsoleCollector } from './helpers/console-collector';

test.describe('My Work Page', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);
    await navigateToSidebarItem(authenticatedWindow, 'My Work');
    await waitForRoute(authenticatedWindow, '/my-work');
    await waitForPageContent(authenticatedWindow);
  });

  test('my work page loads with header', async ({ authenticatedWindow }) => {
    // Verify we navigated to the my-work route
    await expect(authenticatedWindow).toHaveURL(/\/my-work/);

    // The page should show the "My Work" heading
    await expect(authenticatedWindow.getByText('My Work')).toBeVisible();

    // Subtitle text should be visible
    await expect(
      authenticatedWindow.getByText('All tasks across your projects'),
    ).toBeVisible();
  });

  test('status filter dropdown is present', async ({ authenticatedWindow }) => {
    // The page has a <select> element for filtering tasks by status
    const select = authenticatedWindow.locator('select');
    await expect(select).toBeVisible();

    // Default value should be "All Tasks"
    const selectedValue = await select.inputValue();
    expect(selectedValue).toBe('all');
  });

  test('filter interaction changes selection', async ({ authenticatedWindow }) => {
    const select = authenticatedWindow.locator('select');

    // Change filter to "Running"
    await select.selectOption('running');

    // Verify the selection changed
    const newValue = await select.inputValue();
    expect(newValue).toBe('running');

    // The task count label should still be visible (shows "N tasks")
    await expect(authenticatedWindow.getByText(/\d+ tasks?/)).toBeVisible();

    // Change back to "All Tasks"
    await select.selectOption('all');
    const resetValue = await select.inputValue();
    expect(resetValue).toBe('all');
  });

  test('shows task list or empty state', async ({ authenticatedWindow }) => {
    // The page shows either:
    // 1. An EmptyState with "No tasks yet" or "No tasks match filter"
    // 2. ProjectGroup cards with task items
    // 3. A "Hub disconnected" error state

    const showsEmpty = await hasEmptyState(authenticatedWindow);
    const hasHubError = await authenticatedWindow
      .getByText('Hub disconnected')
      .isVisible()
      .catch(() => false);

    if (showsEmpty) {
      await verifyEmptyState(authenticatedWindow);
    } else if (hasHubError) {
      // Hub disconnected state should show a Retry button
      await expect(
        authenticatedWindow.getByRole('button', { name: 'Retry' }),
      ).toBeVisible();
    } else {
      // Task groups should be visible — look for project group cards
      const projectGroups = authenticatedWindow.locator('.rounded-lg');
      const count = await projectGroups.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('no unexpected console errors', async () => {
    assertNoConsoleErrors(collector);
  });
});
