import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  async navigate(): Promise<void> {
    const settingsButton = this.page.locator('aside button', { hasText: 'Settings' });
    await settingsButton.click();
    await expect(this.page).toHaveURL(/\/settings/, { timeout: 10_000 });
  }

  async assertSettingsSectionVisible(sectionName: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: sectionName })).toBeVisible();
  }

  async navigateToSection(sectionName: string): Promise<void> {
    const sectionLink = this.page.getByRole('button', { name: sectionName });
    await sectionLink.click();
    await this.waitForLoad();
  }
}
