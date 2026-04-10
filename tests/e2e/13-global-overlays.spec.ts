/**
 * Global overlays + keyboard shortcuts E2E tests.
 *
 * Verifies AssistantWidget (FAB, panel open/close, chat input, Ctrl+J toggle).
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';

import type { ConsoleCollector } from './helpers/console-collector';

// ─── Assistant Widget ────────────────────────────────────────────

test.describe('Assistant Widget', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);
    // Ensure we are on the dashboard (authenticated layout loaded)
    await expect(authenticatedWindow).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(authenticatedWindow.locator('aside').first()).toBeVisible({ timeout: 10_000 });
  });

  test.afterEach(async ({ authenticatedWindow }) => {
    await authenticatedWindow.keyboard.press('Escape');
    await authenticatedWindow.waitForTimeout(200);
  });

  test('FAB button visible in bottom-right', async ({ authenticatedWindow }) => {
    // WidgetFab has aria-label "Open assistant" when closed
    const fab = authenticatedWindow.getByRole('button', { name: 'Open assistant' });
    await expect(fab).toBeVisible({ timeout: 10_000 });
  });

  test('click FAB opens assistant panel', async ({ authenticatedWindow }) => {
    const fab = authenticatedWindow.getByRole('button', { name: 'Open assistant' });
    await fab.click();

    // Panel should appear with the "Assistant" heading
    const panelHeading = authenticatedWindow.getByRole('heading', { name: 'Assistant' });
    await expect(panelHeading).toBeVisible({ timeout: 10_000 });
  });

  test('chat input visible when panel is open', async ({ authenticatedWindow }) => {
    // Open the panel
    const fab = authenticatedWindow.getByRole('button', { name: 'Open assistant' });
    await fab.click();

    // The WidgetInput textarea has aria-label "Message assistant"
    const chatInput = authenticatedWindow.getByLabel('Message assistant');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });
  });

  test('type in chat input', async ({ authenticatedWindow }) => {
    // Open the panel
    const fab = authenticatedWindow.getByRole('button', { name: 'Open assistant' });
    await fab.click();

    const chatInput = authenticatedWindow.getByLabel('Message assistant');
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    await chatInput.click();
    await chatInput.fill('hello from e2e test');
    await expect(chatInput).toHaveValue('hello from e2e test');
  });

  test('close panel via close button', async ({ authenticatedWindow }) => {
    // Open the panel
    const fab = authenticatedWindow.getByRole('button', { name: 'Open assistant' });
    await fab.click();

    const panelHeading = authenticatedWindow.getByRole('heading', { name: 'Assistant' });
    await expect(panelHeading).toBeVisible({ timeout: 10_000 });

    // Click the close button (aria-label "Close assistant" in WidgetPanel header)
    const closeButton = authenticatedWindow.getByRole('button', { name: 'Close assistant' }).first();
    await closeButton.click();

    // Panel heading should disappear
    await expect(panelHeading).not.toBeVisible({ timeout: 5_000 });

    // FAB should revert to "Open assistant"
    await expect(
      authenticatedWindow.getByRole('button', { name: 'Open assistant' }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('Ctrl+J toggles assistant panel', async ({ authenticatedWindow }) => {
    const panelHeading = authenticatedWindow.getByRole('heading', { name: 'Assistant' });

    // Panel should start closed
    await expect(panelHeading).not.toBeVisible();

    // Press Ctrl+J — should open the panel
    await authenticatedWindow.keyboard.press('Control+j');
    await expect(panelHeading).toBeVisible({ timeout: 10_000 });

    // Press Ctrl+J again — should close the panel
    await authenticatedWindow.keyboard.press('Control+j');
    await expect(panelHeading).not.toBeVisible({ timeout: 5_000 });
  });

  test('no unexpected console errors during Assistant Widget interactions', async () => {
    assertNoConsoleErrors(collector);
  });
});
