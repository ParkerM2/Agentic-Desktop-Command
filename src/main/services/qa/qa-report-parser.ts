/**
 * QA Report Parser
 *
 * Parses Claude agent output into structured QaReport objects.
 * The QA agent outputs JSON blocks in its response that we extract and validate.
 */

import type { QaIssue, QaReport, QaScreenshot, VerificationResult, VerificationSuite } from './qa-types';

// ─── Raw Parse Types ────────────────────────────────────────

interface RawVerificationSuite {
  lint?: string;
  typecheck?: string;
  test?: string;
  build?: string;
  docs?: string;
}

interface RawIssue {
  severity?: string;
  category?: string;
  description?: string;
  screenshot?: string;
  location?: string;
}

interface RawScreenshot {
  label?: string;
  path?: string;
  timestamp?: string;
  annotated?: boolean;
}

interface RawReport {
  result?: string;
  checksRun?: number;
  checksPassed?: number;
  issues?: unknown[];
  verificationSuite?: RawVerificationSuite;
  screenshots?: unknown[];
  duration?: number;
}

// ─── Validators ─────────────────────────────────────────────

const VALID_RESULTS = new Set(['pass', 'fail', 'warnings']);
const VALID_SEVERITIES = new Set(['critical', 'major', 'minor', 'cosmetic']);
const VALID_VERIFICATION = new Set(['pass', 'fail']);

function parseVerificationResult(value: unknown): VerificationResult {
  if (typeof value === 'string' && VALID_VERIFICATION.has(value)) {
    return value as VerificationResult;
  }
  return 'fail';
}

function parseVerificationSuite(raw: RawVerificationSuite | undefined): VerificationSuite {
  if (!raw) {
    return { lint: 'fail', typecheck: 'fail', test: 'fail', build: 'fail', docs: 'fail' };
  }
  return {
    lint: parseVerificationResult(raw.lint),
    typecheck: parseVerificationResult(raw.typecheck),
    test: parseVerificationResult(raw.test),
    build: parseVerificationResult(raw.build),
    docs: parseVerificationResult(raw.docs),
  };
}

function parseIssue(raw: RawIssue): QaIssue | undefined {
  if (!raw.description || typeof raw.description !== 'string') {
    return undefined;
  }

  const severity = typeof raw.severity === 'string' && VALID_SEVERITIES.has(raw.severity)
    ? (raw.severity as QaIssue['severity'])
    : 'minor';

  return {
    severity,
    category: typeof raw.category === 'string' ? raw.category : 'unknown',
    description: raw.description,
    screenshot: typeof raw.screenshot === 'string' ? raw.screenshot : undefined,
    location: typeof raw.location === 'string' ? raw.location : undefined,
  };
}

function parseScreenshot(raw: RawScreenshot): QaScreenshot | undefined {
  if (!raw.path || typeof raw.path !== 'string') {
    return undefined;
  }

  return {
    label: typeof raw.label === 'string' ? raw.label : 'Screenshot',
    path: raw.path,
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
    annotated: raw.annotated === true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseIssues(rawIssues: unknown[] | undefined): QaIssue[] {
  if (!Array.isArray(rawIssues)) {
    return [];
  }
  return rawIssues
    .filter(isRecord)
    .map((item) => parseIssue(item as RawIssue))
    .filter((issue): issue is QaIssue => issue !== undefined);
}

function parseScreenshots(rawScreenshots: unknown[] | undefined): QaScreenshot[] {
  if (!Array.isArray(rawScreenshots)) {
    return [];
  }
  return rawScreenshots
    .filter(isRecord)
    .map((item) => parseScreenshot(item as RawScreenshot))
    .filter((s): s is QaScreenshot => s !== undefined);
}

// ─── Main Parser ────────────────────────────────────────────

/**
 * Extract JSON blocks from agent output text.
 * Looks for ```json ... ``` fenced blocks or raw JSON objects.
 */
function extractJsonBlocks(text: string): unknown[] {
  const blocks: unknown[] = [];

  // Match fenced JSON code blocks
  const fencedPattern = /```json\s*\n([\s\S]*?)\n\s*```/g;
  let match = fencedPattern.exec(text);
  while (match) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // Invalid JSON — skip
    }
    match = fencedPattern.exec(text);
  }

  // If no fenced blocks, try to find raw JSON objects
  if (blocks.length === 0) {
    const objectPattern = /\{[\s\S]*?"result"[\s\S]*?\}/g;
    let rawMatch = objectPattern.exec(text);
    while (rawMatch) {
      try {
        blocks.push(JSON.parse(rawMatch[0]));
      } catch {
        // Invalid JSON — skip
      }
      rawMatch = objectPattern.exec(text);
    }
  }

  return blocks;
}

/**
 * Try to convert a raw block into a QaReport.
 * Returns undefined if the block is not a valid report.
 */
function tryParseBlock(block: unknown, durationMs: number): QaReport | undefined {
  if (!isRecord(block)) {
    return undefined;
  }

  const raw = block as RawReport;

  if (!raw.result || !VALID_RESULTS.has(raw.result)) {
    return undefined;
  }

  const issues = parseIssues(raw.issues);
  const screenshots = parseScreenshots(raw.screenshots);
  const verificationSuite = parseVerificationSuite(raw.verificationSuite);
  const suiteChecks = Object.values(verificationSuite);
  const suitePassed = suiteChecks.filter((v) => v === 'pass').length;

  const checksRun = typeof raw.checksRun === 'number' ? raw.checksRun : suiteChecks.length + issues.length;
  const checksPassed = typeof raw.checksPassed === 'number' ? raw.checksPassed : suitePassed + issues.length;

  return {
    result: raw.result as QaReport['result'],
    checksRun,
    checksPassed,
    issues,
    verificationSuite,
    screenshots,
    duration: typeof raw.duration === 'number' ? raw.duration : durationMs,
  };
}

/**
 * Parse agent output text into a structured QA report.
 * Returns undefined if no valid report can be parsed.
 */
export function parseQaReport(agentOutput: string, durationMs: number): QaReport | undefined {
  const blocks = extractJsonBlocks(agentOutput);

  for (const block of blocks) {
    const report = tryParseBlock(block, durationMs);
    if (report) {
      return report;
    }
  }

  return undefined;
}

/**
 * Create a fallback report when parsing fails.
 * Used when the QA agent output is not parseable.
 */
export function createFallbackReport(durationMs: number, error?: string): QaReport {
  return {
    result: 'fail',
    checksRun: 0,
    checksPassed: 0,
    issues: error
      ? [{ severity: 'critical', category: 'parse_error', description: error }]
      : [],
    verificationSuite: { lint: 'fail', typecheck: 'fail', test: 'fail', build: 'fail', docs: 'fail' },
    screenshots: [],
    duration: durationMs,
  };
}
