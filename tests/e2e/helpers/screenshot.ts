import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Page } from '@playwright/test';

const SCREENSHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'screenshots');

// Ensure directory exists
mkdirSync(SCREENSHOT_DIR, { recursive: true });

export async function takeScreenshot(page: Page, name: string): Promise<string> {
  const filepath = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath });
  return filepath;
}

export async function takeFullPageScreenshot(page: Page, name: string): Promise<string> {
  const filepath = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}
