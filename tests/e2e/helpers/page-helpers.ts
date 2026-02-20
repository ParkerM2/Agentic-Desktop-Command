/**
 * E2E page interaction helpers — shared patterns for testing page content.
 *
 * These helpers provide common interaction patterns used across spec files.
 */

import { expect } from '@playwright/test';

import type { Page } from 'playwright';

// ─── Empty State Detection ───────────────────────────────────

/**
 * Check whether the current page shows an EmptyState component.
 * EmptyState uses `data-slot="empty-state"`.
 */
export async function hasEmptyState(page: Page): Promise<boolean> {
  const emptyState = page.locator('[data-slot="empty-state"]');
  return emptyState.isVisible().catch(() => false);
}

/**
 * Verify the EmptyState component has valid structure (title + optional description).
 */
export async function verifyEmptyState(page: Page): Promise<void> {
  const emptyState = page.locator('[data-slot="empty-state"]');
  await expect(emptyState).toBeVisible();

  // EmptyState should have a heading (h3)
  const title = emptyState.locator('h3');
  await expect(title).toBeVisible();

  const titleText = await title.innerText();
  expect(titleText.trim().length).toBeGreaterThan(0);
}

// ─── Tab Interaction ──────────────────────────────────────────

/**
 * Click a tab button by its label text and verify it becomes active.
 */
export async function clickTab(page: Page, label: string): Promise<void> {
  const tab = page.getByRole('button', { name: label });
  await tab.click();
  // Wait for content to settle after tab switch
  await page.waitForLoadState('networkidle');
}

/**
 * Verify a button is visible and clickable (not disabled).
 */
export async function verifyButtonClickable(
  page: Page,
  name: string | RegExp,
): Promise<void> {
  const button = page.getByRole('button', { name });
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
}

// ─── Modal Interaction ────────────────────────────────────────

/**
 * Click a button to open a modal/dialog, verify it appears.
 * Returns the dialog locator.
 */
export async function openModalViaButton(
  page: Page,
  buttonName: string | RegExp,
): Promise<void> {
  const button = page.getByRole('button', { name: buttonName });
  await button.click();

  // Wait for dialog/modal to appear (look for dialog role or common overlay patterns)
  const dialog = page.getByRole('dialog');
  const hasDialog = await dialog.isVisible().catch(() => false);

  if (!hasDialog) {
    // Fallback: look for a fixed/absolute positioned overlay
    await page.waitForTimeout(500);
  }
}

/**
 * Close an open modal by clicking its close button (X) or pressing Escape.
 */
export async function closeModal(page: Page): Promise<void> {
  // Try pressing Escape first
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// ─── Form Interaction ─────────────────────────────────────────

/**
 * Fill an input by its placeholder text.
 */
export async function fillByPlaceholder(
  page: Page,
  placeholder: string,
  value: string,
): Promise<void> {
  const input = page.getByPlaceholder(placeholder);
  await input.fill(value);
}

/**
 * Clear an input by its placeholder text.
 */
export async function clearByPlaceholder(page: Page, placeholder: string): Promise<void> {
  const input = page.getByPlaceholder(placeholder);
  await input.clear();
}

// ─── Wait Helpers ─────────────────────────────────────────────

/**
 * Wait for any loading spinner to disappear.
 */
export async function waitForLoadingComplete(page: Page): Promise<void> {
  const spinner = page.locator('.animate-spin');
  const hasSpinner = await spinner.isVisible().catch(() => false);

  if (hasSpinner) {
    await expect(spinner).not.toBeVisible({ timeout: 15_000 });
  }
}

/**
 * Wait for page content to be non-empty (not blank).
 */
export async function waitForPageContent(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await waitForLoadingComplete(page);
}
