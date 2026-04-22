import type { TestSuiteStep } from '@shared/types/test-suite';

function escape(s: string): string {
  return s.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

export function generateSpecPreview(params: {
  name: string;
  steps: TestSuiteStep[];
  baseUrl?: string;
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
      case 'assert': {
        const method = s.assertMethod ?? 'toHaveText';
        const loc = `page.locator('${escape(s.selector)}')`;
        switch (method) {
          case 'toBeVisible':
            lines.push(`  await expect(${loc}).toBeVisible();`);
            break;
          case 'toBeHidden':
            lines.push(`  await expect(${loc}).toBeHidden();`);
            break;
          case 'toContainText':
            lines.push(`  await expect(${loc}).toContainText('${escape(s.expected)}');`);
            break;
          case 'toHaveCount':
            lines.push(`  await expect(${loc}).toHaveCount(${Number.isNaN(parseInt(s.expected, 10)) ? 0 : parseInt(s.expected, 10)});`);
            break;
          case 'toHaveAttribute':
            lines.push(`  await expect(${loc}).toHaveAttribute('${escape(s.attribute ?? '')}', '${escape(s.expected)}');`);
            break;
          case 'toHaveURL':
            lines.push(`  await expect(page).toHaveURL('${escape(s.expected)}');`);
            break;
          case 'toHaveTitle':
            lines.push(`  await expect(page).toHaveTitle('${escape(s.expected)}');`);
            break;
          case 'toHaveText':
          default:
            lines.push(`  await expect(${loc}).toHaveText('${escape(s.expected)}');`);
            break;
        }
        break;
      }
    }
  }

  lines.push('});', '');
  return lines.join('\n');
}
