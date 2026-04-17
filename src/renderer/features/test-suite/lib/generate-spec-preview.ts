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
      case 'assert':
        lines.push(`  await expect(page.locator('${escape(s.selector)}')).toHaveText('${escape(s.expected)}');`);
        break;
    }
  }

  lines.push('});', '');
  return lines.join('\n');
}
