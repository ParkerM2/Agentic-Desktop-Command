/**
 * E2E navigation helpers.
 *
 * Provides functions to navigate via the sidebar, wait for routes,
 * and assert that pages loaded without errors.
 */

import type { Page } from 'playwright';

/** Top-level sidebar navigation labels (matches Sidebar.tsx topLevelItems). */
export const TOP_LEVEL_NAV_ITEMS = [
  'Dashboard',
  'Briefing',
  'My Work',
  'Notes',
  'Fitness',
  'Planner',
  'Productivity',
  'Alerts',
  'Comms',
] as const;

/**
 * Navigate to a sidebar item by its visible label text.
 *
 * Finds the button inside the sidebar `<nav>` element that contains the given
 * label, clicks it, and waits for navigation to settle.
 */
export async function navigateToSidebarItem(page: Page, label: string): Promise<void> {
  const sidebar = page.locator('aside nav');
  const navButton = sidebar.getByRole('button', { name: label });

  await navButton.click();

  // Wait for navigation to settle (URL change + network idle)
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for the page URL to match a given pattern.
 *
 * @param urlPattern - A string (substring match) or RegExp to match against the URL.
 */
export async function waitForRoute(
  page: Page,
  urlPattern: string | RegExp,
): Promise<void> {
  if (typeof urlPattern === 'string') {
    await page.waitForURL(`**${urlPattern}**`, { timeout: 10_000 });
  } else {
    await page.waitForURL(urlPattern, { timeout: 10_000 });
  }
}

/**
 * Assert that the page loaded successfully.
 *
 * Checks that:
 * 1. No error boundary fallback is showing (looks for common error boundary text).
 * 2. The page has visible content (not a blank screen).
 */
export async function assertPageLoaded(page: Page): Promise<void> {
  // Check for error boundary fallback text
  const errorBoundary = page.getByText('Something went wrong');
  const hasError = await errorBoundary.isVisible().catch(() => false);

  if (hasError) {
    throw new Error('Page shows error boundary fallback: "Something went wrong"');
  }

  // Check that the page body has some content (not blank)
  const bodyText = await page.locator('body').innerText();

  if (bodyText.trim().length === 0) {
    throw new Error('Page appears blank — body has no text content');
  }
}
