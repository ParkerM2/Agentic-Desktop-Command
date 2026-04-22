import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { useLooseParams } from '@renderer/shared/hooks';

import { Flex, PageContent, Stack, Text } from '@ui';

import { ResultsOutputLog } from '../ResultsOutputLog';
import { ResultsToolbar } from '../ResultsToolbar';
import { StepTimeline } from '../StepTimeline';

import { formatDuration, useResultsPanel } from './useResultsPanel';

export function ResultsPanel() {
  const { projectId } = useLooseParams();
  if (!projectId) return null;

  return <ResultsPanelInner projectId={projectId} />;
}

function ResultsPanelInner({ projectId }: { projectId: string }) {
  const vm = useResultsPanel(projectId);

  return (
    <PageContent className="flex h-full flex-col overflow-hidden p-1">
      <Stack className="flex h-full flex-col overflow-hidden rounded-md border border-border" gap="none">
        <ResultsToolbar
          activeEnv={vm.activeEnv}
          activeRunId={vm.activeRunId}
          config={vm.config}
          copyText={vm.copyText}
          isRunning={vm.isRunning}
          outputView={vm.outputView}
          runRecord={vm.runRecord}
          runs={vm.runs}
          screenshotCount={vm.screenshots.length}
          scriptId={vm.scriptId}
          scripts={vm.scripts}
          onEnvChange={vm.setActiveEnv}
          onRun={vm.handleRun}
          onRunChange={vm.setSelectedRunId}
          onScriptChange={vm.setSelectedScriptId}
          onViewChange={vm.setOutputView}
        />

        <Flex align="stretch" className="flex-1 min-h-0" gap="none" wrap="nowrap">
          <Stack className="w-80 shrink-0 border-r border-border overflow-y-auto" gap="none">
            <Flex align="center" className="h-10 shrink-0 border-b border-border px-3" gap="sm" justify="between" wrap="nowrap">
              <Text className="text-xs font-semibold uppercase text-text-muted">
                Steps ({vm.displaySteps.length})
              </Text>
              {vm.runRecord && vm.runRecord.status !== 'running' ? (
                <Flex align="center" gap="md" wrap="nowrap">
                  <span className="flex items-center gap-1 text-xs leading-none text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
                    {vm.runRecord.stepsPassed}
                  </span>
                  <span className="flex items-center gap-1 text-xs leading-none text-muted-foreground">
                    <XCircle className="h-3 w-3 shrink-0 text-destructive" />
                    {vm.runRecord.stepsFailed}
                  </span>
                  <span className="flex items-center gap-1 text-xs leading-none text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatDuration(vm.runRecord.durationMs)}
                  </span>
                </Flex>
              ) : null}
            </Flex>
            <StepTimeline runStatus={vm.runStatus} steps={vm.displaySteps} />
          </Stack>

          <ResultsOutputLog
            activeRunId={vm.activeRunId}
            displayLines={vm.displayLines}
            errorMessage={vm.runRecord?.error}
            outputRef={vm.outputRef}
            runRecord={vm.runRecord}
            screenshots={vm.screenshots}
            scriptName={vm.activeScript?.name}
            view={vm.outputView}
          />
        </Flex>
      </Stack>
    </PageContent>
  );
}
