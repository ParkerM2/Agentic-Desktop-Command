/**
 * E2E Tests: Sidebar + Layout
 *
 * Verifies sidebar navigation, collapse/expand behavior, title bar,
 * and layout stability using an authenticated session.
 *
 * Tests:
 * 1. Sidebar shows all 9 top-level nav items
 * 2. Clicking each top-level nav navigates to correct route
 * 3. Active nav item is visually distinct (bg-accent + font-medium)
 * 4. Sidebar collapse hides labels, icons remain visible
 * 5. Sidebar expand restores labels
 * 6. Settings button visible in sidebar footer
 * 7. Title bar visible with "ADC" text
 * 8. Title bar has minimize/maximize/close buttons
 * 9. Sidebar persists collapsed state after navigation
 * 10. No console errors during all interactions
 */
import { test, expect } from './electron.setup';
import {
  createConsoleCollector,
  assertNoConsoleErrors,
} from './helpers/console-collector';
import {
  navigateToSidebarItem,
  TOP_LEVEL_NAV_ITEMS,
  assertPageLoaded,
} from './helpers/navigation';

/** Maps sidebar labels to their expected URL path segments. */
const LABEL_TO_ROUTE: Record<string, string> = {
  Dashboard: '/dashboard',
  Briefing: '/briefing',
  'My Work': '/my-work',
  Notes: '/notes',
  Fitness: '/fitness',
  Planner: '/planner',
  Productivity: '/productivity',
  Alerts: '/alerts',
  Comms: '/communications',
};

test.describe('Sidebar + Layout', () => {
  test('sidebar shows all 9 top-level nav items', async ({ authenticatedWindow }) => {
    const sidebar = authenticatedWindow.locator('aside nav');

    for (const label of TOP_LEVEL_NAV_ITEMS) {
      const navButton = sidebar.getByRole('button', { name: label });
      await expect(navButton).toBeVisible();
    }
  });

  test('clicking each top-level nav navigates to correct route', async ({
    authenticatedWindow,
  }) => {
    for (const label of TOP_LEVEL_NAV_ITEMS) {
      await navigateToSidebarItem(authenticatedWindow, label);

      const expectedPath = LABEL_TO_ROUTE[label];
      expect(authenticatedWindow.url()).toContain(expectedPath);
      await assertPageLoaded(authenticatedWindow);
    }
  });

  test('active nav item is visually distinct', async ({ authenticatedWindow }) => {
    const sidebar = authenticatedWindow.locator('aside nav');

    // Navigate to Notes
    await navigateToSidebarItem(authenticatedWindow, 'Notes');

    const notesButton = sidebar.getByRole('button', { name: 'Notes' });
    await expect(notesButton).toHaveClass(/bg-accent/);
    await expect(notesButton).toHaveClass(/font-medium/);

    // Dashboard should be inactive
    const dashboardButton = sidebar.getByRole('button', { name: 'Dashboard' });
    await expect(dashboardButton).toHaveClass(/text-muted-foreground/);

    // Navigate to Dashboard and verify it flips
    await navigateToSidebarItem(authenticatedWindow, 'Dashboard');

    await expect(dashboardButton).toHaveClass(/bg-accent/);
    await expect(notesButton).toHaveClass(/text-muted-foreground/);
  });

  test('sidebar collapse hides labels but icons remain visible', async ({
    authenticatedWindow,
  }) => {
    const sidebar = authenticatedWindow.locator('aside');

    // Find the collapse toggle by aria-label
    const collapseButton = sidebar.getByRole('button', { name: 'Collapse sidebar' });
    await expect(collapseButton).toBeVisible();

    // Click to collapse
    await collapseButton.click();

    // After collapse: expand button should appear
    const expandButton = sidebar.getByRole('button', { name: 'Expand sidebar' });
    await expect(expandButton).toBeVisible();

    // Label text for nav items should not be visible (they are not rendered when collapsed)
    // Check a sample of labels — they should not be present as visible text
    for (const label of ['Dashboard', 'Notes', 'Alerts']) {
      const labelSpan = sidebar.locator('nav button').filter({ hasText: label }).locator('span');
      await expect(labelSpan).toHaveCount(0);
    }

    // Icons (svg elements inside nav buttons) should still be visible
    const navIcons = sidebar.locator('nav button svg');
    const iconCount = await navIcons.count();
    expect(iconCount).toBeGreaterThanOrEqual(TOP_LEVEL_NAV_ITEMS.length);

    // Re-expand for cleanup
    await expandButton.click();
  });

  test('sidebar expand restores labels', async ({ authenticatedWindow }) => {
    const sidebar = authenticatedWindow.locator('aside');

    // Collapse first
    const collapseButton = sidebar.getByRole('button', { name: 'Collapse sidebar' });
    await collapseButton.click();

    // Verify collapsed state
    const expandButton = sidebar.getByRole('button', { name: 'Expand sidebar' });
    await expect(expandButton).toBeVisible();

    // Expand
    await expandButton.click();

    // Verify "Collapse sidebar" button is back (meaning we're expanded)
    await expect(
      sidebar.getByRole('button', { name: 'Collapse sidebar' }),
    ).toBeVisible();

    // Labels should be visible again
    for (const label of TOP_LEVEL_NAV_ITEMS) {
      const navButton = sidebar.locator('nav').getByRole('button', { name: label });
      await expect(navButton).toBeVisible();
    }
  });

  test('settings button visible in sidebar footer', async ({ authenticatedWindow }) => {
    const sidebar = authenticatedWindow.locator('aside');

    // Settings button is in the footer area (outside nav), containing "Settings" text
    const settingsButton = sidebar.getByRole('button', { name: 'Settings' });
    await expect(settingsButton).toBeVisible();
  });

  test('title bar visible with ADC text', async ({ authenticatedWindow }) => {
    // The TitleBar has "ADC" text in a span
    const titleBar = authenticatedWindow.locator('.electron-drag');
    await expect(titleBar).toBeVisible();

    const adcText = titleBar.getByText('ADC');
    await expect(adcText).toBeVisible();
  });

  test('title bar has minimize, maximize, and close buttons', async ({
    authenticatedWindow,
  }) => {
    await expect(
      authenticatedWindow.getByRole('button', { name: 'Minimize window' }),
    ).toBeVisible();

    // Maximize or Restore — depends on current state
    const maximizeButton = authenticatedWindow.getByRole('button', {
      name: /Maximize window|Restore window/,
    });
    await expect(maximizeButton).toBeVisible();

    await expect(
      authenticatedWindow.getByRole('button', { name: 'Close window' }),
    ).toBeVisible();
  });

  test('sidebar persists collapsed state after navigation', async ({
    authenticatedWindow,
  }) => {
    const sidebar = authenticatedWindow.locator('aside');

    // Collapse the sidebar
    const collapseButton = sidebar.getByRole('button', { name: 'Collapse sidebar' });
    await collapseButton.click();

    // Verify collapsed
    await expect(
      sidebar.getByRole('button', { name: 'Expand sidebar' }),
    ).toBeVisible();

    // Navigate to a different route while collapsed — use the nav button by icon
    // In collapsed mode, buttons still have the same role/name (name comes from accessible name)
    // The button title attribute is set to the label when collapsed
    const notesButton = sidebar.locator('nav button[title="Notes"]');
    await notesButton.click();
    await authenticatedWindow.waitForLoadState('networkidle');

    // Sidebar should still be collapsed (expand button visible, not collapse)
    await expect(
      sidebar.getByRole('button', { name: 'Expand sidebar' }),
    ).toBeVisible();

    // Navigate to another route
    const alertsButton = sidebar.locator('nav button[title="Alerts"]');
    await alertsButton.click();
    await authenticatedWindow.waitForLoadState('networkidle');

    // Still collapsed
    await expect(
      sidebar.getByRole('button', { name: 'Expand sidebar' }),
    ).toBeVisible();

    // Re-expand for cleanup
    await sidebar.getByRole('button', { name: 'Expand sidebar' }).click();
  });

  test('no console errors during sidebar and layout interactions', async ({
    authenticatedWindow,
  }) => {
    const collector = createConsoleCollector(authenticatedWindow);

    // Navigate through several routes
    await navigateToSidebarItem(authenticatedWindow, 'Dashboard');
    await navigateToSidebarItem(authenticatedWindow, 'Briefing');
    await navigateToSidebarItem(authenticatedWindow, 'Notes');

    // Collapse and expand
    const sidebar = authenticatedWindow.locator('aside');
    const collapseButton = sidebar.getByRole('button', { name: 'Collapse sidebar' });
    await collapseButton.click();
    await sidebar.getByRole('button', { name: 'Expand sidebar' }).click();

    // Navigate while expanded
    await navigateToSidebarItem(authenticatedWindow, 'Fitness');
    await navigateToSidebarItem(authenticatedWindow, 'Planner');

    // Assert no unexpected console errors
    assertNoConsoleErrors(collector);
  });
});
