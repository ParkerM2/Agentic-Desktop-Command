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

type ScreenshotMode = 'smart' | 'per-click' | 'per-nav' | 'per-form' | 'per-assertion' | 'manual';

export function writeSpecFile(params: {
  projectRoot: string;
  testDir: string;
  name: string;
  baseUrl: string;
  steps: TestSuiteStep[];
  screenshotMode?: ScreenshotMode;
}): string {
  const mode = params.screenshotMode ?? 'manual';
  let ssIdx = 0;

  function screenshotLine(stepType: string): string {
    const idx = String(ssIdx++).padStart(2, '0');
    return `  await page.screenshot({ path: \`\${process.env.SCREENSHOT_DIR}/${idx}-${stepType}.png\` });`;
  }

  /**
   * Determines whether a screenshot should be injected after the current step.
   * `prevType` is the type of the step immediately before, used for form-submit heuristic.
   */
  function shouldCapture(step: TestSuiteStep, prevType: string | null): boolean {
    switch (mode) {
      case 'manual':
        return false;
      case 'per-click':
        return step.type === 'click';
      case 'per-nav':
        return step.type === 'navigate';
      case 'per-assertion':
        return step.type === 'assert';
      case 'per-form':
        // click that follows one or more fills = form submit heuristic
        return step.type === 'click' && prevType === 'fill';
      case 'smart':
        if (step.type === 'navigate') return true;
        if (step.type === 'assert') return true;
        // click after fill(s) = form submit heuristic
        if (step.type === 'click' && prevType === 'fill') return true;
        return false;
      default:
        return false;
    }
  }

  const lines: string[] = [
    "import { test, expect } from '@playwright/test';",
    '',
    `test('${escape(params.name)}', async ({ page }) => {`,
  ];

  let prevType: string | null = null;

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

    if (shouldCapture(s, prevType)) {
      lines.push(screenshotLine(s.type));
    }

    // Track previous step type — for form-submit heuristic, carry 'fill'
    // through consecutive fills so click-after-fills still triggers.
    prevType = s.type === 'fill' ? 'fill' : s.type;
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
