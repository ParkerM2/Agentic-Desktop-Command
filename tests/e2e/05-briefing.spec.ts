/**
 * Briefing page E2E tests.
 *
 * Verifies the daily briefing page loads, shows the generate button,
 * handles the generate action, displays stats or empty state, and
 * produces no unexpected console errors.
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToSidebarItem, waitForRoute } from './helpers/navigation';
import { hasEmptyState, verifyEmptyState, waitForPageContent } from './helpers/page-helpers';

import type { ConsoleCollector } from './helpers/console-collector';

test.describe('Briefing Page', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);
    await navigateToSidebarItem(authenticatedWindow, 'Briefing');
    await waitForRoute(authenticatedWindow, '/briefing');
    await waitForPageContent(authenticatedWindow);
  });

  test('briefing page loads with header and content', async ({ authenticatedWindow }) => {
    // Verify we navigated to the briefing route
    await expect(authenticatedWindow).toHaveURL(/\/briefing/);

    // The page should show the "Daily Briefing" heading
    await expect(authenticatedWindow.getByText('Daily Briefing')).toBeVisible();

    // Page should not be blank
    const bodyText = await authenticatedWindow.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('generate button is visible', async ({ authenticatedWindow }) => {
    // The briefing page always shows a generate button in the header area.
    // Text is "Generate Now" when idle, "Generating..." when pending.
    const generateButton = authenticatedWindow.getByRole('button', { name: /Generate/i });
    await expect(generateButton).toBeVisible();
  });

  test('generate button is clickable and responds', async ({ authenticatedWindow }) => {
    const generateButton = authenticatedWindow.getByRole('button', { name: /Generate/i });
    await expect(generateButton).toBeEnabled();

    // Click the generate button
    await generateButton.click();

    // After clicking, the button should still be present (may show "Generating..." or stay the same)
    // The button text or state should change, or it should remain visible
    await expect(
      authenticatedWindow.getByRole('button', { name: /Generate/i }),
    ).toBeVisible();
  });

  test('shows stats cards or empty state', async ({ authenticatedWindow }) => {
    // The briefing page shows either:
    // 1. An EmptyState component with "No briefing yet" when no briefing exists
    // 2. Stats cards (Tasks, Agent Activity) when a briefing has been generated

    const showsEmpty = await hasEmptyState(authenticatedWindow);

    if (showsEmpty) {
      // Verify the empty state has proper structure
      await verifyEmptyState(authenticatedWindow);
      // The empty state should mention generating a briefing
      await expect(
        authenticatedWindow.getByText(/generate/i),
      ).toBeVisible();
    } else {
      // If a briefing exists, stat items or summary card should be visible.
      // Look for the Tasks or Agent Activity section headers.
      const hasTasks = await authenticatedWindow.getByText('Tasks').isVisible().catch(() => false);
      const hasAgentActivity = await authenticatedWindow
        .getByText('Agent Activity')
        .isVisible()
        .catch(() => false);
      const hasSummary = await authenticatedWindow
        .locator('.rounded-lg')
        .first()
        .isVisible()
        .catch(() => false);

      // At least one content section should be present
      expect(hasTasks || hasAgentActivity || hasSummary).toBe(true);
    }
  });

  test('no unexpected console errors', async () => {
    assertNoConsoleErrors(collector);
  });
});
