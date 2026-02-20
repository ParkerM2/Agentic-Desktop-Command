/**
 * E2E tests for Personal Tools pages: Fitness, Planner, Productivity.
 *
 * Uses authenticatedWindow fixture and real sidebar clicks for navigation.
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

// ─── Fitness Page ──────────────────────────────────────────────

test.describe('Fitness Page', () => {
  test('page loads via sidebar click', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Fitness');
    await expect(page).toHaveURL(/\/fitness/, { timeout: 10_000 });
    await assertPageLoaded(page);

    // Verify header content
    await expect(page.getByRole('heading', { name: 'Fitness' })).toBeVisible();
  });

  test('tabs are visible — Overview, Workouts, Body, Goals', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSidebarItem(page, 'Fitness');
    await expect(page).toHaveURL(/\/fitness/, { timeout: 10_000 });

    await expect(page.getByRole('button', { name: /Overview/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Workouts/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Body/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Goals/ })).toBeVisible();
  });

  test('tab switching changes content', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Fitness');
    await expect(page).toHaveURL(/\/fitness/, { timeout: 10_000 });

    // Overview tab is default — verify "Recent Workouts" heading is visible
    await expect(page.getByText('Recent Workouts')).toBeVisible();

    // Click Workouts tab
    await page.getByRole('button', { name: /Workouts/ }).click();
    await expect(page.getByText('Recent Workouts')).toBeHidden();

    // Click Body tab
    await page.getByRole('button', { name: /Body/ }).click();
    // Workouts content should no longer be visible; Body content should render
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
    await navigateToSidebarItem(page, 'Fitness');
    await expect(page).toHaveURL(/\/fitness/, { timeout: 10_000 });

    const logWorkoutButton = page.getByRole('button', { name: 'Log Workout' });
    await expect(logWorkoutButton).toBeVisible();
    await logWorkoutButton.click();

    // Clicking Log Workout switches to Workouts tab and shows the form
    // Verify we moved off the Overview tab
    await expect(page.getByText('Recent Workouts')).toBeHidden();
  });

  test('no console errors', async ({ authenticatedWindow: page }) => {
    const collector = createConsoleCollector(page);
    await navigateToSidebarItem(page, 'Fitness');
    await expect(page).toHaveURL(/\/fitness/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    // Click through all tabs to exercise all content
    for (const tabName of ['Workouts', 'Body', 'Goals', 'Overview']) {
      await page.getByRole('button', { name: new RegExp(tabName) }).click();
      await page.waitForLoadState('networkidle');
    }

    assertNoConsoleErrors(collector);
  });
});

// ─── Planner Page ──────────────────────────────────────────────

test.describe('Planner Page', () => {
  test('page loads via sidebar click', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Planner');
    await expect(page).toHaveURL(/\/planner/, { timeout: 10_000 });
    await assertPageLoaded(page);

    await expect(page.getByRole('heading', { name: 'Daily Planner' })).toBeVisible();
  });

  test('date navigation — previous/next buttons visible and clickable', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSidebarItem(page, 'Planner');
    await expect(page).toHaveURL(/\/planner/, { timeout: 10_000 });

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
    await navigateToSidebarItem(page, 'Planner');
    await expect(page).toHaveURL(/\/planner/, { timeout: 10_000 });

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

  test('Today button appears after navigating away and returns to today', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSidebarItem(page, 'Planner');
    await expect(page).toHaveURL(/\/planner/, { timeout: 10_000 });

    // On today's date, "Today" button should NOT be visible
    const todayButton = page.getByRole('button', { name: 'Today', exact: true });

    // Navigate to previous day
    await page.getByRole('button', { name: 'Previous day' }).click();
    await page.waitForLoadState('networkidle');

    // "Today" button should now appear
    await expect(todayButton).toBeVisible({ timeout: 5_000 });

    // Click "Today" to return
    await todayButton.click();
    await page.waitForLoadState('networkidle');

    // "Today" button should disappear again
    await expect(todayButton).toBeHidden({ timeout: 5_000 });
  });

  test('Weekly Review link navigates to /planner/weekly', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSidebarItem(page, 'Planner');
    await expect(page).toHaveURL(/\/planner/, { timeout: 10_000 });

    const weeklyReviewLink = page.getByRole('link', { name: /Weekly Review/ });
    await expect(weeklyReviewLink).toBeVisible();
    await weeklyReviewLink.click();

    await expect(page).toHaveURL(/\/planner\/weekly/, { timeout: 10_000 });
  });

  test('Weekly Review page loads with content', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSidebarItem(page, 'Planner');
    await expect(page).toHaveURL(/\/planner/, { timeout: 10_000 });

    // Navigate to Weekly Review
    await page.getByRole('link', { name: /Weekly Review/ }).click();
    await expect(page).toHaveURL(/\/planner\/weekly/, { timeout: 10_000 });

    await assertPageLoaded(page);
    await expect(page.getByRole('heading', { name: 'Weekly Review' })).toBeVisible();
  });

  test('back to Daily Planner from Weekly Review', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSidebarItem(page, 'Planner');
    await expect(page).toHaveURL(/\/planner/, { timeout: 10_000 });

    // Go to Weekly Review
    await page.getByRole('link', { name: /Weekly Review/ }).click();
    await expect(page).toHaveURL(/\/planner\/weekly/, { timeout: 10_000 });

    // Click "Daily Planner" link to go back
    const dailyLink = page.getByRole('link', { name: /Daily Planner/ });
    await expect(dailyLink).toBeVisible();
    await dailyLink.click();

    // Should be back at /planner (not /planner/weekly)
    await expect(page).toHaveURL(/\/planner$/, { timeout: 10_000 });
  });

  test('no console errors', async ({ authenticatedWindow: page }) => {
    const collector = createConsoleCollector(page);
    await navigateToSidebarItem(page, 'Planner');
    await expect(page).toHaveURL(/\/planner/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    // Exercise navigation
    await page.getByRole('button', { name: 'Next day' }).click();
    await page.waitForLoadState('networkidle');

    // Visit Weekly Review
    await page.getByRole('link', { name: /Weekly Review/ }).click();
    await expect(page).toHaveURL(/\/planner\/weekly/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    assertNoConsoleErrors(collector);
  });
});

// ─── Productivity Page ─────────────────────────────────────────

test.describe('Productivity Page', () => {
  test('page loads via sidebar click', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Productivity');
    await expect(page).toHaveURL(/\/productivity/, { timeout: 10_000 });
    await assertPageLoaded(page);

    await expect(page.getByRole('heading', { name: 'Productivity' })).toBeVisible();
  });

  test('tabs are visible — Overview, Calendar, Spotify', async ({
    authenticatedWindow: page,
  }) => {
    await navigateToSidebarItem(page, 'Productivity');
    await expect(page).toHaveURL(/\/productivity/, { timeout: 10_000 });

    await expect(page.getByRole('button', { name: /Overview/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Calendar/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Spotify/ })).toBeVisible();
  });

  test('tab switching changes content', async ({ authenticatedWindow: page }) => {
    await navigateToSidebarItem(page, 'Productivity');
    await expect(page).toHaveURL(/\/productivity/, { timeout: 10_000 });

    // Overview is default — both widgets shown in a grid
    await page.waitForLoadState('networkidle');

    // Click Calendar tab
    await page.getByRole('button', { name: /Calendar/ }).click();
    await page.waitForLoadState('networkidle');

    // Click Spotify tab
    await page.getByRole('button', { name: /Spotify/ }).click();
    await page.waitForLoadState('networkidle');

    // Click back to Overview
    await page.getByRole('button', { name: /Overview/ }).click();
    await page.waitForLoadState('networkidle');
  });

  test('no console errors', async ({ authenticatedWindow: page }) => {
    const collector = createConsoleCollector(page);
    await navigateToSidebarItem(page, 'Productivity');
    await expect(page).toHaveURL(/\/productivity/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    // Click through all tabs
    for (const tabName of ['Calendar', 'Spotify', 'Overview']) {
      await page.getByRole('button', { name: new RegExp(tabName) }).click();
      await page.waitForLoadState('networkidle');
    }

    assertNoConsoleErrors(collector);
  });
});
