/**
 * TestPhasePanel — select test scripts, run them in batch, and view
 * results within the context of a task's pipeline.
 *
 * Uses the test-suite domain's IPC channels and hooks for script
 * listing, run execution, and output streaming. The "Attach to Task"
 * button is a placeholder — cross-domain attachment IPC will be added
 * in a follow-up task.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { CheckCircle, Play, XCircle } from 'lucide-react';

import { TEST_SUITE_EVENTS } from '@shared/ipc/test-suite/channels';

import { useIpcEvent } from '@renderer/shared/hooks';
import { useLayoutStore } from '@renderer/shared/stores/layout-store';

import { Badge, Button, Checkbox, Spinner, Stack, Text } from '@ui';

import { useRunScript } from '@features/test-suite/api/useRuns';
import { useTestSuiteScripts } from '@features/test-suite/api/useTestSuiteScripts';
import { useRunOutput } from '@features/test-suite/hooks/useRunOutput';

// ─── Types ──────────────────────────────────────────────

interface TestPhasePanelProps {
  taskId: string;
}

interface RunResult {
  scriptId: string;
  scriptName: string;
  runId: string;
  status: 'running' | 'passed' | 'failed' | 'cancelled';
}

// ─── Helpers ────────────────────────────────────────────

function getOutputLineClass(line: string): string {
  if (line.includes('\u2713') || line.includes('passed')) return 'text-green-500';
  if (line.includes('\u2717') || line.includes('failed') || line.includes('Error'))
    return 'text-destructive';
  return 'text-text-muted';
}

type OverallStatus = 'idle' | 'running' | 'passed' | 'failed' | 'mixed';

function overallStatus(results: RunResult[]): OverallStatus {
  if (results.length === 0) return 'idle';
  const statuses = new Set(results.map((r) => r.status));
  if (statuses.has('running')) return 'running';
  if (statuses.has('failed') || statuses.has('cancelled')) return 'failed';
  if (statuses.size === 1 && statuses.has('passed')) return 'passed';
  return 'mixed';
}

function statusBadgeVariant(
  status: OverallStatus,
): 'default' | 'destructive' | 'secondary' | 'success' {
  switch (status) {
    case 'passed': return 'success';
    case 'failed': return 'destructive';
    case 'running': return 'secondary';
    case 'idle': return 'default';
    case 'mixed': return 'default';
  }
}

function statusLabel(status: OverallStatus): string {
  switch (status) {
    case 'idle': return 'Not Started';
    case 'running': return 'Running';
    case 'passed': return 'All Passed';
    case 'failed': return 'Failed';
    case 'mixed': return 'Mixed Results';
  }
}

// ─── Sub-components ─────────────────────────────────────

function RunStatusIcon({ status }: { status: RunResult['status'] }) {
  switch (status) {
    case 'running': return <Spinner className="shrink-0" size="sm" />;
    case 'passed': return <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />;
    case 'failed': return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
    case 'cancelled': return <XCircle className="h-4 w-4 shrink-0 text-text-muted" />;
  }
}

function ScriptListLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <Spinner size="sm" />
    </div>
  );
}

function ScriptListEmpty() {
  return (
    <div className="px-3 py-8 text-center">
      <Text size="sm" variant="muted">
        No test scripts found. Create scripts in the Test Suite tab first.
      </Text>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────

export function TestPhasePanel({ taskId: _taskId }: TestPhasePanelProps) {
  const activeProjectId = useLayoutStore((s) => s.activeProjectId);
  const { data: scripts = [], isLoading: scriptsLoading } = useTestSuiteScripts(activeProjectId);
  const runScript = useRunScript();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<RunResult[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const { lines, clear: clearOutput } = useRunOutput(activeRunId);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines.length]);

  // Listen for run completion events to update result statuses
  useIpcEvent(TEST_SUITE_EVENTS.RUN.COMPLETED, (payload) => {
    setResults((prev) =>
      prev.map((r) =>
        r.runId === payload.runId ? { ...r, status: payload.status } : r,
      ),
    );
  });

  // ── Selection handlers ──────────────────────────────────

  const toggleScript = useCallback((scriptId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scriptId)) {
        next.delete(scriptId);
      } else {
        next.add(scriptId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(scripts.map((s) => s.id)));
  }, [scripts]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  // ── Run handler ─────────────────────────────────────────

  const isRunning = results.some((r) => r.status === 'running');

  const handleStartTestPhase = useCallback(async () => {
    if (selected.size === 0) return;

    clearOutput();
    const newResults: RunResult[] = [];

    // Run scripts sequentially so output is readable
    for (const scriptId of selected) {
      const script = scripts.find((s) => s.id === scriptId);
      if (!script) continue;

      try {
        const { runId } = await runScript.mutateAsync({
          scriptId,
          triggeredBy: 'manual',
        });

        const result: RunResult = {
          scriptId,
          scriptName: script.name,
          runId,
          status: 'running',
        };
        newResults.push(result);
        setResults([...newResults]);
        setActiveRunId(runId);
      } catch {
        newResults.push({
          scriptId,
          scriptName: script.name,
          runId: '',
          status: 'failed',
        });
        setResults([...newResults]);
      }
    }
  }, [selected, scripts, runScript, clearOutput]);

  // ── Derived state ───────────────────────────────────────

  const status = overallStatus(results);

  // ── Render ──────────────────────────────────────────────

  if (!activeProjectId) {
    return (
      <Stack className="items-center justify-center py-12" gap="sm">
        <Text size="sm" variant="muted">No active project selected.</Text>
      </Stack>
    );
  }

  return (
    <div className="flex min-h-0 gap-0">
      {/* ── Left Column: Script Selection ────────── */}
      <div className="flex w-80 shrink-0 flex-col border-r border-border">
        {/* Status badge */}
        <div className="border-b border-border px-3 py-2">
          <Badge size="sm" variant={statusBadgeVariant(status)}>
            {statusLabel(status)}
          </Badge>
        </div>

        {/* Script list */}
        <div className="flex-1 overflow-y-auto">
          {scriptsLoading ? <ScriptListLoading /> : null}
          {!scriptsLoading && scripts.length === 0 ? <ScriptListEmpty /> : null}
          {!scriptsLoading && scripts.length > 0 ? (
            <div className="flex flex-col">
              {scripts.map((script) => {
                const result = results.find((r) => r.scriptId === script.id);
                return (
                  <label
                    key={script.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.has(script.id)}
                      disabled={isRunning}
                      size="sm"
                      onCheckedChange={() => { toggleScript(script.id); }}
                    />
                    <div className="min-w-0 flex-1">
                      <Text className="truncate" size="sm">
                        {script.name}
                      </Text>
                      {script.description ? (
                        <Text className="truncate" size="sm" variant="muted">
                          {script.description}
                        </Text>
                      ) : null}
                    </div>
                    {result ? <RunStatusIcon status={result.status} /> : null}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        <div className="border-t border-border px-3 py-2">
          <div className="mb-2 flex gap-2">
            <Button
              disabled={isRunning || scripts.length === 0}
              size="sm"
              variant="ghost"
              onClick={selectAll}
            >
              Select All
            </Button>
            <Button
              disabled={isRunning || selected.size === 0}
              size="sm"
              variant="ghost"
              onClick={clearSelection}
            >
              Clear
            </Button>
          </div>
          <Button
            className="w-full"
            disabled={selected.size === 0 || isRunning}
            size="sm"
            variant="primary"
            onClick={() => { void handleStartTestPhase(); }}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Start Test Phase ({selected.size})
          </Button>

          {/* TODO: Cross-domain IPC for attaching run results to the task review record */}
          <Button
            disabled
            className="mt-2 w-full"
            size="sm"
            variant="outline"
          >
            Attach to Task (coming soon)
          </Button>
        </div>
      </div>

      {/* ── Right Column: Output ─────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {results.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <Stack className="items-center" gap="sm">
              <Text size="sm" variant="muted">
                Select test scripts and click Start Test Phase to begin.
              </Text>
            </Stack>
          </div>
        ) : (
          <>
            {/* Run summary bar */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <Text className="font-medium" size="sm">
                Results
              </Text>
              <Badge size="sm" variant="secondary">
                {results.filter((r) => r.status === 'passed').length}/{results.length} passed
              </Badge>
              {results.some((r) => r.status === 'failed') ? (
                <Badge size="sm" variant="destructive">
                  {results.filter((r) => r.status === 'failed').length} failed
                </Badge>
              ) : null}
            </div>

            {/* Output stream */}
            <div ref={outputRef} className="flex-1 overflow-y-auto bg-bg-surface p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {lines.length > 0 ? (
                  lines.map((l) => (
                    <div key={l.timestamp} className={getOutputLineClass(l.line)}>
                      {l.line}
                    </div>
                  ))
                ) : (
                  <span className="text-text-muted">Waiting for output...</span>
                )}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
