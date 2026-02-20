/**
 * E2E authentication helpers.
 *
 * Provides functions to log in via the UI and ensure authenticated state.
 * Reads credentials from TEST_EMAIL and TEST_PASSWORD environment variables.
 */

import type { Page } from 'playwright';

/**
 * Log in using the test account credentials from environment variables.
 *
 * Fills the login form (email + password), clicks "Sign In",
 * and waits for redirect to the dashboard route.
 *
 * @throws If TEST_EMAIL or TEST_PASSWORD environment variables are missing.
 */
export async function loginWithTestAccount(page: Page): Promise<void> {
  const email = process.env['TEST_EMAIL'];
  const password = process.env['TEST_PASSWORD'];

  if (!email || !password) {
    throw new Error(
      'E2E auth: TEST_EMAIL and TEST_PASSWORD environment variables are required. ' +
        'Set them before running E2E tests.',
    );
  }

  // Fill the login form
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);

  // Click the Sign In button
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect to the dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  // Verify the sidebar is visible — confirms auth succeeded and layout loaded
  await page.locator('aside').first().waitFor({ state: 'visible', timeout: 10_000 });
}

/**
 * Ensure the page is in an authenticated state.
 *
 * If the sidebar is already visible (indicating a protected page), returns immediately.
 * Otherwise, calls loginWithTestAccount to authenticate.
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
  const sidebar = page.locator('aside').first();
  const isVisible = await sidebar.isVisible().catch(() => false);

  if (isVisible) {
    return;
  }

  await loginWithTestAccount(page);
}
