/**
 * E2E Tests: Authentication Flow
 *
 * Verifies the login page UI and authentication behavior:
 * - Login form visibility on app launch
 * - Email and password field presence
 * - Sign-in button presence
 * - Successful login redirects to dashboard (env-gated)
 * - Register link presence
 * - Hub setup link presence
 * - No console errors during auth flow
 */
import { test, expect } from './electron.setup';

test.describe('Authentication Flow', () => {
  test('shows login form on app launch', async ({ mainWindow }) => {
    // App should show login page when not authenticated
    await expect(mainWindow.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // Verify subtitle text
    await expect(mainWindow.getByText('Enter your credentials to continue')).toBeVisible();
  });

  test('login form has email and password fields', async ({ mainWindow }) => {
    // Verify email input with placeholder
    await expect(mainWindow.getByPlaceholder('you@example.com')).toBeVisible();

    // Verify password input with placeholder
    await expect(mainWindow.getByPlaceholder('Enter your password')).toBeVisible();
  });

  test('login form has sign in button', async ({ mainWindow }) => {
    // The submit button should display "Sign In"
    await expect(mainWindow.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ mainWindow }) => {
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD;

    // Skip if credentials are not provided
    test.skip(
      typeof email !== 'string' || email.length === 0 || typeof password !== 'string' || password.length === 0,
      'TEST_EMAIL and TEST_PASSWORD env vars required',
    );

    // Fill credentials
    await mainWindow.getByPlaceholder('you@example.com').fill(email ?? '');
    await mainWindow.getByPlaceholder('Enter your password').fill(password ?? '');

    // Submit the form
    await mainWindow.getByRole('button', { name: 'Sign In' }).click();

    // Wait for navigation away from the login page
    // After login, the heading "Sign In" should disappear
    await expect(mainWindow.getByRole('heading', { name: 'Sign In' })).not.toBeVisible({
      timeout: 15_000,
    });

    // Verify we are on an authenticated page — sidebar should be visible
    await expect(mainWindow.locator('aside')).toBeVisible({ timeout: 10_000 });
  });

  test('register link is present', async ({ mainWindow }) => {
    // The "Sign up" button-link should be visible below the form
    await expect(mainWindow.getByRole('button', { name: 'Sign up' })).toBeVisible();
  });

  test('hub setup link is present', async ({ mainWindow }) => {
    // The "Change Hub server" button-link should be visible
    await expect(mainWindow.getByRole('button', { name: 'Change Hub server' })).toBeVisible();
  });

  test('no console errors during auth flow', async ({ mainWindow }) => {
    const errors: string[] = [];

    // Collect console errors
    mainWindow.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Interact with form fields to trigger any lazy-loaded code
    await mainWindow.getByPlaceholder('you@example.com').click();
    await mainWindow.getByPlaceholder('you@example.com').fill('test@example.com');
    await mainWindow.getByPlaceholder('Enter your password').click();
    await mainWindow.getByPlaceholder('Enter your password').fill('testpassword');

    // Clear the fields to reset state
    await mainWindow.getByPlaceholder('you@example.com').clear();
    await mainWindow.getByPlaceholder('Enter your password').clear();

    // Filter out known acceptable errors (network, DevTools, favicon)
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('net::ERR_') &&
        !error.includes('Failed to fetch') &&
        !error.includes('NetworkError') &&
        !error.includes('ERR_CONNECTION_REFUSED') &&
        !error.includes('Download the React DevTools') &&
        !error.includes('favicon'),
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
