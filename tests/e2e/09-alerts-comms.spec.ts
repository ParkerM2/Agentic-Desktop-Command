/**
 * Alerts + Communications E2E tests.
 *
 * Verifies the Alerts page (tabs, create modal, alert actions) and
 * Communications page (tabs, integration panels, notification rules).
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToSidebarItem } from './helpers/navigation';

import type { ConsoleCollector } from './helpers/console-collector';

// ─── Alerts Page ──────────────────────────────────────────────

test.describe('Alerts Page', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);
    await navigateToSidebarItem(authenticatedWindow, 'Alerts');
  });

  test('page loads at /alerts with heading visible', async ({ authenticatedWindow }) => {
    await expect(authenticatedWindow).toHaveURL(/\/alerts/, { timeout: 10_000 });
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Alerts' }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Active, Dismissed, and Recurring tabs are visible', async ({ authenticatedWindow }) => {
    // Each tab is a button containing the label text
    await expect(authenticatedWindow.getByRole('button', { name: /Active/ })).toBeVisible();
    await expect(authenticatedWindow.getByRole('button', { name: /Dismissed/ })).toBeVisible();
    await expect(authenticatedWindow.getByRole('button', { name: /Recurring/ })).toBeVisible();
  });

  test('tab switching renders content or empty state', async ({ authenticatedWindow }) => {
    // Click Active tab (default, but click explicitly)
    await authenticatedWindow.getByRole('button', { name: /Active/ }).click();
    // Should show alert list or "No alerts" empty state
    const activeContent = authenticatedWindow.locator('text=No alerts').or(
      authenticatedWindow.locator('.space-y-2'),
    );
    await expect(activeContent.first()).toBeVisible({ timeout: 5_000 });

    // Click Dismissed tab
    await authenticatedWindow.getByRole('button', { name: /Dismissed/ }).click();
    const dismissedContent = authenticatedWindow.locator('text=No alerts').or(
      authenticatedWindow.locator('.space-y-2'),
    );
    await expect(dismissedContent.first()).toBeVisible({ timeout: 5_000 });

    // Click Recurring tab
    await authenticatedWindow.getByRole('button', { name: /Recurring/ }).click();
    const recurringContent = authenticatedWindow.locator('text=No recurring alerts').or(
      authenticatedWindow.locator('.space-y-2'),
    );
    await expect(recurringContent.first()).toBeVisible({ timeout: 5_000 });
  });

  test('New Alert button opens create modal', async ({ authenticatedWindow }) => {
    // Click the "New Alert" button in the header
    await authenticatedWindow.getByRole('button', { name: 'New Alert' }).click();

    // Modal should appear with "Create Alert" heading
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Create Alert' }),
    ).toBeVisible({ timeout: 5_000 });

    // Modal should contain the message input
    await expect(
      authenticatedWindow.getByPlaceholder('What should you be reminded about?'),
    ).toBeVisible();

    // Modal should contain type selection buttons
    await expect(authenticatedWindow.getByRole('button', { name: 'Reminder' })).toBeVisible();
    await expect(authenticatedWindow.getByRole('button', { name: 'Deadline' })).toBeVisible();
    await expect(authenticatedWindow.getByRole('button', { name: 'Notification' })).toBeVisible();
    await expect(authenticatedWindow.getByRole('button', { name: 'Recurring' })).toBeVisible();
  });

  test('close create modal via close button', async ({ authenticatedWindow }) => {
    // Open the modal
    await authenticatedWindow.getByRole('button', { name: 'New Alert' }).click();
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Create Alert' }),
    ).toBeVisible({ timeout: 5_000 });

    // Click the Cancel button to close
    await authenticatedWindow.getByRole('button', { name: 'Cancel' }).click();

    // Modal heading should disappear
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Create Alert' }),
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('close create modal via backdrop click', async ({ authenticatedWindow }) => {
    // Open the modal
    await authenticatedWindow.getByRole('button', { name: 'New Alert' }).click();
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Create Alert' }),
    ).toBeVisible({ timeout: 5_000 });

    // Click the backdrop (aria-label="Close modal")
    await authenticatedWindow.getByRole('button', { name: 'Close modal' }).click();

    // Modal heading should disappear
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Create Alert' }),
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test('alert actions visible when alerts exist', async ({ authenticatedWindow }) => {
    // Check if any alerts are present (look for Dismiss or Delete buttons)
    const dismissButtons = authenticatedWindow.locator('button[title="Dismiss"]');
    const deleteButtons = authenticatedWindow.locator('button[title="Delete"]');

    const dismissCount = await dismissButtons.count();
    const deleteCount = await deleteButtons.count();

    if (dismissCount > 0) {
      // If active alerts exist, dismiss buttons should be visible
      await expect(dismissButtons.first()).toBeVisible();
    }

    if (deleteCount > 0) {
      // If any alerts exist, delete buttons should be visible
      await expect(deleteButtons.first()).toBeVisible();
    }

    // If neither exist, the empty state "No alerts" should be visible instead
    if (dismissCount === 0 && deleteCount === 0) {
      await expect(authenticatedWindow.locator('text=No alerts')).toBeVisible();
    }
  });

  test('no unexpected console errors on alerts page', async () => {
    assertNoConsoleErrors(collector);
  });
});

// ─── Communications Page ──────────────────────────────────────

test.describe('Communications Page', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);
    await navigateToSidebarItem(authenticatedWindow, 'Comms');
  });

  test('page loads at /communications with heading visible', async ({ authenticatedWindow }) => {
    await expect(authenticatedWindow).toHaveURL(/\/communications/, { timeout: 10_000 });
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Communications' }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Overview, Slack, Discord, and Rules tabs are visible', async ({ authenticatedWindow }) => {
    await expect(authenticatedWindow.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(authenticatedWindow.getByRole('button', { name: 'Slack' })).toBeVisible();
    await expect(authenticatedWindow.getByRole('button', { name: 'Discord' })).toBeVisible();
    await expect(authenticatedWindow.getByRole('button', { name: 'Rules' })).toBeVisible();
  });

  test('Overview tab shows Slack and Discord panels', async ({ authenticatedWindow }) => {
    // Overview is the default tab — should show both panels
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Slack' }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Discord' }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Slack tab shows Slack panel content', async ({ authenticatedWindow }) => {
    await authenticatedWindow.getByRole('button', { name: 'Slack' }).click();

    // Should show Slack heading and quick action buttons
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Slack' }),
    ).toBeVisible({ timeout: 5_000 });

    // Verify at least one Slack action button is present
    await expect(
      authenticatedWindow.getByRole('button', { name: /Send Message/ }).first(),
    ).toBeVisible();
  });

  test('Discord tab shows Discord panel content', async ({ authenticatedWindow }) => {
    await authenticatedWindow.getByRole('button', { name: 'Discord' }).click();

    // Should show Discord heading and quick action buttons
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Discord' }),
    ).toBeVisible({ timeout: 5_000 });

    // Verify at least one Discord action button is present
    await expect(
      authenticatedWindow.getByRole('button', { name: /Call User/ }),
    ).toBeVisible();
  });

  test('Rules tab shows notification rules panel', async ({ authenticatedWindow }) => {
    await authenticatedWindow.getByRole('button', { name: 'Rules' }).click();

    // Should show Notification Rules heading
    await expect(
      authenticatedWindow.getByRole('heading', { name: 'Notification Rules' }),
    ).toBeVisible({ timeout: 5_000 });

    // Should show the keyword input placeholder
    await expect(
      authenticatedWindow.getByPlaceholder('Keyword or pattern...'),
    ).toBeVisible();

    // Should show "No rules configured" empty state or existing rules
    const emptyState = authenticatedWindow.locator('text=No rules configured');
    const rulesList = authenticatedWindow.locator('ul');
    const hasContent = emptyState.or(rulesList);
    await expect(hasContent.first()).toBeVisible({ timeout: 5_000 });
  });

  test('each tab renders non-blank content', async ({ authenticatedWindow }) => {
    const tabNames = ['Overview', 'Slack', 'Discord', 'Rules'];

    for (const tabName of tabNames) {
      await authenticatedWindow.getByRole('button', { name: tabName }).click();
      // Brief wait for tab content to render
      await authenticatedWindow.waitForTimeout(300);

      // Verify the page is not blank by checking body text length
      const bodyText = await authenticatedWindow.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(0);
    }
  });

  test('no unexpected console errors on communications page', async () => {
    assertNoConsoleErrors(collector);
  });
});
