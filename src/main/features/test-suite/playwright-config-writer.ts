/**
 * Playwright Config Writer — writes a playwright.config.ts for a project.
 *
 * Always writes (no existsSync skip). The config reflects current settings
 * each time a script is saved, including browser selection and worker count.
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';

function mapScreenshotConfig(mode: string | undefined): string {
  switch (mode) {
    case 'manual':
      return "'off'";
    case 'smart':
    case 'per-click':
    case 'per-nav':
    case 'per-form':
    case 'per-assertion':
      return "'on'";
    case undefined:
    default:
      return "'only-on-failure'";
  }
}

export function writePlaywrightConfig(params: {
  projectRoot: string;
  testDir: string;
  baseUrl: string;
  navigationTimeout?: number;
  actionTimeout?: number;
  browsers?: string[];
  workers?: number;
  storageStatePath?: string;
  screenshotMode?: string;
}): string {
  const navigationTimeout = params.navigationTimeout ?? 30000;
  const actionTimeout = params.actionTimeout ?? 10000;
  const browsers = params.browsers ?? ['chromium'];
  const workers = params.workers ?? 1;
  const configPath = path.join(params.projectRoot, 'playwright.config.ts');

  const deviceName: Record<string, string> = {
    chromium: 'Desktop Chrome',
    firefox: 'Desktop Firefox',
    webkit: 'Desktop Safari',
  };

  const projects = browsers
    .map((b) => `    { name: '${b}', use: { ...devices['${deviceName[b] ?? `Desktop ${capitalize(b)}`}'] } },`)
    .join('\n');

  const storageStateLine = params.storageStatePath
    ? `\n    storageState: '${escape(params.storageStatePath)}',`
    : '';

  const content = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '${escape(params.testDir)}',
  timeout: ${navigationTimeout},
  workers: ${workers},
  use: {
    baseURL: process.env.BASE_URL || '${escape(params.baseUrl)}',
    actionTimeout: ${actionTimeout},${storageStateLine}
    screenshot: ${mapScreenshotConfig(params.screenshotMode)},
    trace: 'on-first-retry',
  },
  projects: [
${projects}
  ],
});
`;

  writeFileSync(configPath, content, 'utf8');
  return configPath;
}

// ─── Helpers ─────────────────────────────────────────────────

function escape(s: string): string {
  return s.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
