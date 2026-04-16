/**
 * Script Writer — generates Playwright .spec.ts files from TestSuiteStep[]
 *
 * Pure utility: takes recorded steps, writes a valid Playwright test file
 * to `<projectRoot>/<testDir>/scripts/<slugified-name>.spec.ts`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';

type TestSuiteStep = typeof TestSuiteStepSchema extends { _output: infer T } ? T : never;

// ─── Public API ──────────────────────────────────────────────

export function writeSpecFile(params: {
  projectRoot: string;
  testDir: string;
  name: string;
  baseUrl: string;
  steps: TestSuiteStep[];
}): string {
  const lines: string[] = [
    "import { test, expect } from '@playwright/test';",
    '',
    `test('${escape(params.name)}', async ({ page }) => {`,
  ];

  for (const s of params.steps) {
    switch (s.type) {
      case 'navigate':
        lines.push(`  await page.goto('${escape(s.url)}');`);
        break;
      case 'click':
        lines.push(`  await page.locator('${escape(s.selector)}').click();`);
        break;
      case 'fill':
        lines.push(`  await page.locator('${escape(s.selector)}').fill('${escape(s.value)}');`);
        break;
      case 'select':
        lines.push(`  await page.locator('${escape(s.selector)}').selectOption('${escape(s.value)}');`);
        break;
      case 'press':
        lines.push(`  await page.keyboard.press('${escape(s.key)}');`);
        break;
      case 'wait':
        lines.push(`  await page.waitForTimeout(${s.ms});`);
        break;
      case 'assert':
        lines.push(`  await expect(page.locator('${escape(s.selector)}')).toHaveText('${escape(s.expected)}');`);
        break;
    }
  }

  lines.push('});', '');

  const outDir = path.join(params.projectRoot, params.testDir, 'scripts');
  mkdirSync(outDir, { recursive: true });

  const filePath = path.join(outDir, `${slugify(params.name)}.spec.ts`);
  writeFileSync(filePath, lines.join('\n'), 'utf8');

  return filePath;
}

// ─── Helpers ─────────────────────────────────────────────────

function escape(s: string): string {
  return s.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '');
}
