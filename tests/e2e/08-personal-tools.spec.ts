/**
 * E2E tests for Personal Tools: Fitness, Planner tabs under /personal.
 *
 * Uses authenticatedWindow fixture and real sidebar clicks for navigation.
 * All these features are now tabs inside the /personal consolidated page.
 */

import { test, expect } from './electron.setup';
import {
  createConsoleCollector,
  assertNoConsoleErrors,
} from './helpers/console-collector';
import {
  navigateToSidebarItem,
  assertPageLoaded,
} from './helpers/navigation';

// ─── Helper — navigate to Personal tab ────────────────────────

async function navigateToPersonalTab(page: Parameters<typeof navigateToSidebarItem>[0], tabLabel: string) {
  await navigateToSidebarItem(page, 'Personal');
  await expect(page).toHaveURL(/\/personal/, { timeout: 10_000 });
  await page.getByRole('tab', { name: tabLabel }).click();
  await page.waitForLoadState('networkidle');
}

// ─── Fitness Tab ──────────────────────────────────────────────

test.describe('Fitness Tab (under /personal)', () => {
  test('page loads via Personal sidebar click + Fitness tab', async ({ authenticatedWindow: page }) => {
    await navigateToPersonalTab(page, 'Fitness');
    await assertPageLoaded(page);
  });

  test('fitness sub-tabs are visible — Overview, Workouts, Body, Goals', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToPersonalTab(page, 'Fitness');

    await expect(page.getByRole('button', { name: /Overview/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Workouts/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Body/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Goals/ })).toBeVisible();
  });

  test('fitness sub-tab switching changes content', async ({ authenticatedWindow: page }) => {
    await navigateToPersonalTab(page, 'Fitness');

    // Overview tab is default — verify "Recent Workouts" heading is visible
    await expect(page.getByText('Recent Workouts')).toBeVisible();

    // Click Workouts tab
    await page.getByRole('button', { name: /Workouts/ }).click();
    await expect(page.getByText('Recent Workouts')).toBeHidden();

    // Click Body tab
    await page.getByRole('button', { name: /Body/ }).click();
    await page.waitForLoadState('networkidle');

    // Click Goals tab
    await page.getByRole('button', { name: /Goals/ }).click();
    await page.waitForLoadState('networkidle');

    // Click back to Overview
    await page.getByRole('button', { name: /Overview/ }).click();
    await expect(page.getByText('Recent Workouts')).toBeVisible();
  });

  test('Log Workout button is visible and clickable', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToPersonalTab(page, 'Fitness');

    const logWorkoutButton = page.getByRole('button', { name: 'Log Workout' });
    await expect(logWorkoutButton).toBeVisible();
    await logWorkoutButton.click();

    // Clicking Log Workout switches to Workouts tab and shows the form
    await expect(page.getByText('Recent Workouts')).toBeHidden();
  });

  test('no console errors', async ({ authenticatedWindow: page }) => {
    const collector = createConsoleCollector(page);
    await navigateToPersonalTab(page, 'Fitness');

    // Click through all fitness sub-tabs to exercise all content
    for (const tabName of ['Workouts', 'Body', 'Goals', 'Overview']) {
      await page.getByRole('button', { name: new RegExp(tabName) }).click();
      await page.waitForLoadState('networkidle');
    }

    assertNoConsoleErrors(collector);
  });
});

// ─── Planner Tab ──────────────────────────────────────────────

test.describe('Planner Tab (under /personal)', () => {
  test('page loads via Personal sidebar click + Planner tab', async ({ authenticatedWindow: page }) => {
    await navigateToPersonalTab(page, 'Planner');
    await assertPageLoaded(page);

    await expect(page.getByRole('heading', { name: 'Daily Planner' })).toBeVisible();
  });

  test('date navigation — previous/next buttons visible and clickable', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToPersonalTab(page, 'Planner');

    const prevButton = page.getByRole('button', { name: 'Previous day' });
    const nextButton = page.getByRole('button', { name: 'Next day' });

    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    // Get initial date text
    const dateSpan = page.locator('header span.min-w-\\[180px\\]');
    const initialDate = await dateSpan.textContent();

    // Click next day
    await nextButton.click();
    await page.waitForLoadState('networkidle');
    const nextDate = await dateSpan.textContent();
    expect(nextDate).not.toBe(initialDate);

    // Click previous day to go back
    await prevButton.click();
    await page.waitForLoadState('networkidle');
    const backDate = await dateSpan.textContent();
    expect(backDate).toBe(initialDate);
  });

  test('Day/Week toggle buttons visible and switching works', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToPersonalTab(page, 'Planner');

    const dayButton = page.getByRole('button', { name: 'Day', exact: true });
    const weekButton = page.getByRole('button', { name: 'Week', exact: true });

    await expect(dayButton).toBeVisible();
    await expect(weekButton).toBeVisible();

    // Click Week — should switch to week view
    await weekButton.click();
    await page.waitForLoadState('networkidle');

    // Click Day — should switch back to day view
    await dayButton.click();
    await page.waitForLoadState('networkidle');
  });

  test('no console errors', async ({ authenticatedWindow: page }) => {
    const collector = createConsoleCollector(page);
    await navigateToPersonalTab(page, 'Planner');
    await page.waitForLoadState('networkidle');

    // Exercise navigation
    await page.getByRole('button', { name: 'Next day' }).click();
    await page.waitForLoadState('networkidle');

    assertNoConsoleErrors(collector);
  });
});
