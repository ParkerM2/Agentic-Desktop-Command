/**
 * Shared formatting utilities for the test-suite feature.
 */

import type { RunRecord, StreamOutputLine } from './types';

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = (ms / 1000).toFixed(1);
  return `${secs}s`;
}

export function getOutputLineClass(line: string): string {
  if (line.includes('\u2713') || line.includes('passed')) return 'text-green-500';
  if (line.includes('\u2717') || line.includes('Error') || line.includes('error'))
    return 'text-destructive';
  return 'text-muted-foreground';
}

export function buildSummaryMarkdown(
  runRecord: RunRecord,
  scriptName: string | undefined,
  displayLines: StreamOutputLine[],
): string {
  const totalSteps = (runRecord.stepsPassed ?? 0) + (runRecord.stepsFailed ?? 0);
  const durationSec = ((runRecord.durationMs ?? 0) / 1000).toFixed(1);
  const startDate = runRecord.startedAt ? new Date(runRecord.startedAt).toLocaleString() : 'N/A';

  const lines: string[] = [
    `## ${scriptName ?? 'Test Run'} — ${runRecord.status.toUpperCase()}`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Status | **${runRecord.status}** |`,
    `| Duration | ${durationSec}s |`,
    `| Steps Passed | ${runRecord.stepsPassed ?? 0} / ${totalSteps} |`,
    `| Steps Failed | ${runRecord.stepsFailed ?? 0} / ${totalSteps} |`,
    `| Started | ${startDate} |`,
  ];

  if (runRecord.triggeredBy) {
    lines.push(`| Triggered By | ${runRecord.triggeredBy} |`);
  }

  if (runRecord.error) {
    lines.push('', '### Error', '', '```', runRecord.error, '```');
  }

  const errorLines = displayLines
    .map((l) => l.line)
    .filter((l) => l.includes('Error') || l.includes('\u2717') || l.includes('FAIL'));

  if (errorLines.length > 0 && !runRecord.error) {
    lines.push('', '### Failures', '', '```');
    for (const line of errorLines.slice(0, 20)) {
      lines.push(line);
    }
    if (errorLines.length > 20) {
      lines.push(`... and ${errorLines.length - 20} more`);
    }
    lines.push('```');
  }

  return lines.join('\n');
}

export function buildJsonOutput(runRecord: RunRecord, displayLines: StreamOutputLine[]): string {
  return JSON.stringify(
    {
      status: runRecord.status,
      stepsPassed: runRecord.stepsPassed,
      stepsFailed: runRecord.stepsFailed,
      durationMs: runRecord.durationMs,
      startedAt: runRecord.startedAt,
      completedAt: runRecord.completedAt,
      triggeredBy: runRecord.triggeredBy,
      error: runRecord.error ?? null,
      outputLines: displayLines.map((l) => l.line),
    },
    null,
    2,
  );
}

export function getCopyText(
  view: string,
  runRecord: RunRecord | null | undefined,
  displayLines: StreamOutputLine[],
  scriptName?: string,
): string {
  if (!runRecord) return '';
  if (view === 'json') return buildJsonOutput(runRecord, displayLines);
  if (view === 'summary') return buildSummaryMarkdown(runRecord, scriptName, displayLines);
  return displayLines.map((l) => l.line).join('\n');
}
