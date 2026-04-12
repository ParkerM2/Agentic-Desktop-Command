/**
 * QA Recorder Exporter — Generates .spec.ts files from recorded steps
 *
 * Converts step JSON into valid Playwright test files and writes them
 * to the tests/e2e/recorded/ directory.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface QaStep {
  type: 'navigate' | 'click' | 'fill' | 'select' | 'press' | 'wait' | 'assert';
  url?: string;
  selector?: string;
  value?: string;
  key?: string;
  ms?: number;
  expected?: string;
}

export interface ExportedSpec {
  filePath: string;
  content: string;
}

export interface QaExporter {
  export: (params: {
    scriptId: string;
    scriptName: string;
    baseUrl: string;
    steps: unknown[];
    projectPath: string;
  }) => ExportedSpec;
}

function stepToCode(step: QaStep, indent = '  '): string {
  switch (step.type) {
    case 'navigate':
      return `${indent}await page.goto(${JSON.stringify(step.url ?? '')});`;
    case 'click':
      return `${indent}await page.click(${JSON.stringify(step.selector ?? '')});`;
    case 'fill':
      return `${indent}await page.fill(${JSON.stringify(step.selector ?? '')}, ${JSON.stringify(step.value ?? '')});`;
    case 'select':
      return `${indent}await page.selectOption(${JSON.stringify(step.selector ?? '')}, ${JSON.stringify(step.value ?? '')});`;
    case 'press':
      return `${indent}await page.keyboard.press(${JSON.stringify(step.key ?? '')});`;
    case 'wait':
      return `${indent}await page.waitForTimeout(${step.ms ?? 0});`;
    case 'assert':
      return `${indent}await expect(page.locator(${JSON.stringify(step.selector ?? '')})).toHaveText(${JSON.stringify(step.expected ?? '')});`;
    default:
      return `${indent}// unknown step type: ${(step as { type: string }).type}`;
  }
}

function sanitizeIdentifier(name: string): string {
  return name.replaceAll(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&');
}

export function createExporter(): QaExporter {
  return {
    export({ scriptId, scriptName, baseUrl, steps, projectPath }) {
      const outputDir = join(projectPath, 'tests', 'e2e', 'recorded');
      mkdirSync(outputDir, { recursive: true });

      const safeName = sanitizeIdentifier(scriptName);
      const fileName = `${safeName}.spec.ts`;
      const filePath = join(outputDir, fileName);

      const typedSteps = steps as QaStep[];
      const stepLines = typedSteps.map((s) => stepToCode(s)).join('\n');

      const baseUrlLine = baseUrl ? `\n  await page.goto(${JSON.stringify(baseUrl)});\n` : '';

      const content = [
        `import { expect, test } from '@playwright/test';`,
        ``,
        `// Generated from QA recorder script: ${scriptId}`,
        `// Script name: ${scriptName}`,
        ``,
        `test(${JSON.stringify(scriptName)}, async ({ page }) => {${baseUrlLine}${stepLines ? `\n${stepLines}\n` : ''}});`,
        ``,
      ].join('\n');

      writeFileSync(filePath, content, 'utf-8');

      return { filePath, content };
    },
  };
}
