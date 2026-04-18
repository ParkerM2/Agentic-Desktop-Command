import { useEffect, useMemo, useRef, useState } from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ListPlus,
  Play,
  XCircle,
  Zap,
} from 'lucide-react';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import {
  useCreateProgressTask,
  useCreatePlan,
  useRunWorkflow,
  useSpinUpTeam,
  useStartResearch,
} from '@renderer/features/tasks/api/useProgressMutations';
import { useLooseParams } from '@renderer/shared/hooks';
import { ipc } from '@renderer/shared/lib/ipc';
import { useToastStore } from '@renderer/shared/stores';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  PageContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

import { useAttachRunToTask } from '../api/useAttachRunToTask';
import { useRun, useRunScript } from '../api/useRuns';
import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useTestSuiteRuns } from '../api/useTestSuiteRuns';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useRunOutput } from '../hooks/useRunOutput';
import { useRunSteps } from '../hooks/useRunSteps';
import { useTestSuiteStore } from '../test-suite-store';

import { RunLogDialog } from './RunLogDialog';
import { StepTimeline } from './StepTimeline';

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = (ms / 1000).toFixed(1);
  return `${secs}s`;
}

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
  const { data: config } = useTestSuiteConfig(projectId);
  const [activeEnv, setActiveEnv] = useState('default');
  const { data: runs = [] } = useTestSuiteRuns(scriptId);
  const firstRun = runs.length > 0 ? runs[0] : undefined;
  const activeRunId = selectedRunId ?? firstRun?.id ?? null;

  // Live streaming data (only populated while run is active)
  const { lines: liveLines } = useRunOutput(activeRunId);
  const { steps: liveRunSteps } = useRunSteps(activeRunId);

  // Stored run record from DB (populated for completed runs)
  const { data: runRecord } = useRun(activeRunId);

  const addToast = useToastStore((s) => s.addToast);
  const activeScript = scripts.find((s) => s.id === scriptId);
  const runScript = useRunScript();
  const outputRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!runRecord || !activeScript) return;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = runRecord.status;

    if (prevStatus === 'running' && runRecord.status === 'passed') {
      addToast(
        `${activeScript.name} — All tests passed (${formatDuration(runRecord.durationMs)})`,
        'success',
      );
    } else if (prevStatus === 'running' && runRecord.status === 'failed') {
      addToast(
        `${activeScript.name} — ${runRecord.stepsFailed} step(s) failed`,
        'error',
      );
    }
  }, [runRecord, activeScript, addToast]);

  // Task/workflow action state
  const [createdTaskSlug, setCreatedTaskSlug] = useState<string | null>(null);
  const createTask = useCreateProgressTask();
  const attachRunToTask = useAttachRunToTask();
  const runWorkflow = useRunWorkflow();
  const startResearch = useStartResearch();
  const createPlan = useCreatePlan();
  const spinUpTeam = useSpinUpTeam();

  // Reset createdTaskSlug when the selected run changes
  useEffect(() => {
    setCreatedTaskSlug(null);
  }, [activeRunId]);

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
      const baseUrlOverride = activeEnv !== 'default' && config?.environments
        ? config.environments.find((e) => e.name === activeEnv)?.url
        : undefined;
      runScript.mutate({ scriptId, baseUrlOverride }, {
        onSuccess: (data) => {
          setSelectedRunId(data.runId);
        },
      });
    }
  };

  const handleCreateTask = () => {
    if (!activeScript || !runRecord) return;
    const title = `Fix: ${activeScript.name} test failure`;
    const errorLines = runRecord.outputLines
      .filter((l) => l.includes('Error') || l.includes('\u2717'))
      .join('\n');
    const errorSummary =
      runRecord.error
      ?? (errorLines.length > 0 ? errorLines : 'Test failed — see run output for details');
    const description = `## Test Failure\n\n**Script:** ${activeScript.name}\n**Status:** ${runRecord.status}\n**Steps passed:** ${runRecord.stepsPassed}\n**Steps failed:** ${runRecord.stepsFailed}\n\n### Error Output\n\n\`\`\`\n${errorSummary}\n\`\`\``;

    createTask.mutate(
      { title, description, priority: 'high', projectId },
      {
        onSuccess: (task) => {
          setCreatedTaskSlug(task.slug);
          if (activeRunId) {
            attachRunToTask.mutate({ runId: activeRunId, taskId: task.slug });
          }
        },
      },
    );
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

        {Boolean(config?.environments.length) && (
          <Select value={activeEnv} onValueChange={setActiveEnv}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default ({config?.targetUrl})</SelectItem>
              {config?.environments.map((env) => (
                <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>
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

        <RunLogDialog
          lines={displayLines}
          runRecord={runRecord ?? null}
          scriptName={activeScript?.name}
        />

        {runRecord?.error ? (
          <Badge className="ml-auto" variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" /> Error
          </Badge>
        ) : null}
      </div>

      {/* Run summary bar */}
      {runRecord && runRecord.status !== 'running' ? (
        <div className="flex items-center gap-4 border-b border-border bg-bg-surface px-4 py-1.5 text-xs">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            {runRecord.stepsPassed} passed
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            {runRecord.stepsFailed} failed
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-text-muted" />
            {formatDuration(runRecord.durationMs)}
          </span>
          {runRecord.reportPath ? (
            <ViewReportButton reportPath={runRecord.reportPath} />
          ) : null}
          {runRecord.status === 'failed' && (
            <div className="ml-auto flex items-center gap-2">
              {createdTaskSlug ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Zap className="mr-1 h-3 w-3" /> Start Workflow
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() =>
                        runWorkflow.mutate({ slug: createdTaskSlug })
                      }
                    >
                      Full Pipeline (Research → Plan → Team)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        startResearch.mutate({ slug: createdTaskSlug })
                      }
                    >
                      Research Only
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        createPlan.mutate({ slug: createdTaskSlug })
                      }
                    >
                      Plan Only
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        spinUpTeam.mutate({ slug: createdTaskSlug })
                      }
                    >
                      Team Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  disabled={createTask.isPending}
                  size="sm"
                  variant="outline"
                  onClick={handleCreateTask}
                >
                  <ListPlus className="mr-1 h-3 w-3" />
                  {createTask.isPending ? 'Creating...' : 'Create Task'}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : null}

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

function ViewReportButton({ reportPath }: { reportPath: string }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        void ipc(TEST_SUITE.OPEN.REPORT, { reportPath });
      }}
    >
      <FileText className="mr-1 h-3 w-3" /> View Report
    </Button>
  );
}

function stepToLabel(step: { type: string; [key: string]: unknown }): string {
  switch (step.type) {
    case 'navigate': return `Navigate \u2192 ${step.url as string}`;
    case 'click': return `Click ${step.selector as string}`;
    case 'fill': return `Fill ${step.selector as string}`;
    case 'select': return `Select ${step.selector as string}`;
    case 'press': return `Press ${step.key as string}`;
    case 'wait': return `Wait ${step.ms as number}ms`;
    case 'assert': return `Assert ${step.selector as string}`;
    default: return step.type;
  }
}
