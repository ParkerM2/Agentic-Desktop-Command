import { type RefObject, useMemo, useState } from 'react';

import { Check, ClipboardCopy, FileCode, FileText } from 'lucide-react';

import {
  Button,
  Code,
  Flex,
  Grid,
  InlineAlert,
  MetricCard,
  ScrollArea,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from '@ui';

import { getOutputLineClass } from '../lib/format';
import type { RunRecord, StreamOutputLine } from '../lib/types';

interface ResultsOutputLogProps {
  displayLines: StreamOutputLine[];
  outputRef: RefObject<HTMLDivElement | null>;
  activeRunId: string | null;
  errorMessage?: string;
  runRecord?: RunRecord | null;
  scriptName?: string;
}

const OUTPUT_VIEW = {
  SUMMARY: 'summary',
  JSON: 'json',
  RAW: 'raw',
} as const;

function buildSummaryMarkdown(
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

function buildJsonOutput(runRecord: RunRecord, displayLines: StreamOutputLine[]): string {
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size="sm" variant="ghost" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-1 h-3 w-3 text-green-500" /> Copied
        </>
      ) : (
        <>
          <ClipboardCopy className="mr-1 h-3 w-3" /> Copy
        </>
      )}
    </Button>
  );
}

function getCopyText(view: string, summary: string, json: string, raw: string): string {
  if (view === OUTPUT_VIEW.SUMMARY) return summary;
  if (view === OUTPUT_VIEW.JSON) return json;
  return raw;
}

export function ResultsOutputLog({
  displayLines,
  outputRef,
  activeRunId,
  errorMessage,
  runRecord,
  scriptName,
}: ResultsOutputLogProps) {
  const [view, setView] = useState<string>(OUTPUT_VIEW.SUMMARY);

  const summaryText = useMemo(
    () => (runRecord ? buildSummaryMarkdown(runRecord, scriptName, displayLines) : ''),
    [runRecord, scriptName, displayLines],
  );

  const jsonText = useMemo(
    () => (runRecord ? buildJsonOutput(runRecord, displayLines) : '{}'),
    [runRecord, displayLines],
  );

  const rawText = useMemo(
    () => displayLines.map((l) => l.line).join('\n'),
    [displayLines],
  );

  const hasContent = displayLines.length > 0 || runRecord !== undefined;

  return (
    <ScrollArea ref={outputRef} className="flex-1 bg-bg-surface">
      {errorMessage ? (
        <InlineAlert className="mx-3 mt-3" variant="error">
          {errorMessage}
        </InlineAlert>
      ) : null}

      {hasContent ? (
        <Tabs className="flex flex-1 flex-col overflow-hidden" value={view} onValueChange={setView}>
          <Flex className="border-b border-border px-3 py-1" justify="between" wrap="nowrap">
            <TabsList className="h-8">
              <TabsTrigger className="gap-1 text-xs" value={OUTPUT_VIEW.SUMMARY}>
                <FileText className="h-3 w-3" /> Summary
              </TabsTrigger>
              <TabsTrigger className="gap-1 text-xs" value={OUTPUT_VIEW.JSON}>
                <FileCode className="h-3 w-3" /> JSON
              </TabsTrigger>
              <TabsTrigger className="gap-1 text-xs" value={OUTPUT_VIEW.RAW}>
                Raw Log
              </TabsTrigger>
            </TabsList>
            <CopyButton text={getCopyText(view, summaryText, jsonText, rawText)} />
          </Flex>

          <TabsContent className="flex-1 overflow-y-auto p-3 mt-0" value={OUTPUT_VIEW.SUMMARY}>
            <SummaryView
              displayLines={displayLines}
              runRecord={runRecord}
              scriptName={scriptName}
            />
          </TabsContent>

          <TabsContent className="flex-1 overflow-y-auto p-3 mt-0" value={OUTPUT_VIEW.JSON}>
            <Code className="text-xs whitespace-pre-wrap">
              {jsonText}
            </Code>
          </TabsContent>

          <TabsContent className="flex-1 overflow-y-auto p-3 mt-0" value={OUTPUT_VIEW.RAW}>
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
          </TabsContent>
        </Tabs>
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
}: {
  runRecord?: RunRecord | null;
  scriptName?: string;
  displayLines: StreamOutputLine[];
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
    </Stack>
  );
}
