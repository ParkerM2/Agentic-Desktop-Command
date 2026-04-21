import { useEffect, useRef, useState } from 'react';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import { Flex, PageContent, Stack, Text } from '@ui';

import { useRun, useRuns, useRunScript } from '../api/useRuns';
import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useTestSuiteScreenshots } from '../api/useTestSuiteScreenshots';
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { useDisplayLines } from '../hooks/useDisplayLines';
import { useDisplaySteps } from '../hooks/useDisplaySteps';
import { useRunCompletionToast } from '../hooks/useRunCompletionToast';
import { formatDuration, getCopyText } from '../lib/format';
import { useTestSuiteStore } from '../test-suite-store';

import { ResultsOutputLog } from './ResultsOutputLog';
import { ResultsToolbar } from './ResultsToolbar';
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
  const { data: runs = [] } = useRuns(scriptId);
  const [activeEnv, setActiveEnv] = useState('default');
  const [outputView, setOutputView] = useState('summary');

  const firstRun = runs.length > 0 ? runs[0] : undefined;
  const activeRunId = selectedRunId ?? firstRun?.id ?? null;
  const { data: runRecord } = useRun(activeRunId);

  const displayLines = useDisplayLines(activeRunId);
  const displaySteps = useDisplaySteps(activeRunId, activeScript?.steps);
  const { data: screenshots } = useTestSuiteScreenshots(activeRunId);

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

  const copyText = getCopyText(outputView, runRecord, displayLines, activeScript?.name);

  return (
    <PageContent className="flex h-full flex-col overflow-hidden p-1">
      <Stack className="flex h-full flex-col overflow-hidden rounded-md border border-border" gap="none">
        <ResultsToolbar
          activeEnv={activeEnv}
          activeRunId={activeRunId}
          config={config}
          copyText={copyText}
          isRunning={runScript.isPending}
          outputView={outputView}
          runRecord={runRecord}
          runs={runs}
          screenshotCount={screenshots?.length ?? 0}
          scriptId={scriptId}
          scripts={scripts}
          onEnvChange={setActiveEnv}
          onRun={handleRun}
          onRunChange={setSelectedRunId}
          onScriptChange={setSelectedScriptId}
          onViewChange={setOutputView}
        />

        <Flex align="stretch" className="flex-1 min-h-0" gap="none" wrap="nowrap">
          <Stack className="w-80 shrink-0 border-r border-border overflow-y-auto" gap="none">
            <Flex align="center" className="h-10 shrink-0 border-b border-border px-3" gap="sm" justify="between" wrap="nowrap">
              <Text className="text-xs font-semibold uppercase text-text-muted">
                Steps ({displaySteps.length})
              </Text>
              {runRecord && runRecord.status !== 'running' ? (
                <Flex align="center" gap="md" wrap="nowrap">
                  <span className="flex items-center gap-1 text-xs leading-none text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
                    {runRecord.stepsPassed}
                  </span>
                  <span className="flex items-center gap-1 text-xs leading-none text-muted-foreground">
                    <XCircle className="h-3 w-3 shrink-0 text-destructive" />
                    {runRecord.stepsFailed}
                  </span>
                  <span className="flex items-center gap-1 text-xs leading-none text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatDuration(runRecord.durationMs)}
                  </span>
                </Flex>
              ) : null}
            </Flex>
            <StepTimeline runStatus={runStatus} steps={displaySteps} />
          </Stack>

          <ResultsOutputLog
            activeRunId={activeRunId}
            displayLines={displayLines}
            errorMessage={runRecord?.error}
            outputRef={outputRef}
            runRecord={runRecord}
            screenshots={screenshots ?? []}
            scriptName={activeScript?.name}
            view={outputView}
          />
        </Flex>
      </Stack>
    </PageContent>
  );
}
