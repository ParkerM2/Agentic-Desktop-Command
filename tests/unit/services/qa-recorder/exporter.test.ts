/**
 * Unit Tests for QA Recorder Exporter
 *
 * Tests that createExporter().export() produces valid .spec.ts content for
 * each step type (navigate, click, fill, select, press, wait, assert) and
 * that the file path is derived from the script name.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QaExporter, QaStep } from '@main/features/qa/recorder/exporter';

// ── Mock node:fs ──────────────────────────────────────────────────────────
// Must be called before any import that resolves the mocked module.

vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Dynamic imports run after vi.mock() hoisting is complete
const { mkdirSync, writeFileSync } = await import('node:fs');
const { createExporter } = await import('@main/features/qa/recorder/exporter');

const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;

/** Normalise Windows backslashes so path assertions work cross-platform. */
function normPath(p: string): string {
  return p.replaceAll('\\', '/');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function runExport(overrides: {
  scriptId?: string;
  scriptName?: string;
  baseUrl?: string;
  steps?: QaStep[];
  projectPath?: string;
}) {
  const exporter: QaExporter = createExporter();
  return exporter.export({
    scriptId: overrides.scriptId ?? 'script-1',
    scriptName: overrides.scriptName ?? 'My Test',
    baseUrl: overrides.baseUrl ?? '',
    steps: overrides.steps ?? [],
    projectPath: overrides.projectPath ?? '/project',
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('QaExporter', () => {
  beforeEach(() => {
    mockMkdirSync.mockReset();
    mockWriteFileSync.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── File structure ────────────────────────────────────────────────────

  describe('file structure', () => {
    it('creates the output directory recursively', () => {
      runExport({});
      const [dirArg] = mockMkdirSync.mock.calls[0] as [string];
      expect(normPath(dirArg)).toContain('tests/e2e/recorded');
      expect(mockMkdirSync).toHaveBeenCalledWith(expect.anything(), { recursive: true });
    });

    it('writes a .spec.ts file', () => {
      runExport({ scriptName: 'Login Flow' });
      const [fileArg] = mockWriteFileSync.mock.calls[0] as [string];
      expect(normPath(fileArg)).toContain('Login_Flow.spec.ts');
    });

    it('sanitizes the script name for the file name', () => {
      runExport({ scriptName: '123 invalid!name' });
      const [fileArg] = mockWriteFileSync.mock.calls[0] as [string];
      expect(normPath(fileArg)).toContain('_123_invalid_name.spec.ts');
    });

    it('returns the filePath and content', () => {
      const result = runExport({ scriptName: 'My Script' });
      expect(normPath(result.filePath)).toContain('My_Script.spec.ts');
      expect(result.content).toBeTypeOf('string');
    });
  });

  // ── Content — imports and metadata ───────────────────────────────────

  describe('content — imports and script metadata', () => {
    it('includes the playwright test import', () => {
      const { content } = runExport({});
      expect(content).toContain("import { expect, test } from '@playwright/test'");
    });

    it('includes a comment referencing the script id', () => {
      const { content } = runExport({ scriptId: 'abc-123' });
      expect(content).toContain('abc-123');
    });

    it('includes the script name in the test() call', () => {
      const { content } = runExport({ scriptName: 'Checkout Flow' });
      expect(content).toContain('Checkout Flow');
    });

    it('adds an initial goto when baseUrl is set', () => {
      const { content } = runExport({ baseUrl: 'https://app.example.com', steps: [] });
      expect(content).toContain('await page.goto("https://app.example.com")');
    });

    it('does not add an initial goto when baseUrl is empty', () => {
      const { content } = runExport({ baseUrl: '', steps: [] });
      const gotoMatches = content.match(/page\.goto/g) ?? [];
      expect(gotoMatches.length).toBe(0);
    });
  });

  // ── Content — step code generation ───────────────────────────────────

  describe('content — navigate step', () => {
    it('emits page.goto()', () => {
      const steps: QaStep[] = [{ type: 'navigate', url: 'https://example.com' }];
      const { content } = runExport({ steps });
      expect(content).toContain('await page.goto("https://example.com")');
    });
  });

  describe('content — click step', () => {
    it('emits page.click()', () => {
      const steps: QaStep[] = [{ type: 'click', selector: '[data-testid="submit"]' }];
      const { content } = runExport({ steps });
      expect(content).toContain('await page.click("[data-testid=\\"submit\\"]")');
    });
  });

  describe('content — fill step', () => {
    it('emits page.fill() with selector and value', () => {
      const steps: QaStep[] = [{ type: 'fill', selector: '#email', value: 'user@example.com' }];
      const { content } = runExport({ steps });
      expect(content).toContain('await page.fill("#email", "user@example.com")');
    });
  });

  describe('content — select step', () => {
    it('emits page.selectOption()', () => {
      const steps: QaStep[] = [{ type: 'select', selector: '#country', value: 'US' }];
      const { content } = runExport({ steps });
      expect(content).toContain('await page.selectOption("#country", "US")');
    });
  });

  describe('content — press step', () => {
    it('emits page.keyboard.press()', () => {
      const steps: QaStep[] = [{ type: 'press', key: 'Enter' }];
      const { content } = runExport({ steps });
      expect(content).toContain('await page.keyboard.press("Enter")');
    });
  });

  describe('content — wait step', () => {
    it('emits page.waitForTimeout()', () => {
      const steps: QaStep[] = [{ type: 'wait', ms: 1500 }];
      const { content } = runExport({ steps });
      expect(content).toContain('await page.waitForTimeout(1500)');
    });
  });

  describe('content — assert step', () => {
    it('emits expect(locator).toHaveText()', () => {
      const steps: QaStep[] = [{ type: 'assert', selector: 'h1', expected: 'Welcome' }];
      const { content } = runExport({ steps });
      expect(content).toContain('await expect(page.locator("h1")).toHaveText("Welcome")');
    });
  });

  describe('content — multiple steps', () => {
    it('generates a line for every step in order', () => {
      const steps: QaStep[] = [
        { type: 'navigate', url: 'https://example.com' },
        { type: 'click', selector: '[data-testid="btn"]' },
        { type: 'fill', selector: '#name', value: 'Test' },
      ];
      const { content } = runExport({ steps });
      const navigateIdx = content.indexOf('page.goto');
      const clickIdx = content.indexOf('page.click');
      const fillIdx = content.indexOf('page.fill');
      expect(navigateIdx).toBeLessThan(clickIdx);
      expect(clickIdx).toBeLessThan(fillIdx);
    });
  });
});
