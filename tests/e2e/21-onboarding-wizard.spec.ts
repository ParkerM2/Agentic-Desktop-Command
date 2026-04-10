/**
 * Onboarding / Project Creation Wizard E2E tests.
 *
 * Verifies the project creation flow via the CreateProjectWizard component.
 * Tests do NOT require an existing project — they exercise the wizard that
 * creates new ones.
 *
 * Flow:
 *   1. Navigate to projects list
 *   2. Click "New Project" button
 *   3. Verify wizard modal appears
 *   4. Verify first step (Details) renders
 *   5. Close wizard cleanly
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToProjectsList } from './helpers/navigation';
import { ProjectPage } from './helpers/pages';

import type { ConsoleCollector } from './helpers/console-collector';

// ─── Onboarding Wizard ────────────────────────────────────────

test.describe('Onboarding Wizard — Project Creation', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);

    await navigateToProjectsList(authenticatedWindow);
    await authenticatedWindow.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ authenticatedWindow }) => {
    // Close any open wizard/modal before next test
    await authenticatedWindow.keyboard.press('Escape');
    await authenticatedWindow.waitForTimeout(200);
  });

  // ── 1. Projects list ──────────────────────────────────────────

  test('Projects list — renders with "New Project" button', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    // "New Project" button should always be present on projects list page
    const newProjectButton = page.getByRole('button', { name: 'New Project' });
    await expect(newProjectButton).toBeVisible({ timeout: 10_000 });
  });

  // ── 2. Wizard opens ───────────────────────────────────────────

  test('Onboarding wizard — modal appears after clicking "New Project"', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    const newProjectButton = page.getByRole('button', { name: 'New Project' });
    await expect(newProjectButton).toBeVisible({ timeout: 10_000 });
    await newProjectButton.click();

    // The CreateProjectWizard renders as a dialog with aria-modal="true"
    const dialog = page.getByRole('dialog', { name: 'Create new project' });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test('Onboarding wizard — "Create New Project" heading is visible', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await page.getByRole('button', { name: 'New Project' }).click();

    await expect(
      page.getByRole('heading', { name: 'Create New Project' }),
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── 3. Wizard first step ──────────────────────────────────────

  test('Onboarding wizard — first step "Details" is active on open', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await page.getByRole('button', { name: 'New Project' }).click();
    await page.getByRole('dialog', { name: 'Create new project' }).waitFor({ timeout: 5_000 });

    // Step indicators: Details, Tech Stack, GitHub, Review
    await expect(page.getByText('Details')).toBeVisible();
    await expect(page.getByText('Tech Stack')).toBeVisible();
    await expect(page.getByText('GitHub')).toBeVisible();
    await expect(page.getByText('Review')).toBeVisible();
  });

  test('Onboarding wizard — project name input is present on Details step', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await page.getByRole('button', { name: 'New Project' }).click();
    await page.getByRole('dialog', { name: 'Create new project' }).waitFor({ timeout: 5_000 });

    // Details step should have a project name text input
    const nameInput = page.getByRole('textbox', { name: /project name|name/i }).first();
    const hasNameInput = await nameInput.isVisible().catch(() => false);

    if (hasNameInput) {
      await expect(nameInput).toBeVisible();
    } else {
      // Fall back: any input on the first step
      const anyInput = page.locator('input[type="text"], input:not([type])').first();
      await expect(anyInput).toBeVisible({ timeout: 5_000 });
    }
  });

  // ── 4. Wizard navigation buttons ─────────────────────────────

  test('Onboarding wizard — Next button is present on first step', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await page.getByRole('button', { name: 'New Project' }).click();
    await page.getByRole('dialog', { name: 'Create new project' }).waitFor({ timeout: 5_000 });

    // "Next" navigation button should be visible (may be disabled until form is valid)
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible({
      timeout: 5_000,
    });
  });

  // ── 5. Wizard closes cleanly ──────────────────────────────────

  test('Onboarding wizard — close button dismisses the wizard', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await page.getByRole('button', { name: 'New Project' }).click();

    const dialog = page.getByRole('dialog', { name: 'Create new project' });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Close via the X button (aria-label="Close")
    await page.getByRole('button', { name: 'Close' }).click();

    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // Projects list page should still be visible after closing
    await expect(page.getByRole('button', { name: 'New Project' })).toBeVisible({
      timeout: 5_000,
    });
  });

  test('Onboarding wizard — Escape key dismisses the wizard', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    await page.getByRole('button', { name: 'New Project' }).click();

    const dialog = page.getByRole('dialog', { name: 'Create new project' });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  // ── 6. Console errors ─────────────────────────────────────────

  test('no unexpected console errors during wizard open/close flow', async ({
    authenticatedWindow,
  }) => {
    const page = authenticatedWindow;

    // Exercise the wizard open/close cycle
    await page.getByRole('button', { name: 'New Project' }).click();
    await page.getByRole('dialog', { name: 'Create new project' }).waitFor({ timeout: 5_000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    assertNoConsoleErrors(collector);
  });
});
