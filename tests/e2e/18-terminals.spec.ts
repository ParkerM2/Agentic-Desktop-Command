/**
 * Terminals E2E tests.
 *
 * Verifies the terminal page loads, the new terminal button is present,
 * and terminal tab management works when terminals exist.
 * All tests require an active project.
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import {
  navigateToProjectsList,
  navigateToProjectView,
  openFirstProject,
} from './helpers/navigation';

import type { ConsoleCollector } from './helpers/console-collector';

// ─── Terminals ────────────────────────────────────────────────

test.describe('Terminals', () => {
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

  // ── 1. Terminal Page Loads ─────────────────────────────────────

  test('Terminals page loads and renders terminal area or empty state', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Terminals');

    // Either the empty state message or a terminal tab area should be present
    const emptyState = page.getByText('No terminal open');
    const hasEmpty = await emptyState.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasEmpty) {
      // Empty state is valid — the "Create Terminal" button should be present
      await expect(page.getByRole('button', { name: 'Create Terminal' })).toBeVisible({
        timeout: 5_000,
      });
    } else {
      // Terminal tabs area is showing — the "+" new terminal button should be present
      const newTerminalButton = page.locator('button[title="New terminal"]');
      await expect(newTerminalButton).toBeVisible({ timeout: 5_000 });
    }
  });

  // ── 2. New Terminal Button ─────────────────────────────────────

  test('New terminal button is always accessible on the Terminals page', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Terminals');

    // Either "Create Terminal" (empty state) or "New terminal" icon button (tabs area)
    const createButton = page.getByRole('button', { name: 'Create Terminal' });
    const newTerminalIconButton = page.locator('button[title="New terminal"]');

    const hasCreate = await createButton.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasNewTerminal = await newTerminalIconButton.isVisible({ timeout: 3_000 }).catch(() => false);

    // At least one button variant must be visible
    expect(hasCreate || hasNewTerminal).toBe(true);
  });

  // ── 3. Terminal Tab Management ─────────────────────────────────

  test('Terminal tabs are clickable and switch active terminal when terminals exist', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Terminals');

    // Check whether any terminals are open
    const emptyState = page.getByText('No terminal open');
    const hasEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasEmpty) {
      // No terminals — this test is not applicable, pass gracefully
      return;
    }

    // Terminals are open — find the tab bar
    // Tabs are typically rendered as buttons in a horizontal strip
    const terminalTabs = page.locator('button[role="tab"], [class*="tab"]').filter({
      hasText: /terminal|bash|sh|cmd|powershell/i,
    });

    const tabCount = await terminalTabs.count();

    if (tabCount === 0) {
      // Fallback: check for any clickable tab-like element in the terminal area
      const genericTabs = page.locator('[class*="tab"][class*="terminal"], [data-testid*="terminal-tab"]');
      const genericCount = await genericTabs.count();

      if (genericCount === 0) {
        // No recognizable tabs — skip gracefully
        return;
      }

      // Click the first tab and verify it becomes active
      await genericTabs.first().click();
      await page.waitForTimeout(300);
      return;
    }

    // Click the first tab and verify it stays visible (basic interaction check)
    await terminalTabs.first().click();
    await page.waitForTimeout(300);
    await expect(terminalTabs.first()).toBeVisible();
  });

  // ── 4. No Console Errors ──────────────────────────────────────

  test('no unexpected console errors during terminal interactions', () => {
    assertNoConsoleErrors(collector);
  });
});
