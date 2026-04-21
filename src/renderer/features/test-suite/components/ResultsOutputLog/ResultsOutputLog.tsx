import type { RefObject } from 'react';

import {
  Code,
  Flex,
  Grid,
  InlineAlert,
  MetricCard,
  ScrollArea,
  SectionHeader,
  Stack,
  Text,
} from '@ui';

import { getOutputLineClass } from '../../lib/format';
import { ScreenshotGallery } from '../ScreenshotGallery';

import { useResultsOutputLog } from './useResultsOutputLog';

import type { RunRecord, StreamOutputLine } from '../../lib/types';

interface ScreenshotItem {
  id: string;
  stepIndex: number;
  stepLabel: string;
  trigger: string;
  filePath: string;
  capturedAt: string;
}

interface ResultsOutputLogProps {
  displayLines: StreamOutputLine[];
  outputRef: RefObject<HTMLDivElement | null>;
  activeRunId: string | null;
  view: string;
  errorMessage?: string;
  runRecord?: RunRecord | null;
  screenshots?: ScreenshotItem[];
  scriptName?: string;
}

export function ResultsOutputLog({
  displayLines,
  outputRef,
  activeRunId,
  view,
  errorMessage,
  runRecord,
  screenshots = [],
  scriptName,
}: ResultsOutputLogProps) {
  const vm = useResultsOutputLog({ displayLines, runRecord });

  return (
    <ScrollArea ref={outputRef} className="flex-1 bg-bg-surface">
      {errorMessage ? (
        <InlineAlert className="mx-3 mt-3" variant="error">
          {errorMessage}
        </InlineAlert>
      ) : null}

      {vm.hasContent ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {view === 'summary' && (
            <div className="flex-1 overflow-y-auto p-3">
              <SummaryView
                displayLines={displayLines}
                runRecord={runRecord}
                screenshots={screenshots}
                scriptName={scriptName}
              />
            </div>
          )}

          {view === 'screenshots' && (
            <div className="flex-1 overflow-y-auto p-3">
              <ScreenshotGallery screenshots={screenshots} />
            </div>
          )}

          {view === 'json' && (
            <div className="flex-1 overflow-y-auto p-3">
              <Code className="text-xs whitespace-pre-wrap">
                {vm.jsonText}
              </Code>
            </div>
          )}

          {view === 'raw' && (
            <div className="flex-1 overflow-y-auto p-3">
              <Code className="text-xs whitespace-pre-wrap">
                {displayLines.map((l, i) => (
                  <Text
                    key={l.timestamp === `stored-${i}` ? `stored-${i}` : l.timestamp}
                    className={getOutputLineClass(l.line)}
                  >
                    {l.line}
                    {'\n'}
                  </Text>
                ))}
              </Code>
            </div>
          )}
        </div>
      ) : (
        <Flex align="center" className="h-full p-3" justify="center">
          <Text size="sm" variant="muted">
            {activeRunId ? 'No output captured for this run.' : 'Run a test to see output here.'}
          </Text>
        </Flex>
      )}
    </ScrollArea>
  );
}

// ─── Summary View ────────────────────────────────────────────

function SummaryView({
  runRecord,
  scriptName,
  displayLines,
  screenshots = [],
}: {
  runRecord?: RunRecord | null;
  scriptName?: string;
  displayLines: StreamOutputLine[];
  screenshots?: ScreenshotItem[];
}) {
  if (!runRecord) {
    return <Text variant="muted">Waiting for results...</Text>;
  }

  const totalSteps = (runRecord.stepsPassed ?? 0) + (runRecord.stepsFailed ?? 0);
  const passRate = totalSteps > 0 ? Math.round(((runRecord.stepsPassed ?? 0) / totalSteps) * 100) : 0;
  const durationSec = ((runRecord.durationMs ?? 0) / 1000).toFixed(1);
  const isPassed = runRecord.status === 'passed';

  const errorLines = displayLines
    .map((l) => l.line)
    .filter((l) => l.includes('Error') || l.includes('\u2717') || l.includes('FAIL'));

  return (
    <Stack gap="md">
      {/* Status header */}
      <Flex gap="md" wrap="nowrap">
        <Flex
          align="center"
          justify="center"
          className={`h-10 w-10 rounded-full text-lg ${
            isPassed
              ? 'bg-green-500/15 text-green-500'
              : 'bg-destructive/15 text-destructive'
          }`}
        >
          {isPassed ? '\u2713' : '\u2717'}
        </Flex>
        <Stack gap="none">
          <Text className="font-semibold" size="lg">
            {scriptName ?? 'Test Run'} — {runRecord.status.toUpperCase()}
          </Text>
          <Text size="sm" variant="muted">
            {runRecord.startedAt ? new Date(runRecord.startedAt).toLocaleString() : 'N/A'} \u00b7 {durationSec}s
          </Text>
        </Stack>
      </Flex>

      {/* Metrics grid */}
      <Grid cols={4} gap="sm">
        <MetricCard label="Pass Rate" value={`${passRate}%`} variant="compact" />
        <MetricCard label="Passed" subtitle="steps" value={String(runRecord.stepsPassed ?? 0)} variant="compact" />
        <MetricCard label="Failed" subtitle="steps" value={String(runRecord.stepsFailed ?? 0)} variant="compact" />
        <MetricCard label="Duration" value={`${durationSec}s`} variant="compact" />
      </Grid>

      {/* Error details */}
      {runRecord.error ? (
        <InlineAlert variant="error">
          <Stack gap="sm">
            <Text className="font-semibold" size="sm">Error</Text>
            <Code className="text-xs whitespace-pre-wrap">
              {runRecord.error}
            </Code>
          </Stack>
        </InlineAlert>
      ) : null}

      {/* Failure output */}
      {errorLines.length > 0 && !runRecord.error ? (
        <InlineAlert variant="error">
          <Stack gap="sm">
            <Text className="font-semibold" size="sm">
              Failures ({errorLines.length})
            </Text>
            <Code className="text-xs whitespace-pre-wrap">
              {errorLines.slice(0, 20).join('\n')}
              {errorLines.length > 20 ? `\n... and ${errorLines.length - 20} more` : ''}
            </Code>
          </Stack>
        </InlineAlert>
      ) : null}

      {/* Screenshot preview strip */}
      {screenshots.length > 0 ? (
        <Stack gap="sm">
          <SectionHeader title={`Screenshots (${screenshots.length})`} />
          <ScreenshotGallery screenshots={screenshots} />
        </Stack>
      ) : null}
    </Stack>
  );
}
