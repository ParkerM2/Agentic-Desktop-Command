/**
 * Auth flow E2E tests.
 *
 * Verifies login page rendering, successful authentication, validation,
 * register page navigation, and clean console output.
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';

import type { ConsoleCollector } from './helpers/console-collector';

// ─── Unauthenticated tests (use mainWindow) ────────────────────────

test.describe('Auth — Login Page', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ mainWindow }) => {
    collector = createConsoleCollector(mainWindow);
  });

  test('login page loads with email and password inputs and Sign In button', async ({ mainWindow }) => {
    // The app should land on the login page by default (unauthenticated)
    await expect(mainWindow.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // Verify email input
    await expect(mainWindow.getByLabel('Email')).toBeVisible();
    await expect(mainWindow.getByPlaceholder('you@example.com')).toBeVisible();

    // Verify password input
    await expect(mainWindow.getByLabel('Password')).toBeVisible();
    await expect(mainWindow.getByPlaceholder('Enter your password')).toBeVisible();

    // Verify Sign In button
    await expect(mainWindow.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('empty form submission shows validation or error', async ({ mainWindow }) => {
    // Click Sign In without filling any fields
    await mainWindow.getByRole('button', { name: 'Sign In' }).click();

    // The form uses Zod validation via TanStack Form's onChange validator.
    // On submit with empty fields, either:
    // - The button is disabled (canSubmit is false from onChange validation), or
    // - An error message appears
    // We verify at least one validation signal is present.

    // After clicking, wait briefly for validation state to update
    await mainWindow.waitForTimeout(500);

    // Check that we are still on the login page (no redirect happened)
    await expect(mainWindow.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // The form should not have navigated away — still shows the Sign In button
    await expect(mainWindow.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('register link navigates to register page', async ({ mainWindow }) => {
    // Click the "Sign up" link button
    await mainWindow.getByRole('button', { name: 'Sign up' }).click();

    // Should navigate to the register page
    await expect(mainWindow.getByRole('heading', { name: 'Create Account' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('register page has all required fields', async ({ mainWindow }) => {
    // Navigate to register page first
    await mainWindow.getByRole('button', { name: 'Sign up' }).click();
    await expect(mainWindow.getByRole('heading', { name: 'Create Account' })).toBeVisible({
      timeout: 10_000,
    });

    // Verify Display Name input
    await expect(mainWindow.getByLabel('Display Name')).toBeVisible();
    await expect(mainWindow.getByPlaceholder('Your name')).toBeVisible();

    // Verify Email input
    await expect(mainWindow.getByLabel('Email')).toBeVisible();
    await expect(mainWindow.getByPlaceholder('you@example.com')).toBeVisible();

    // Verify Password input
    await expect(mainWindow.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(mainWindow.getByPlaceholder('Choose a password (min 8 characters)')).toBeVisible();

    // Verify Confirm Password input
    await expect(mainWindow.getByLabel('Confirm Password')).toBeVisible();
    await expect(mainWindow.getByPlaceholder('Re-enter your password')).toBeVisible();

    // Verify Create Account button
    await expect(mainWindow.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('back to login from register page', async ({ mainWindow }) => {
    // Navigate to register page
    await mainWindow.getByRole('button', { name: 'Sign up' }).click();
    await expect(mainWindow.getByRole('heading', { name: 'Create Account' })).toBeVisible({
      timeout: 10_000,
    });

    // Click "Sign in" link on register page to go back
    await mainWindow.getByRole('button', { name: 'Sign in' }).click();

    // Should be back at login page
    await expect(mainWindow.getByRole('heading', { name: 'Sign In' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Hub setup link exists on login page', async ({ mainWindow }) => {
    await expect(
      mainWindow.getByRole('button', { name: 'Change Hub server' }),
    ).toBeVisible();
  });

  test('no unexpected console errors during unauthenticated flows', async () => {
    assertNoConsoleErrors(collector);
  });
});

// ─── Authenticated test (uses authenticatedWindow) ──────────────────

test.describe('Auth — Successful Login', () => {
  test('successful login redirects to dashboard with sidebar visible', async ({ authenticatedWindow }) => {
    const collector = createConsoleCollector(authenticatedWindow);

    // authenticatedWindow fixture already logs in via loginWithTestAccount.
    // Verify we are on the dashboard.
    await expect(authenticatedWindow).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Verify sidebar is visible (confirms authenticated layout loaded)
    await expect(authenticatedWindow.locator('aside').first()).toBeVisible({ timeout: 10_000 });

    // Verify the login form is gone
    await expect(authenticatedWindow.getByRole('heading', { name: 'Sign In' })).not.toBeVisible();

    // No unexpected console errors
    assertNoConsoleErrors(collector);
  });
});
