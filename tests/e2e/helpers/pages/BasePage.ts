import { expect } from '@playwright/test';
import type { Locator, Page } from 'playwright';

export class BasePage {
  constructor(protected readonly page: Page) {}

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async assertNoErrors(): Promise<void> {
    const errorBoundary = this.page.getByText('Something went wrong');
    const hasError = await errorBoundary.isVisible().catch(() => false);
    if (hasError) throw new Error('Error boundary visible');
  }

  async dismissModals(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
  }

  getByTestId(id: string): Locator {
    return this.page.locator(`[data-testid="${id}"]`);
  }

  async navigateToSidebarItem(label: string): Promise<void> {
    const navButton = this.page.locator('aside nav button', { hasText: label });
    await navButton.click();
    await this.waitForLoad();
  }

  async assertPageLoaded(): Promise<void> {
    await this.assertNoErrors();
    const bodyText = await this.page.locator('body').innerText();
    if (bodyText.trim().length === 0) {
      throw new Error('Page appears blank — body has no text content');
    }
  }
}
