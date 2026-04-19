import { formatDuration } from './format';
import type { RunRecord } from './types';

export function buildDefaultDescription(
  scriptName: string,
  runRecord: RunRecord,
): string {
  const errorLines = (runRecord.outputLines ?? [])
    .filter((l) => l.includes('Error') || l.includes('\u2717') || l.includes('FAIL'))
    .slice(0, 30);

  let errorSection = 'Test failed — see run output for details';
  if (runRecord.error) {
    errorSection = runRecord.error;
  } else if (errorLines.length > 0) {
    errorSection = errorLines.join('\n');
  }

  return [
    `## Test Failure Report`,
    '',
    `**Script:** ${scriptName}`,
    `**Status:** ${runRecord.status}`,
    `**Steps Passed:** ${runRecord.stepsPassed ?? 0}`,
    `**Steps Failed:** ${runRecord.stepsFailed ?? 0}`,
    `**Duration:** ${formatDuration(runRecord.durationMs ?? 0)}`,
    `**Run Date:** ${runRecord.startedAt ? new Date(runRecord.startedAt).toLocaleString() : 'N/A'}`,
    '',
    `### Error Output`,
    '',
    '```',
    errorSection,
    '```',
    '',
    `### Full Output`,
    '',
    '```',
    ...(runRecord.outputLines ?? []).slice(0, 100),
    ...((runRecord.outputLines ?? []).length > 100
      ? [`... (${(runRecord.outputLines ?? []).length - 100} more lines)`]
      : []),
    '```',
  ].join('\n');
}
