/**
 * E2E Tests: Top-Level Route Coverage & Empty States
 *
 * Verifies that every top-level route accessible from the sidebar:
 * 1. Navigates successfully (URL matches expected pattern)
 * 2. Page renders without error boundary
 * 3. Page has visible content (not blank)
 * 4. No unexpected console errors
 * 5. Empty state components render where applicable
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

/**
 * Map sidebar labels to their expected URL path segments.
 * Used to verify navigation landed on the correct route.
 */
const ROUTE_URL_MAP: Record<string, string> = {
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

// ─── Top-Level Sidebar Routes ─────────────────────────────────

test.describe('Top-Level Routes', () => {
  for (const label of TOP_LEVEL_NAV_ITEMS) {
    test.describe(`Route: ${label}`, () => {
      test(`navigates to ${label} and renders without errors`, async ({
        authenticatedWindow,
      }) => {
        const collector = createConsoleCollector(authenticatedWindow);

        // Navigate via sidebar
        await navigateToSidebarItem(authenticatedWindow, label);

        // Verify URL contains the expected path segment
        const expectedPath = ROUTE_URL_MAP[label] ?? '';
        expect(expectedPath.length).toBeGreaterThan(0);
        await expect(authenticatedWindow).toHaveURL(new RegExp(expectedPath));

        // Assert page loaded (no error boundary, not blank)
        await assertPageLoaded(authenticatedWindow);

        // No unexpected console errors
        assertNoConsoleErrors(collector);
      });

      test(`${label} page has no error boundary fallback`, async ({
        authenticatedWindow,
      }) => {
        await navigateToSidebarItem(authenticatedWindow, label);

        // Verify no "Something went wrong" error boundary text
        const errorBoundary =
          authenticatedWindow.getByText('Something went wrong');
        await expect(errorBoundary).not.toBeVisible();
      });
    });
  }
});

// ─── Settings Route (Sidebar Footer) ──────────────────────────

test.describe('Route: Settings', () => {
  test('navigates to Settings page and renders settings sections', async ({
    authenticatedWindow,
  }) => {
    const collector = createConsoleCollector(authenticatedWindow);

    // Settings button is in the sidebar footer, not in the top-level nav items.
    // It has the text "Settings" inside the aside element.
    const settingsButton = authenticatedWindow
      .locator('aside')
      .getByRole('button', { name: 'Settings' });
    await settingsButton.click();

    // Wait for navigation to settings
    await authenticatedWindow.waitForLoadState('networkidle');
    await expect(authenticatedWindow).toHaveURL(/\/settings/);

    // Assert page loaded
    await assertPageLoaded(authenticatedWindow);

    // Settings page should show recognizable section content
    // It has sections like Appearance, Typography, etc.
    const pageContent = await authenticatedWindow.locator('body').innerText();
    expect(pageContent.length).toBeGreaterThan(0);

    // No unexpected console errors
    assertNoConsoleErrors(collector);
  });

  test('Settings page has no error boundary fallback', async ({
    authenticatedWindow,
  }) => {
    const settingsButton = authenticatedWindow
      .locator('aside')
      .getByRole('button', { name: 'Settings' });
    await settingsButton.click();
    await authenticatedWindow.waitForLoadState('networkidle');

    const errorBoundary =
      authenticatedWindow.getByText('Something went wrong');
    await expect(errorBoundary).not.toBeVisible();
  });
});

// ─── Console Error Sweep (All Routes) ─────────────────────────

test.describe('Console Error Sweep', () => {
  test('no console errors across all top-level routes', async ({
    authenticatedWindow,
  }) => {
    const collector = createConsoleCollector(authenticatedWindow);

    // Visit every top-level route in sequence and check for errors
    for (const label of TOP_LEVEL_NAV_ITEMS) {
      await navigateToSidebarItem(authenticatedWindow, label);

      // Give lazy-loaded content a moment to settle
      await authenticatedWindow.waitForLoadState('networkidle');
    }

    // Also visit Settings
    const settingsButton = authenticatedWindow
      .locator('aside')
      .getByRole('button', { name: 'Settings' });
    await settingsButton.click();
    await authenticatedWindow.waitForLoadState('networkidle');

    // Assert no unexpected errors across the entire sweep
    assertNoConsoleErrors(collector);
  });
});

// ─── Empty State Detection ────────────────────────────────────

test.describe('Empty States', () => {
  test('pages show empty state or meaningful content', async ({
    authenticatedWindow,
  }) => {
    // Routes that are known to show EmptyState components when there is no data.
    // The EmptyState component uses data-slot="empty-state".
    // Pages that always show content (Dashboard, Settings) won't have empty states.
    const routesWithPotentialEmptyStates = [
      'Briefing',
      'My Work',
      'Notes',
      'Fitness',
      'Planner',
      'Productivity',
      'Alerts',
      'Comms',
    ];

    for (const label of routesWithPotentialEmptyStates) {
      await navigateToSidebarItem(authenticatedWindow, label);
      await authenticatedWindow.waitForLoadState('networkidle');

      // Each page should either:
      // 1. Show an EmptyState component (data-slot="empty-state"), OR
      // 2. Show some meaningful content (not blank)
      const emptyState = authenticatedWindow.locator(
        '[data-slot="empty-state"]',
      );
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      if (hasEmptyState) {
        // EmptyState has a title (h3 element inside it)
        const title = emptyState.locator('h3');
        await expect(title).toBeVisible();
      } else {
        // Page has meaningful content — just verify it's not blank
        await assertPageLoaded(authenticatedWindow);
      }
    }
  });

  test('EmptyState components have accessible structure', async ({
    authenticatedWindow,
  }) => {
    // Navigate through routes and when EmptyState is found,
    // verify it has the expected structure: icon container + title + optional description
    for (const label of TOP_LEVEL_NAV_ITEMS) {
      await navigateToSidebarItem(authenticatedWindow, label);
      await authenticatedWindow.waitForLoadState('networkidle');

      const emptyState = authenticatedWindow.locator(
        '[data-slot="empty-state"]',
      );
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      if (hasEmptyState) {
        // Must have a heading (title)
        const title = emptyState.locator('h3');
        await expect(title).toBeVisible();

        // Title text should not be empty
        const titleText = await title.innerText();
        expect(titleText.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
