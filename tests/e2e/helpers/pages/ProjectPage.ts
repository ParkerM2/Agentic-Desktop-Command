import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export class ProjectPage extends BasePage {
  async navigateToProjectsList(): Promise<void> {
    const addButton = this.page.locator('button[title="Open project"]');
    await addButton.click();
    await expect(this.page).toHaveURL(/\/projects/, { timeout: 10_000 });
  }

  async openFirstProject(): Promise<boolean> {
    await this.waitForLoad();

    const emptyState = this.page.locator('[data-slot="empty-state"]');
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    if (hasEmpty) return false;

    const projectRows = this.page.locator('button:has(.lucide-folder-open)');
    const count = await projectRows.count();
    if (count === 0) return false;

    await projectRows.first().click();
    await expect(this.page).toHaveURL(/\/projects\/[^/]+\/tasks/, { timeout: 15_000 });
    return true;
  }

  async navigateToView(viewName: string): Promise<void> {
    const navButton = this.page.locator('aside nav button', { hasText: viewName });
    await expect(navButton).toBeEnabled({ timeout: 5_000 });
    await navButton.click();
    await this.waitForLoad();
  }
}
