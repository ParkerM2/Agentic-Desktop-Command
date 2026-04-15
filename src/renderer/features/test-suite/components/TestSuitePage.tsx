/**
 * TestSuitePage — Split-panel QA recording interface
 *
 * Layout: StepPanel (30%) | WebviewPanel (70%)
 * Control bar: Record, Stop, Save, Run, Export
 * Running state: RunOutputPanel renders below StepPanel in left panel
 */

import { useState } from 'react';

import { Download, Play, Video, VideoOff } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import {
  Button,
  EmptyState,
  Flex,
  PageContent,
  PageHeader,
  PageHeaderActions,
  PageHeaderRow,
  PageHeaderTitle,
  PageLayout,
  Separator,
  Stack,
} from '@ui';

import { useRunScript } from '../api/useRuns';
import { useSaveScript } from '../api/useScriptMutations';
import { useScripts } from '../api/useScripts';
import { useRecorderEvents } from '../hooks/useRecorderEvents';
import { useTestSuiteStore } from '../store';

import { RunOutputPanel } from './RunOutputPanel';
import { ScriptSelector } from './ScriptSelector';
import { StepPanel } from './StepPanel';
import { WebviewPanel } from './WebviewPanel';

interface TestSuitePageProps {
  /** Path to the test-suite preload script; required for webview to function */
  preloadPath?: string;
}

export function TestSuitePage({ preloadPath = '' }: TestSuitePageProps) {
  // Wire up IPC event listeners
  useRecorderEvents();

  const isRecording = useTestSuiteStore((s) => s.isRecording);
  const isRunning = useTestSuiteStore((s) => s.isRunning);
  const recordedSteps = useTestSuiteStore((s) => s.recordedSteps);
  const selectedScriptId = useTestSuiteStore((s) => s.selectedScriptId);
  const startRecording = useTestSuiteStore((s) => s.startRecording);
  const stopRecording = useTestSuiteStore((s) => s.stopRecording);
  const clearOutputLines = useTestSuiteStore((s) => s.clearOutputLines);
  const setRunning = useTestSuiteStore((s) => s.setRunning);

  const [saveName, setSaveName] = useState('');

  const { data: _scripts } = useScripts();
  const saveScript = useSaveScript();
  const runScript = useRunScript();

  const hasSteps = recordedSteps.length > 0;
  const noPreload = preloadPath.length === 0;
  const canRun = selectedScriptId !== null && !isRunning && !isRecording;
  const canSave = hasSteps && !isRecording;

  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSave = () => {
    const name = saveName.trim() || `Script ${new Date().toLocaleString()}`;
    saveScript.mutate({ name, steps: recordedSteps });
    setSaveName('');
  };

  const handleRun = () => {
    if (!selectedScriptId) return;
    clearOutputLines();
    setRunning(true);
    runScript.mutate({ scriptId: selectedScriptId });
  };

  return (
    <PageLayout data-testid="test-suite-page">
      <PageHeader>
        <PageHeaderRow>
          <PageHeaderTitle>Test Suite</PageHeaderTitle>
          <PageHeaderActions>
            <ScriptSelector />
            <Separator className="h-6" orientation="vertical" />
            <Button
              data-testid="btn-record"
              disabled={isRunning || noPreload}
              size="sm"
              variant={isRecording ? 'destructive' : 'primary'}
              onClick={handleRecord}
            >
              {isRecording ? (
                <>
                  <VideoOff className="mr-1.5 size-3.5" />
                  Stop
                </>
              ) : (
                <>
                  <Video className="mr-1.5 size-3.5" />
                  Record
                </>
              )}
            </Button>
            <Button
              data-testid="btn-save"
              disabled={!canSave || saveScript.isPending}
              size="sm"
              variant="outline"
              onClick={handleSave}
            >
              Save
            </Button>
            <Button
              data-testid="btn-run"
              disabled={!canRun || runScript.isPending}
              size="sm"
              variant="outline"
              onClick={handleRun}
            >
              <Play className="mr-1.5 size-3.5" />
              Run
            </Button>
            <Button
              data-testid="btn-export"
              disabled={selectedScriptId === null || isRunning}
              size="sm"
              variant="ghost"
            >
              <Download className="mr-1.5 size-3.5" />
              Export
            </Button>
          </PageHeaderActions>
        </PageHeaderRow>
      </PageHeader>

      <PageContent className="overflow-hidden p-0">
        {noPreload ? (
          <EmptyState
            data-testid="test-suite-no-preload"
            description="Pass a preloadPath prop with the recorder preload script path"
            icon={Video}
            title="Webview preload not configured"
          />
        ) : (
          <Flex className="h-full gap-0">
            {/* Left panel — 30% */}
            <Stack
              className={cn('h-full w-[30%] shrink-0 overflow-hidden border-r p-3')}
              gap="sm"
            >
              <StepPanel />
              {isRunning ? <RunOutputPanel /> : null}
            </Stack>

            {/* Right panel — 70% */}
            <Flex className="min-w-0 flex-1 p-3">
              <WebviewPanel initialUrl="about:blank" preloadPath={preloadPath} />
            </Flex>
          </Flex>
        )}
      </PageContent>
    </PageLayout>
  );
}
