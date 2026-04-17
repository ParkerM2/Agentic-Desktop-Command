import { useEffect, useMemo, useRef } from 'react';

import { AlertTriangle, Play } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  Badge,
  Button,
  PageContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

import { useRun, useRunScript } from '../api/useRuns';
import { useTestSuiteRuns } from '../api/useTestSuiteRuns';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useRunOutput } from '../hooks/useRunOutput';
import { useRunSteps } from '../hooks/useRunSteps';
import { useTestSuiteStore } from '../test-suite-store';

import { StepTimeline } from './StepTimeline';

function getOutputLineClass(line: string): string {
  if (line.includes('\u2713') || line.includes('passed')) return 'text-green-500';
  if (line.includes('\u2717') || line.includes('Error') || line.includes('error')) return 'text-destructive';
  return 'text-text-muted';
}

function StatusBadgeForRun({ status }: { status: string }) {
  if (status === 'passed') return <Badge className="bg-green-600">Passed</Badge>;
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  if (status === 'running') return <Badge variant="secondary">Running...</Badge>;
  if (status === 'cancelled') return <Badge variant="secondary">Cancelled</Badge>;
  return <Badge variant="secondary">No runs</Badge>;
}

export function ResultsPanel() {
  const { projectId } = useLooseParams();
  const { data: scripts = [] } = useTestSuiteScripts(projectId);
  const selectedScriptId = useTestSuiteStore((s) => s.selectedScriptId);
  const setSelectedScriptId = useTestSuiteStore((s) => s.setSelectedScriptId);
  const selectedRunId = useTestSuiteStore((s) => s.selectedRunId);
  const setSelectedRunId = useTestSuiteStore((s) => s.setSelectedRunId);

  const firstScript = scripts.length > 0 ? scripts[0] : undefined;
  const scriptId = selectedScriptId ?? firstScript?.id ?? null;
  const { data: runs = [] } = useTestSuiteRuns(scriptId);
  const firstRun = runs.length > 0 ? runs[0] : undefined;
  const activeRunId = selectedRunId ?? firstRun?.id ?? null;

  // Live streaming data (only populated while run is active)
  const { lines: liveLines } = useRunOutput(activeRunId);
  const { steps: liveRunSteps } = useRunSteps(activeRunId);

  // Stored run record from DB (populated for completed runs)
  const { data: runRecord } = useRun(activeRunId);

  const runScript = useRunScript();
  const outputRef = useRef<HTMLDivElement>(null);

  // Merge live + stored output: prefer live lines if any, else fall back to stored
  const displayLines = useMemo(() => {
    if (liveLines.length > 0) return liveLines;
    if (runRecord?.outputLines && runRecord.outputLines.length > 0) {
      return runRecord.outputLines.map((line, i) => ({
        line,
        timestamp: `stored-${i}`,
      }));
    }
    return [];
  }, [liveLines, runRecord?.outputLines]);

  // Merge live + stored steps: prefer live if any, else build from script steps for completed runs
  const activeScript = scripts.find((s) => s.id === scriptId);
  const displaySteps = useMemo(() => {
    if (liveRunSteps.length > 0) return liveRunSteps;
    // For completed runs, reconstruct step timeline from the script's steps
    if (runRecord && runRecord.status !== 'running' && activeScript?.steps) {
      return activeScript.steps.map((step, i) => ({
        stepIndex: i,
        stepLabel: stepToLabel(step),
        timestamp: runRecord.startedAt,
        durationMs: null,
      }));
    }
    return [];
  }, [liveRunSteps, runRecord, activeScript?.steps]);

  // Use the active run's status, not the first run's
  const runStatus = runRecord?.status ?? (activeRunId ? 'running' : 'pending');

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [displayLines.length]);

  if (!projectId) return null;

  const handleRun = () => {
    if (scriptId) {
      runScript.mutate({ scriptId }, {
        onSuccess: (data) => {
          setSelectedRunId(data.runId);
        },
      });
    }
  };

  return (
    <PageContent className="flex h-full flex-col overflow-hidden p-1">
      <div className="flex h-full flex-col overflow-hidden rounded-md border border-border">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Select value={scriptId ?? ''} onValueChange={setSelectedScriptId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select test..." />
          </SelectTrigger>
          <SelectContent>
            {scripts.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {runs.length > 1 && (
          <Select value={activeRunId ?? ''} onValueChange={setSelectedRunId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select run..." />
            </SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="flex items-center gap-1.5">
                    <StatusDot status={r.status} />
                    {new Date(r.startedAt).toLocaleTimeString()}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          disabled={!scriptId || runScript.isPending}
          size="sm"
          variant="ghost"
          onClick={handleRun}
        >
          <Play className="h-3 w-3" /> Run
        </Button>

        <StatusBadgeForRun status={runStatus} />

        {runRecord?.error ? (
          <Badge className="ml-auto" variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" /> Error
          </Badge>
        ) : null}
      </div>

      {/* Content split */}
      <div className="flex flex-1 min-h-0">
        {/* Step timeline */}
        <div className="w-80 border-r border-border overflow-y-auto">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-text-muted">
            Steps ({displaySteps.length})
          </div>
          <StepTimeline runStatus={runStatus} steps={displaySteps} />
        </div>

        {/* Output log */}
        <div ref={outputRef} className="flex-1 overflow-y-auto bg-bg-surface p-3">
          {runRecord?.error ? (
            <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {runRecord.error}
            </div>
          ) : null}
          <pre className="font-mono text-xs whitespace-pre-wrap">
            {displayLines.length > 0 ? (
              displayLines.map((l, i) => (
                <div key={l.timestamp === `stored-${i}` ? `stored-${i}` : l.timestamp} className={getOutputLineClass(l.line)}>
                  {l.line}
                </div>
              ))
            ) : (
              <span className="text-text-muted">
                {activeRunId ? 'No output captured for this run.' : 'Run a test to see output here.'}
              </span>
            )}
          </pre>
        </div>
      </div>
      </div>
    </PageContent>
  );
}

const STATUS_DOT_COLORS: Record<string, string> = {
  passed: 'bg-green-500',
  failed: 'bg-destructive',
  running: 'bg-blue-500 animate-pulse',
  cancelled: 'bg-muted-foreground',
};

function StatusDot({ status }: { status: string }) {
  const color = STATUS_DOT_COLORS[status] ?? 'bg-muted-foreground';
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function stepToLabel(step: { type: string; [key: string]: unknown }): string {
  switch (step.type) {
    case 'navigate': return `Navigate → ${step.url as string}`;
    case 'click': return `Click ${step.selector as string}`;
    case 'fill': return `Fill ${step.selector as string}`;
    case 'select': return `Select ${step.selector as string}`;
    case 'press': return `Press ${step.key as string}`;
    case 'wait': return `Wait ${step.ms as number}ms`;
    case 'assert': return `Assert ${step.selector as string}`;
    default: return step.type;
  }
}
