import { useEffect, useMemo, useRef, useState } from 'react';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';
import { useToastStore } from '@renderer/shared/stores';

import { PageContent } from '@ui';

import { useRun, useRunScript } from '../api/useRuns';
import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useTestSuiteRuns } from '../api/useTestSuiteRuns';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useRunOutput } from '../hooks/useRunOutput';
import { useRunSteps } from '../hooks/useRunSteps';
import { formatDuration, stepToLabel } from '../lib/format';
import { useTestSuiteStore } from '../test-suite-store';

import { ResultsOutputLog } from './ResultsOutputLog';
import { ResultsToolbar, ViewReportButton } from './ResultsToolbar';
import { ResultsWorkflowActions } from './ResultsWorkflowActions';
import { StepTimeline } from './StepTimeline';

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
      const baseUrlOverride =
        activeEnv !== 'default' && config?.environments
          ? config.environments.find((e) => e.name === activeEnv)?.url
          : undefined;
      runScript.mutate({ scriptId, baseUrlOverride }, {
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
        <ResultsToolbar
          activeEnv={activeEnv}
          activeRunId={activeRunId}
          activeScriptName={activeScript?.name}
          config={config}
          displayLines={displayLines}
          isRunning={runScript.isPending}
          runRecord={runRecord}
          runStatus={runStatus}
          runs={runs}
          scriptId={scriptId}
          scripts={scripts}
          onEnvChange={setActiveEnv}
          onRun={handleRun}
          onRunChange={setSelectedRunId}
          onScriptChange={setSelectedScriptId}
        />

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
              <ResultsWorkflowActions
                activeRunId={activeRunId}
                activeScript={activeScript}
                projectId={projectId}
                runRecord={runRecord}
              />
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
          <ResultsOutputLog
            activeRunId={activeRunId}
            displayLines={displayLines}
            errorMessage={runRecord?.error}
            outputRef={outputRef}
          />
        </div>
      </div>
    </PageContent>
  );
}
