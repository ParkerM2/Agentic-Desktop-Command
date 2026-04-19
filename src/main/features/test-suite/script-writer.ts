/**
 * Script Writer — generates Playwright .spec.ts files from TestSuiteStep[]
 *
 * Pure utility: takes recorded steps, writes a valid Playwright test file
 * to `<projectRoot>/<testDir>/scripts/<slugified-name>.spec.ts`.
 *
 * Features:
 * - Smart waits after navigation (waitForLoadState + configurable timeout)
 * - Playwright-preferred locators (getByTestId > getByLabel > getByPlaceholder > getByRole > getByText > CSS fallback)
 * - Configurable action timeouts on click/fill/select
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { TestSuiteStepSchema } from '@shared/ipc/test-suite/schemas';

type TestSuiteStep = typeof TestSuiteStepSchema extends { _output: infer T } ? T : never;

// ─── Public API ──────────────────────────────────────────────

type ScreenshotMode = 'smart' | 'per-click' | 'per-nav' | 'per-form' | 'per-assertion' | 'manual';

interface StepContext {
  text?: string;
  label?: string;
  placeholder?: string;
  tagName: string;
  inputType?: string;
}

export function writeSpecFile(params: {
  projectRoot: string;
  testDir: string;
  name: string;
  baseUrl: string;
  steps: TestSuiteStep[];
  screenshotMode?: ScreenshotMode;
  navigationTimeout?: number;
  actionTimeout?: number;
}): string {
  const mode = params.screenshotMode ?? 'manual';
  const navigationTimeout = params.navigationTimeout ?? 30_000;
  const actionTimeout = params.actionTimeout ?? 10_000;
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

  // If the first step isn't a navigate, inject page.goto(baseUrl) so Playwright
  // doesn't run against a blank page.
  const firstStep = params.steps.at(0);
  if (firstStep?.type !== 'navigate' && params.baseUrl) {
    lines.push(
      `  await page.goto('${escape(params.baseUrl)}');`,
      `  await page.waitForLoadState('networkidle', { timeout: ${navigationTimeout} });`,
    );
  }

  let prevType: string | null = null;

  for (const s of params.steps) {
    switch (s.type) {
      case 'navigate':
        lines.push(
          `  await page.goto('${escape(s.url)}');`,
          `  await page.waitForLoadState('networkidle', { timeout: ${navigationTimeout} });`,
        );
        break;
      case 'click':
        lines.push(`  await ${buildLocator(s.selector, s.context)}.click({ timeout: ${actionTimeout} });`);
        break;
      case 'fill':
        lines.push(`  await ${buildLocator(s.selector, s.context)}.fill('${escape(s.value)}', { timeout: ${actionTimeout} });`);
        break;
      case 'select':
        lines.push(`  await ${buildLocator(s.selector, s.context)}.selectOption('${escape(s.value)}', { timeout: ${actionTimeout} });`);
        break;
      case 'press':
        lines.push(`  await page.keyboard.press('${escape(s.key)}');`);
        break;
      case 'wait':
        lines.push(`  await page.waitForTimeout(${s.ms});`);
        break;
      case 'assert': {
        const method = s.assertMethod ?? 'toHaveText';
        const locator = `page.locator('${escape(s.selector)}')`;
        switch (method) {
          case 'toBeVisible':
            lines.push(`  await expect(${locator}).toBeVisible({ timeout: ${actionTimeout} });`);
            break;
          case 'toBeHidden':
            lines.push(`  await expect(${locator}).toBeHidden({ timeout: ${actionTimeout} });`);
            break;
          case 'toContainText':
            lines.push(`  await expect(${locator}).toContainText('${escape(s.expected)}', { timeout: ${actionTimeout} });`);
            break;
          case 'toHaveCount':
            lines.push(`  await expect(${locator}).toHaveCount(${Number.isNaN(parseInt(s.expected, 10)) ? 0 : parseInt(s.expected, 10)}, { timeout: ${actionTimeout} });`);
            break;
          case 'toHaveAttribute':
            lines.push(`  await expect(${locator}).toHaveAttribute('${escape(s.attribute ?? '')}', '${escape(s.expected)}', { timeout: ${actionTimeout} });`);
            break;
          case 'toHaveURL':
            lines.push(`  await expect(page).toHaveURL('${escape(s.expected)}', { timeout: ${actionTimeout} });`);
            break;
          case 'toHaveTitle':
            lines.push(`  await expect(page).toHaveTitle('${escape(s.expected)}', { timeout: ${actionTimeout} });`);
            break;
          case 'toHaveText':
          default:
            lines.push(`  await expect(${locator}).toHaveText('${escape(s.expected)}', { timeout: ${actionTimeout} });`);
            break;
        }
        break;
      }
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

// ─── Locator Builder ────────────────────────────────────────

/**
 * Maps a step's selector + optional context to the best Playwright locator.
 *
 * Priority chain (Playwright recommended order):
 * 1. data-testid  — `page.getByTestId('...')`
 * 2. label        — `page.getByLabel('...')`
 * 3. placeholder  — `page.getByPlaceholder('...')`
 * 4. role+text    — `page.getByRole('button'|'link', { name: '...' })`
 * 5. short text   — `page.getByText('...')`
 * 6. CSS fallback — `page.locator('...')`
 */
function buildLocator(selector: string, context?: StepContext): string {
  // Strip SVG/path children — clicks on icons should target the parent button/link
  const cleanedSelector = selector.replace(/\s*>\s*(svg|path)(\s*>\s*(svg|path))*$/i, '');

  // Priority 1: data-testid from selector
  const testIdMatch = /\[data-testid="([^"]+)"\]/.exec(cleanedSelector);
  if (testIdMatch) return `page.getByTestId('${escape(testIdMatch[1])}')`;

  if (context) {
    // Priority 2: label
    if (context.label) {
      return `page.getByLabel('${escape(context.label)}')`;
    }

    // Priority 3: placeholder
    if (context.placeholder) {
      return `page.getByPlaceholder('${escape(context.placeholder)}')`;
    }

    // Priority 4: role-based (buttons, links) — also match when click target was SVG/path inside button
    const isIconClick = ['svg', 'path'].includes(context.tagName);
    if (context.text && (['button', 'a'].includes(context.tagName) || isIconClick)) {
      // For icon clicks, check if the cleaned selector ends with a button/link
      const parentIsClickable = isIconClick && /\b(button|a)\b/i.test(cleanedSelector);
      if (!isIconClick || parentIsClickable) {
        const role = context.tagName === 'a' || /\ba\b/.test(cleanedSelector) ? 'link' : 'button';
        return `page.getByRole('${role}', { name: '${escape(context.text)}' })`;
      }
    }

    // Priority 5: text content (short text only, exclude form elements)
    if (
      context.text &&
      context.text.length < 60 &&
      !['input', 'select', 'textarea'].includes(context.tagName)
    ) {
      return `page.getByText('${escape(context.text)}')`;
    }
  }

  // Priority 6: CSS fallback — use cleaned selector (SVG/path stripped)
  return `page.locator('${escape(cleanedSelector)}')`;
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
