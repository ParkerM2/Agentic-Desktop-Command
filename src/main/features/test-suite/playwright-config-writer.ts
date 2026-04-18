/**
 * Playwright Config Writer — ensures a playwright.config.ts exists
 *
 * Idempotent: skips writing if the file already exists.
 * Creates a minimal Playwright config pointing at the test-suite's testDir.
 */

import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function ensurePlaywrightConfig(params: {
  projectRoot: string;
  testDir: string;
  baseUrl: string;
  navigationTimeout?: number;
  actionTimeout?: number;
}): string {
  const navigationTimeout = params.navigationTimeout ?? 30000;
  const actionTimeout = params.actionTimeout ?? 10000;
  const configPath = path.join(params.projectRoot, 'playwright.config.ts');

  if (existsSync(configPath)) {
    return configPath;
  }

  const content = `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '${escape(params.testDir)}',
  timeout: ${navigationTimeout},
  use: {
    baseURL: '${escape(params.baseUrl)}',
    actionTimeout: ${actionTimeout},
    trace: 'on-first-retry',
  },
});
`;

  writeFileSync(configPath, content, 'utf8');
  return configPath;
}

// ─── Helpers ─────────────────────────────────────────────────

function escape(s: string): string {
  return s.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}
