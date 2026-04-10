import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  async navigate(): Promise<void> {
    await this.navigateToSidebarItem('Dashboard');
    await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  }
}
