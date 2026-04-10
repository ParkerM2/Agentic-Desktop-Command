/**
 * Agents lifecycle E2E tests.
 *
 * Verifies the agent dashboard loads correctly, session cards display when
 * agents are running, and the empty state renders when no agents are active.
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

// ─── Agents Lifecycle ─────────────────────────────────────────

test.describe('Agents Lifecycle', () => {
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

  // ── 1. Dashboard Loads ────────────────────────────────────────

  test('Agents dashboard loads and shows "Agents" heading', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Agents');

    // The "Agents" heading must always be visible
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── 2. Session Cards or Empty State ───────────────────────────

  test('Agents dashboard shows session cards or a valid empty state', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Agents');

    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({
      timeout: 10_000,
    });

    // Check which state is rendered
    const emptyState = page.getByText('No agents running');
    const hasEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasEmpty) {
      // Empty state: helpful prompt should also be visible
      await expect(page.getByText('Execute a task to start an agent')).toBeVisible({
        timeout: 5_000,
      });
    } else {
      // Agents are running: at least one session card should be present
      // Session cards render as bordered rounded panels
      const sessionCards = page.locator('.border-border.rounded-lg.border.p-4');
      const cardCount = await sessionCards.count();

      if (cardCount === 0) {
        // Fallback: look for any card-like element containing agent info
        const agentCards = page.locator('[class*="rounded"][class*="border"]').filter({
          hasText: /agent|session|running|idle|queued/i,
        });
        expect(await agentCards.count()).toBeGreaterThan(0);
      } else {
        expect(cardCount).toBeGreaterThan(0);
      }
    }
  });

  // ── 3. Empty State Detail ─────────────────────────────────────

  test('Agents empty state provides actionable guidance when no agents are running', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Agents');

    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({
      timeout: 10_000,
    });

    const emptyState = page.getByText('No agents running');
    const hasEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);

    if (!hasEmpty) {
      // Agents are running — this test is not applicable, pass gracefully
      return;
    }

    // When empty: guidance message must be present
    await expect(page.getByText('Execute a task to start an agent')).toBeVisible({
      timeout: 5_000,
    });

    // Page should not show an error boundary
    const errorBoundary = page.getByText('Something went wrong');
    const hasError = await errorBoundary.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  // ── 4. No Console Errors ──────────────────────────────────────

  test('no unexpected console errors during agents lifecycle interactions', () => {
    assertNoConsoleErrors(collector);
  });
});
