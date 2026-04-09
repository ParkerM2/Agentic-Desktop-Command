/**
 * Unit Tests for QA Report Parser
 *
 * Tests parsing of QA agent output into structured QaReport objects,
 * including fenced JSON blocks, raw JSON, validation, and fallback reports.
 */

import { describe, expect, it } from 'vitest';

const { parseQaReport, createFallbackReport } = await import(
  '@main/features/qa/qa-report-parser'
);

// ── Helpers ─────────────────────────────────────────────────────

function wrapInFencedJson(obj: Record<string, unknown>): string {
  return '```json\n' + JSON.stringify(obj) + '\n```';
}

function makeValidReport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    result: 'pass',
    checksRun: 5,
    checksPassed: 5,
    issues: [],
    verificationSuite: {
      lint: 'pass',
      typecheck: 'pass',
      test: 'pass',
      build: 'pass',
      docs: 'pass',
    },
    screenshots: [],
    duration: 1000,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────

describe('QA Report Parser', () => {
  describe('parseQaReport()', () => {
    it('parses a valid fenced JSON block', () => {
      const raw = makeValidReport();
      const text = wrapInFencedJson(raw);
      const report = parseQaReport(text, 5000);

      expect(report).toBeDefined();
      expect(report?.result).toBe('pass');
      expect(report?.checksRun).toBe(5);
      expect(report?.checksPassed).toBe(5);
      expect(report?.issues).toEqual([]);
    });

    it('parses a raw JSON object with "result" field (simple flat object)', () => {
      // Raw JSON fallback uses a simple regex that matches { ... "result" ... }
      // It works for simple objects but not deeply nested ones
      const text = 'Some output... {"result":"fail","checksRun":2,"checksPassed":1} ...more';
      const report = parseQaReport(text, 3000);

      expect(report).toBeDefined();
      expect(report?.result).toBe('fail');
    });

    it('returns undefined for text with no JSON', () => {
      const result = parseQaReport('No JSON here at all', 1000);
      expect(result).toBeUndefined();
    });

    it('returns undefined for invalid JSON in fenced block', () => {
      const text = '```json\n{not valid json}\n```';
      const result = parseQaReport(text, 1000);
      expect(result).toBeUndefined();
    });

    it('returns undefined for JSON without result field', () => {
      const text = wrapInFencedJson({ checksRun: 5, checksPassed: 5 });
      const result = parseQaReport(text, 1000);
      expect(result).toBeUndefined();
    });

    it('returns undefined for JSON with invalid result value', () => {
      const text = wrapInFencedJson({ result: 'unknown' });
      const result = parseQaReport(text, 1000);
      expect(result).toBeUndefined();
    });

    it('parses issues with valid severities', () => {
      const raw = makeValidReport({
        result: 'fail',
        issues: [
          { severity: 'critical', category: 'lint', description: 'Missing semicolon' },
          { severity: 'major', category: 'type', description: 'Type error' },
          { severity: 'minor', category: 'style', description: 'Naming convention' },
          { severity: 'cosmetic', category: 'ui', description: 'Alignment off' },
        ],
      });
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.issues).toHaveLength(4);
      expect(report?.issues[0]?.severity).toBe('critical');
      expect(report?.issues[1]?.severity).toBe('major');
      expect(report?.issues[2]?.severity).toBe('minor');
      expect(report?.issues[3]?.severity).toBe('cosmetic');
    });

    it('defaults severity to minor for invalid values', () => {
      const raw = makeValidReport({
        issues: [{ severity: 'unknown', category: 'lint', description: 'test' }],
      });
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.issues[0]?.severity).toBe('minor');
    });

    it('skips issues without description', () => {
      const raw = makeValidReport({
        issues: [
          { severity: 'major', category: 'test' },
          { severity: 'minor', category: 'lint', description: 'Valid issue' },
        ],
      });
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.issues).toHaveLength(1);
      expect(report?.issues[0]?.description).toBe('Valid issue');
    });

    it('defaults category to unknown when not a string', () => {
      const raw = makeValidReport({
        issues: [{ severity: 'minor', category: 123, description: 'test' }],
      });
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.issues[0]?.category).toBe('unknown');
    });

    it('parses verification suite correctly', () => {
      const raw = makeValidReport({
        verificationSuite: {
          lint: 'pass',
          typecheck: 'fail',
          test: 'pass',
          build: 'fail',
          docs: 'pass',
        },
      });
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.verificationSuite).toEqual({
        lint: 'pass',
        typecheck: 'fail',
        test: 'pass',
        build: 'fail',
        docs: 'pass',
      });
    });

    it('defaults verification suite to all fail when missing', () => {
      const raw = makeValidReport();
      delete raw.verificationSuite;
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.verificationSuite).toEqual({
        lint: 'fail',
        typecheck: 'fail',
        test: 'fail',
        build: 'fail',
        docs: 'fail',
      });
    });

    it('defaults invalid verification values to fail', () => {
      const raw = makeValidReport({
        verificationSuite: {
          lint: 'pass',
          typecheck: 'invalid',
          test: 123,
          build: null,
          docs: 'pass',
        },
      });
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.verificationSuite.typecheck).toBe('fail');
      expect(report?.verificationSuite.test).toBe('fail');
      expect(report?.verificationSuite.build).toBe('fail');
    });

    it('parses screenshots correctly', () => {
      const raw = makeValidReport({
        screenshots: [
          { label: 'Dashboard', path: '/qa/screenshot.png', timestamp: '2026-01-01T00:00:00Z', annotated: true },
        ],
      });
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.screenshots).toHaveLength(1);
      expect(report?.screenshots[0]?.label).toBe('Dashboard');
      expect(report?.screenshots[0]?.path).toBe('/qa/screenshot.png');
      expect(report?.screenshots[0]?.annotated).toBe(true);
    });

    it('skips screenshots without path', () => {
      const raw = makeValidReport({
        screenshots: [
          { label: 'No path' },
          { label: 'Has path', path: '/img.png' },
        ],
      });
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.screenshots).toHaveLength(1);
      expect(report?.screenshots[0]?.path).toBe('/img.png');
    });

    it('defaults screenshot label to "Screenshot" when missing', () => {
      const raw = makeValidReport({
        screenshots: [{ path: '/img.png' }],
      });
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.screenshots[0]?.label).toBe('Screenshot');
    });

    it('uses provided duration from report over durationMs parameter', () => {
      const raw = makeValidReport({ duration: 9999 });
      const report = parseQaReport(wrapInFencedJson(raw), 5000);

      expect(report?.duration).toBe(9999);
    });

    it('falls back to durationMs when report has no duration', () => {
      const raw = makeValidReport();
      delete raw.duration;
      const report = parseQaReport(wrapInFencedJson(raw), 5000);

      expect(report?.duration).toBe(5000);
    });

    it('computes checksRun and checksPassed from suite when not provided', () => {
      const raw = makeValidReport({
        verificationSuite: {
          lint: 'pass',
          typecheck: 'pass',
          test: 'fail',
          build: 'pass',
          docs: 'fail',
        },
      });
      delete raw.checksRun;
      delete raw.checksPassed;
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.checksRun).toBe(5); // 5 suite checks + 0 issues
      expect(report?.checksPassed).toBe(3); // 3 suite passes + 0 issues
    });

    it('prefers first valid report when multiple fenced blocks exist', () => {
      const block1 = makeValidReport({ result: 'pass' });
      const block2 = makeValidReport({ result: 'fail' });
      const text = wrapInFencedJson(block1) + '\n\n' + wrapInFencedJson(block2);
      const report = parseQaReport(text, 1000);

      expect(report?.result).toBe('pass');
    });

    it('skips non-object items in issues array', () => {
      const raw = makeValidReport({
        issues: ['string', 123, null, { severity: 'minor', category: 'test', description: 'valid' }],
      });
      const report = parseQaReport(wrapInFencedJson(raw), 1000);

      expect(report?.issues).toHaveLength(1);
    });
  });

  describe('createFallbackReport()', () => {
    it('creates a fail report with given duration', () => {
      const report = createFallbackReport(5000);

      expect(report.result).toBe('fail');
      expect(report.checksRun).toBe(0);
      expect(report.checksPassed).toBe(0);
      expect(report.issues).toEqual([]);
      expect(report.duration).toBe(5000);
      expect(report.verificationSuite).toEqual({
        lint: 'fail',
        typecheck: 'fail',
        test: 'fail',
        build: 'fail',
        docs: 'fail',
      });
    });

    it('includes error as critical issue when provided', () => {
      const report = createFallbackReport(3000, 'Parse error occurred');

      expect(report.issues).toHaveLength(1);
      expect(report.issues[0]?.severity).toBe('critical');
      expect(report.issues[0]?.category).toBe('parse_error');
      expect(report.issues[0]?.description).toBe('Parse error occurred');
    });

    it('has no issues when no error is provided', () => {
      const report = createFallbackReport(1000);
      expect(report.issues).toHaveLength(0);
    });
  });
});
