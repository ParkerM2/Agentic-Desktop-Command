import { useEffect, useRef } from 'react';

import { CheckCircle, Play, XCircle } from 'lucide-react';

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

import { useRunScript } from '../api/useRuns';
import { useTestSuiteRuns } from '../api/useTestSuiteRuns';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useRunOutput } from '../hooks/useRunOutput';
import { useTestSuiteStore } from '../test-suite-store';

function getOutputLineClass(line: string): string {
  if (line.includes('\u2713') || line.includes('passed')) return 'text-green-500';
  if (line.includes('\u2717') || line.includes('Error')) return 'text-destructive';
  return 'text-text-muted';
}

function StatusBadgeForRun({ status }: { status: string }) {
  if (status === 'passed') return <Badge className="bg-green-600">Passed</Badge>;
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  if (status === 'running') return <Badge variant="secondary">Running...</Badge>;
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
  const { lines } = useRunOutput(activeRunId);
  const runScript = useRunScript();

  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines.length]);

  // Parse output lines to extract step results
  const parsedSteps = lines
    .map((l) => {
      const pass = l.line.includes('\u2713') || l.line.includes('passed');
      const fail = l.line.includes('\u2717') || l.line.includes('failed') || l.line.includes('Error');
      if (!pass && !fail) return null;
      return { line: l.line.trim(), passed: pass && !fail, timestamp: l.timestamp };
    })
    .filter(Boolean) as Array<{ line: string; passed: boolean; timestamp: string }>;

  const runStatus = firstRun?.status ?? 'pending';

  if (!projectId) return null;

  const handleRun = () => {
    if (scriptId) {
      runScript.mutate({ scriptId });
    }
  };

  return (
    <PageContent className="p-0">
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
                  {new Date(r.startedAt).toLocaleTimeString()}
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
      </div>

      {/* Content split */}
      <div className="flex flex-1 min-h-0">
        {/* Step list */}
        <div className="w-80 border-r border-border overflow-y-auto">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-text-muted">
            Steps ({parsedSteps.length})
          </div>
          <div className="flex flex-col">
            {parsedSteps.map((step) => (
              <div key={step.timestamp} className="flex items-center gap-2 border-b border-border px-3 py-2">
                {step.passed ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span className="text-sm truncate flex-1">{step.line}</span>
              </div>
            ))}
            {parsedSteps.length === 0 && (
              <div className="p-4 text-sm text-text-muted text-center">
                {lines.length > 0 ? 'Parsing output...' : 'No run results yet'}
              </div>
            )}
          </div>
        </div>

        {/* Output log */}
        <div ref={outputRef} className="flex-1 overflow-y-auto bg-bg-surface p-3">
          <pre className="font-mono text-xs whitespace-pre-wrap">
            {lines.length > 0 ? (
              lines.map((l) => (
                <div key={l.timestamp} className={getOutputLineClass(l.line)}>
                  {l.line}
                </div>
              ))
            ) : (
              <span className="text-text-muted">Run a test to see output here.</span>
            )}
          </pre>
        </div>
      </div>
    </PageContent>
  );
}
