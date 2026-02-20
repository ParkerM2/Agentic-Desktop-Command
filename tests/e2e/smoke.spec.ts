/**
 * E2E Tests: Smoke Test
 *
 * Canary test — a single linear flow through the core app surfaces.
 * If this test fails, something is fundamentally broken.
 *
 * Flow:
 * 1. App launches (authenticatedWindow handles login)
 * 2. Dashboard loads — verify heading or dashboard content
 * 3. Navigate to My Work via sidebar
 * 4. Navigate to Notes via sidebar
 * 5. Navigate to Settings via sidebar footer button
 * 6. Navigate back to Dashboard
 * 7. No console errors throughout entire flow
 */
import { test, expect } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { assertPageLoaded, navigateToSidebarItem } from './helpers/navigation';

test.describe('Smoke Test', () => {
  test('full navigation flow: Dashboard → My Work → Notes → Settings → Dashboard', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;
    const console = createConsoleCollector(page);

    // Step 1: Dashboard should already be loaded after login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await assertPageLoaded(page);

    // Verify sidebar is present
    await expect(page.locator('aside nav')).toBeVisible();

    // Step 2: Navigate to My Work
    await navigateToSidebarItem(page, 'My Work');
    await expect(page).toHaveURL(/\/my-work/);
    await assertPageLoaded(page);

    // Step 3: Navigate to Notes
    await navigateToSidebarItem(page, 'Notes');
    await expect(page).toHaveURL(/\/notes/);
    await assertPageLoaded(page);

    // Step 4: Navigate to Settings (in sidebar footer, not in <nav>)
    const settingsButton = page.locator('aside').getByRole('button', { name: 'Settings' });
    await settingsButton.click();
    await expect(page).toHaveURL(/\/settings/);
    await assertPageLoaded(page);

    // Step 5: Navigate back to Dashboard
    await navigateToSidebarItem(page, 'Dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await assertPageLoaded(page);

    // Step 6: Assert no unexpected console errors throughout entire flow
    assertNoConsoleErrors(console);
  });
});
