/**
 * 04-dashboard.spec.ts — Dashboard deep tests
 *
 * Verifies all dashboard widgets render correctly:
 * GreetingHeader, QuickCapture (add/delete), RecentProjects,
 * DailyStats, ActiveAgents, and console cleanliness.
 */

import { test, expect } from './electron.setup';

import {
  assertNoConsoleErrors,
  createConsoleCollector,
} from './helpers/console-collector';
import { navigateToSidebarItem } from './helpers/navigation';
import { waitForPageContent } from './helpers/page-helpers';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Dashboard', () => {
  test('loads after login', async ({ authenticatedWindow: page }) => {
    // authenticatedWindow lands on /dashboard after login
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Page should have visible content
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
    await takeScreenshot(page, 'dashboard-layout');
  });

  test('greeting header shows time-aware greeting', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Dashboard');
    await waitForPageContent(page);

    // GreetingHeader renders an h1 with "Good morning", "Good afternoon", or "Good evening"
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 10_000 });

    const headingText = await heading.innerText();
    expect(headingText).toMatch(/Good (morning|afternoon|evening)/);
  });

  test('QuickCapture input and add button visible', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Dashboard');
    await waitForPageContent(page);

    // Input with the quick capture placeholder
    const input = page.getByPlaceholder('Quick idea, task, or note...');
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Add button (contains Plus icon, is next to the input)
    const addButton = page.locator('button:has(svg)', {
      has: page.locator('svg.lucide-plus'),
    });
    await expect(addButton).toBeVisible();
  });

  test('QuickCapture: add a capture', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Dashboard');
    await waitForPageContent(page);

    const input = page.getByPlaceholder('Quick idea, task, or note...');
    await input.fill('Test capture item');

    // Click the add button
    const addButton = page.locator('button:has(svg.lucide-plus)');
    await expect(addButton).toBeEnabled();
    await addButton.click();

    // Input should be cleared after submission
    await expect(input).toHaveValue('');

    // The capture text should appear in the list below
    const captureText = page.locator('li p', { hasText: 'Test capture item' });
    await expect(captureText).toBeVisible({ timeout: 10_000 });
  });

  test('QuickCapture: delete a capture', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Dashboard');
    await waitForPageContent(page);

    // First add a capture so we have something to delete
    const input = page.getByPlaceholder('Quick idea, task, or note...');
    await input.fill('Capture to delete');

    const addButton = page.locator('button:has(svg.lucide-plus)');
    await addButton.click();

    // Wait for the capture to appear
    const captureItem = page.locator('li', { hasText: 'Capture to delete' });
    await expect(captureItem).toBeVisible({ timeout: 10_000 });

    // Click the remove button (aria-label="Remove capture") within this list item
    const removeButton = captureItem.locator('button[aria-label="Remove capture"]');
    await removeButton.click();

    // The capture should disappear
    await expect(captureItem).not.toBeVisible({ timeout: 10_000 });
  });

  test('Recent Projects section visible', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Dashboard');
    await waitForPageContent(page);

    // "Recent Projects" heading
    const heading = page.locator('h2', { hasText: 'Recent Projects' });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Either project cards or empty state with action buttons
    const projectCards = page.locator('button:has(.lucide-folder-open)');
    const emptyText = page.locator('text=No projects yet');

    const hasProjects = await projectCards.first().isVisible().catch(() => false);
    const hasEmpty = await emptyText.isVisible().catch(() => false);

    // One of the two states must be true
    expect(hasProjects || hasEmpty).toBe(true);
  });

  test('Daily stats visible', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Dashboard');
    await waitForPageContent(page);

    // DailyStats renders text like "X tasks completed · Y agents ran · Z captures"
    const statsText = page.locator('text=tasks completed');
    await expect(statsText).toBeVisible({ timeout: 10_000 });
  });

  test('Active agents section visible', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Dashboard');
    await waitForPageContent(page);

    // "Active Agents" heading
    const heading = page.locator('h2', { hasText: 'Active Agents' });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Either agent sessions listed or empty state "No agents running"
    const emptyText = page.locator('text=No agents running');
    const agentEntries = page.locator('text=Task:');

    const hasEmpty = await emptyText.isVisible().catch(() => false);
    const hasAgents = await agentEntries.first().isVisible().catch(() => false);

    expect(hasEmpty || hasAgents).toBe(true);
  });

  test('no error boundaries', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Dashboard');
    await waitForPageContent(page);

    // No "Something went wrong" error boundary fallback
    const errorBoundary = page.getByText('Something went wrong');
    const hasError = await errorBoundary.isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('no console errors', async ({ authenticatedWindow: page }) => {
    const collector = createConsoleCollector(page);

    await navigateToSidebarItem(page, 'Dashboard');
    await waitForPageContent(page);

    // Interact briefly to trigger any lazy errors
    await page.waitForTimeout(2_000);

    assertNoConsoleErrors(collector);
  });
});
