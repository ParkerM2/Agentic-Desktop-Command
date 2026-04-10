import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export class IntegrationsPage extends BasePage {
  async navigate(): Promise<void> {
    await this.navigateToSidebarItem('Integrations');
    await expect(this.page).toHaveURL(/\/integrations/, { timeout: 10_000 });
  }

  async navigateToTab(tabName: string): Promise<void> {
    await this.navigateToSidebarItem('Integrations');
    await expect(this.page).toHaveURL(/\/integrations/, { timeout: 10_000 });
    await this.page.getByRole('tab', { name: tabName }).click();
    await this.waitForLoad();
  }

  async assertTabActive(tabName: string): Promise<void> {
    const tab = this.page.getByRole('tab', { name: tabName });
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }
}
