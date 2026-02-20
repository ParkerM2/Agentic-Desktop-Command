/**
 * Project-scoped pages E2E tests.
 *
 * Verifies every page that requires an active project: Tasks, Terminals,
 * Agents, Pipeline, Roadmap, Ideation, GitHub, Changelog, and Insights.
 * Each test navigates via real sidebar clicks and asserts page-specific
 * elements or correct empty-state UI.
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import {
  navigateToProjectsList,
  navigateToProjectView,
  openFirstProject,
} from './helpers/navigation';

import type { ConsoleCollector } from './helpers/console-collector';

// ─── Project-Scoped Pages ─────────────────────────────────────────

test.describe('Project-Scoped Pages', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);

    // Navigate to projects list and open the first project
    await navigateToProjectsList(authenticatedWindow);
    await authenticatedWindow.waitForLoadState('networkidle');

    const opened = await openFirstProject(authenticatedWindow);

    if (!opened) {
      test.skip(true, 'No projects — cannot test project-scoped pages');
      return;
    }

    // Wait for the project tasks page to fully load
    await expect(authenticatedWindow).toHaveURL(/\/projects\/[^/]+\/tasks/, {
      timeout: 15_000,
    });
    await authenticatedWindow.waitForLoadState('networkidle');
  });

  // ── 1. Tasks Page ────────────────────────────────────────────────

  test('Tasks page — AG-Grid renders with toolbar and search input', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    // AG-Grid theme class should be present
    const agGrid = page.locator('.ag-theme-quartz');
    await expect(agGrid).toBeVisible({ timeout: 15_000 });

    // Search input is present and accepts text
    const searchInput = page.locator('input[placeholder="Search tasks..."]');
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');

    // Clear the search to restore original state
    await searchInput.clear();

    // "New Task" button is visible
    const newTaskButton = page.getByRole('button', { name: 'New Task' });
    await expect(newTaskButton).toBeVisible();
  });

  test('Tasks page — expand toggle shows detail row when rows exist', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    // Wait for grid to render
    await expect(page.locator('.ag-theme-quartz')).toBeVisible({ timeout: 15_000 });

    // Check if there are any data rows
    const dataRows = page.locator('.ag-row:not(.ag-full-width-row-detail)');
    const rowCount = await dataRows.count();

    if (rowCount === 0) {
      // No rows — verify the "No tasks found" overlay is shown
      await expect(page.getByText('No tasks found')).toBeVisible({ timeout: 5_000 });
      return;
    }

    // Click the expand toggle on the first row (first cell in the row)
    const firstRowExpandCell = dataRows.first().locator('.ag-cell').first();
    await firstRowExpandCell.click();

    // Verify a detail row appeared (full-width row)
    const detailRow = page.locator('.ag-full-width-row-detail');
    await expect(detailRow).toBeVisible({ timeout: 5_000 });
  });

  // ── 2. Terminals Page ────────────────────────────────────────────

  test('Terminals page — renders terminal grid or empty state', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Terminals');

    // Either terminal tabs area or empty state should be visible
    const emptyState = page.getByText('No terminal open');
    const newTerminalButton = page.locator('button[title="New terminal"]');

    const hasEmpty = await emptyState.isVisible().catch(() => false);

    await (hasEmpty
      ? // Empty state: "Create Terminal" button should be visible
        expect(page.getByRole('button', { name: 'Create Terminal' })).toBeVisible({
          timeout: 5_000,
        })
      : // Terminal tabs area should have the "+" button for new terminal
        expect(newTerminalButton).toBeVisible({ timeout: 5_000 }));
  });

  // ── 3. Agents Page ───────────────────────────────────────────────

  test('Agents page — renders agent dashboard or empty state', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Agents');

    // "Agents" heading should be visible
    await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({
      timeout: 10_000,
    });

    // Either agent session cards or "No agents running" empty state
    const emptyState = page.getByText('No agents running');
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    if (hasEmpty) {
      // Verify the helpful message in empty state
      await expect(page.getByText('Execute a task to start an agent')).toBeVisible();
    } else {
      // At least one agent session card should be present (border-border rounded card)
      const sessionCards = page.locator('.border-border.rounded-lg.border.p-4');
      expect(await sessionCards.count()).toBeGreaterThan(0);
    }
  });

  // ── 4. Pipeline Page ─────────────────────────────────────────────

  test('Pipeline page — renders workflow pipeline with task selector', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Pipeline');

    // "Workflow Pipeline" heading should be visible
    await expect(page.getByText('Workflow Pipeline')).toBeVisible({ timeout: 10_000 });

    // Task selector should be present (a combobox or select element)
    // When no task is selected, the prompt to select one should show
    const selectPrompt = page.getByText('Select a task to view its workflow pipeline');
    const isPromptVisible = await selectPrompt.isVisible().catch(() => false);

    if (isPromptVisible) {
      // No task selected — this is valid empty state
      await expect(selectPrompt).toBeVisible();
    } else {
      // A task is selected — pipeline diagram should be visible
      // Pipeline steps are rendered as clickable nodes
      const pipelineSteps = page.locator('[class*="rounded"]').filter({ hasText: /backlog|planning|queued|running|review|done/i });
      expect(await pipelineSteps.count()).toBeGreaterThan(0);
    }
  });

  // ── 5. Roadmap Page ──────────────────────────────────────────────

  test('Roadmap page — renders milestones or empty state with New Milestone button', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Roadmap');

    // "Roadmap" heading should be visible
    await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible({
      timeout: 10_000,
    });

    // "New Milestone" button should always be visible
    await expect(page.getByRole('button', { name: 'New Milestone' })).toBeVisible({
      timeout: 5_000,
    });

    // Either milestone cards or empty state
    const emptyState = page.getByText('No milestones yet');
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    if (hasEmpty) {
      await expect(page.getByText('Create your first milestone to start planning')).toBeVisible();
    } else {
      // Summary stats should be visible (Total Milestones, Completed, Overall Progress)
      await expect(page.getByText('Total Milestones')).toBeVisible();
      await expect(page.getByText('Overall Progress')).toBeVisible();

      // Timeline section should be visible
      await expect(page.getByText('Timeline')).toBeVisible();
    }
  });

  // ── 6. Ideation Page ─────────────────────────────────────────────

  test('Ideation page — renders ideas with filter pills and New Idea button', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Ideation');

    // "Ideation" heading should be visible
    await expect(page.getByRole('heading', { name: 'Ideation' })).toBeVisible({
      timeout: 10_000,
    });

    // "New Idea" button should always be visible
    await expect(page.getByRole('button', { name: 'New Idea' })).toBeVisible({
      timeout: 5_000,
    });

    // Category filter pills should be visible
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Features' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Improvements' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bugs' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Performance' })).toBeVisible();

    // Either idea cards or empty state
    const emptyState = page.getByText('No ideas in this category');
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    if (hasEmpty) {
      await expect(page.getByText('Try a different filter or add a new idea')).toBeVisible();
    } else {
      // Idea cards should exist in the grid
      const ideaCards = page.locator('.border-border.bg-card.rounded-lg.border.p-4');
      expect(await ideaCards.count()).toBeGreaterThan(0);
    }
  });

  // ── 7. GitHub Page ───────────────────────────────────────────────

  test('GitHub page — renders with tabs and connection status', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'GitHub');

    // "GitHub" heading should be visible
    await expect(page.getByRole('heading', { name: 'GitHub' })).toBeVisible({
      timeout: 10_000,
    });

    // Tabs should be visible: Pull Requests, Issues, Notifications
    await expect(page.getByRole('button', { name: 'Pull Requests' })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole('button', { name: 'Issues' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();

    // Stats cards should be present (Open PRs, Open Issues, Unread)
    await expect(page.getByText('Open PRs')).toBeVisible();
    await expect(page.getByText('Open Issues')).toBeVisible();
  });

  // ── 8. Changelog Page ────────────────────────────────────────────

  test('Changelog page — renders timeline or empty state with Generate button', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Changelog');

    // "Changelog" heading should be visible
    await expect(page.getByRole('heading', { name: 'Changelog' })).toBeVisible({
      timeout: 10_000,
    });

    // "Generate from Git" button should always be visible
    await expect(page.getByRole('button', { name: 'Generate from Git' })).toBeVisible({
      timeout: 5_000,
    });

    // Either version cards (timeline) or empty state
    const emptyState = page.getByText('No changelog entries');
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    await (hasEmpty
      ? expect(
          page.getByText('Entries will appear here as releases are published'),
        ).toBeVisible()
      : // Timeline should have version cards
        expect(page.getByText('Version history and release notes')).toBeVisible());
  });

  // ── 9. Insights Page ─────────────────────────────────────────────

  test('Insights page — renders stats cards and chart areas', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await navigateToProjectView(page, 'Insights');

    // "Insights" heading should be visible
    await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible({
      timeout: 10_000,
    });

    // Subtitle
    await expect(page.getByText('Project metrics and activity')).toBeVisible();

    // Wait for metrics to load (either stats cards or loading message)
    const loadingText = page.getByText('Loading metrics...');
    const isLoading = await loadingText.isVisible().catch(() => false);

    if (isLoading) {
      // Wait for loading to finish (max 10s)
      await expect(loadingText).not.toBeVisible({ timeout: 10_000 });
    }

    // Stat cards should be visible after loading
    await expect(page.getByText('Tasks Complete')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Agent Runs')).toBeVisible();
    await expect(page.getByText('Success Rate')).toBeVisible();
    await expect(page.getByText('Active Agents')).toBeVisible();

    // Distribution and breakdown sections
    await expect(page.getByText('Task Distribution')).toBeVisible();
    await expect(page.getByText('Project Breakdown')).toBeVisible();
  });

  // ── 10. No Console Errors ────────────────────────────────────────

  test('no unexpected console errors across project-scoped pages', () => {
    assertNoConsoleErrors(collector);
  });
});
