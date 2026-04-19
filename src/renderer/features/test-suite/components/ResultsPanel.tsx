import { useEffect, useRef, useState } from 'react';

import { useLooseParams } from '@renderer/shared/hooks';

import { Flex, PageContent, Stack, Text } from '@ui';

import { useRun, useRunScript } from '../api/useRuns';
import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useTestSuiteRuns } from '../api/useTestSuiteRuns';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useDisplayLines } from '../hooks/useDisplayLines';
import { useDisplaySteps } from '../hooks/useDisplaySteps';
import { useRunCompletionToast } from '../hooks/useRunCompletionToast';
import { useTestSuiteStore } from '../test-suite-store';

import { CreateTaskFromRunDialog } from './CreateTaskFromRunDialog';
import { ResultsOutputLog } from './ResultsOutputLog';
import { ResultsToolbar } from './ResultsToolbar';
import { RunSummaryBar } from './RunSummaryBar';
import { StepTimeline } from './StepTimeline';

export function ResultsPanel() {
  const { projectId } = useLooseParams();
  if (!projectId) return null;

  return <ResultsPanelInner projectId={projectId} />;
}

function ResultsPanelInner({ projectId }: { projectId: string }) {
  const { data: scripts = [] } = useTestSuiteScripts(projectId);
  const selectedScriptId = useTestSuiteStore((s) => s.selectedScriptId);
  const setSelectedScriptId = useTestSuiteStore((s) => s.setSelectedScriptId);
  const selectedRunId = useTestSuiteStore((s) => s.selectedRunId);
  const setSelectedRunId = useTestSuiteStore((s) => s.setSelectedRunId);

  const firstScript = scripts.length > 0 ? scripts[0] : undefined;
  const scriptId = selectedScriptId ?? firstScript?.id ?? null;
  const activeScript = scripts.find((s) => s.id === scriptId);

  const { data: config } = useTestSuiteConfig(projectId);
  const { data: runs = [] } = useTestSuiteRuns(scriptId);
  const [activeEnv, setActiveEnv] = useState('default');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const firstRun = runs.length > 0 ? runs[0] : undefined;
  const activeRunId = selectedRunId ?? firstRun?.id ?? null;
  const { data: runRecord } = useRun(activeRunId);

  const displayLines = useDisplayLines(activeRunId);
  const displaySteps = useDisplaySteps(activeRunId, activeScript?.steps);

  const runStatus = runRecord?.status ?? (activeRunId ? 'running' : 'pending');
  const runScript = useRunScript();

  useRunCompletionToast(
    runRecord?.status,
    activeScript?.name,
    runRecord?.stepsFailed,
    runRecord?.durationMs,
  );

  const outputRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [displayLines.length]);

  const handleRun = () => {
    if (!scriptId) return;
    const baseUrlOverride =
      activeEnv !== 'default' && config?.environments
        ? config.environments.find((e) => e.name === activeEnv)?.url
        : undefined;
    runScript.mutate({ scriptId, baseUrlOverride }, {
      onSuccess: (data) => setSelectedRunId(data.runId),
    });
  };

  return (
    <PageContent className="flex h-full flex-col overflow-hidden p-1">
      <Stack className="flex h-full flex-col overflow-hidden rounded-md border border-border" gap="none">
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

        {runRecord ? (
          <RunSummaryBar
            activeRunId={activeRunId}
            activeScript={activeScript}
            projectId={projectId}
            runRecord={runRecord}
            onCreateTask={() => setTaskDialogOpen(true)}
          />
        ) : null}

        <Flex align="stretch" className="flex-1 min-h-0" gap="none" wrap="nowrap">
          <Stack className="w-80 shrink-0 border-r border-border overflow-y-auto" gap="none">
            <Flex align="center" className="h-10 shrink-0 border-b border-border px-3" gap="none">
              <Text className="text-xs font-semibold uppercase text-text-muted">
                Steps ({displaySteps.length})
              </Text>
            </Flex>
            <StepTimeline runStatus={runStatus} steps={displaySteps} />
          </Stack>

          <ResultsOutputLog
            activeRunId={activeRunId}
            displayLines={displayLines}
            errorMessage={runRecord?.error}
            outputRef={outputRef}
            runRecord={runRecord}
            scriptName={activeScript?.name}
          />
        </Flex>
      </Stack>

      {runRecord && activeRunId ? (
        <CreateTaskFromRunDialog
          open={taskDialogOpen}
          projectId={projectId}
          runId={activeRunId}
          runRecord={runRecord}
          scriptName={activeScript?.name ?? 'Unknown'}
          onOpenChange={setTaskDialogOpen}
        />
      ) : null}
    </PageContent>
  );
}
