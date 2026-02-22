/**
 * E2E authentication helpers.
 *
 * Provides functions to log in via the UI and ensure authenticated state.
 * Reads credentials from TEST_EMAIL and TEST_PASSWORD environment variables.
 */

import type { Page } from 'playwright';

/**
 * Wait for Hub connection to be established by polling.
 *
 * The app auto-connects to Hub on startup, but this is async.
 * We poll until the login form is ready and no "Hub URL not configured" error appears.
 * Uses a simple delay-based approach since the login page doesn't have a Hub status indicator.
 */
async function waitForHubConnection(page: Page): Promise<void> {
  // Wait for the login form to be ready
  await page.getByPlaceholder('you@example.com').waitFor({ state: 'visible', timeout: 10_000 });

  // Give Hub time to auto-connect (happens async on app startup)
  // The Hub config exists but connection takes a moment to establish
  await page.waitForTimeout(3000);
}

/**
 * Log in using the test account credentials from environment variables.
 *
 * Fills the login form (email + password), clicks "Sign In",
 * and waits for redirect to the dashboard route.
 * Includes retry logic for cases where Hub connection isn't ready.
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

  // Wait for Hub to be connected before attempting login
  await waitForHubConnection(page);

  // Retry login up to 3 times (Hub connection may still be establishing)
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Fill the login form
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('Enter your password').fill(password);

    // Click the Sign In button
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Check if we got a Hub connection error
    const hubError = page.locator('text=Hub URL not configured');
    const dashboardUrl = page.waitForURL(/\/dashboard/, { timeout: 10_000 });

    // Race between error appearing and successful navigation
    const result = await Promise.race([
      hubError.waitFor({ state: 'visible', timeout: 5_000 }).then(() => 'hub_error' as const),
      dashboardUrl.then(() => 'success' as const),
    ]).catch(() => 'timeout' as const);

    if (result === 'success') {
      // Login succeeded, verify sidebar is visible
      await page.locator('aside').first().waitFor({ state: 'visible', timeout: 10_000 });
      return;
    }

    if (result === 'hub_error' && attempt < maxAttempts) {
      // Hub not ready yet, wait and retry
      await page.waitForTimeout(2000);
      continue;
    }

    // Final attempt or timeout — let it fail naturally
    if (attempt === maxAttempts) {
      // One final wait for dashboard redirect
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
      await page.locator('aside').first().waitFor({ state: 'visible', timeout: 10_000 });
    }
  }
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
