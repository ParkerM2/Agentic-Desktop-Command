import { useMemo, useState } from 'react';

import { Circle, Play, Save, Square } from 'lucide-react';

import type { ScopeRef } from '@shared/ipc/runners/schemas';
import type { TestSuiteConfig } from '@shared/ipc/test-suite';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  Button,
  Flex,
  Input,
  PageContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Stack,
  Text,
} from '@ui';

import {
  newRunnerProfile,
  useRunnerInstances,
  useRunnerProfiles,
  useSaveRunnerProfile,
  useStartRunnerInstance,
  useStopRunnerInstance,
} from '@features/runners';

import { useSaveScript } from '../api/useSaveScript';
import { useTestSuiteConfigs } from '../api/useTestSuiteConfigs';
import { DEFAULT_VIEWPORT_HEIGHT, DEFAULT_VIEWPORT_WIDTH } from '../lib/constants';
import { useTestSuiteStore } from '../test-suite-store';

import { BrowserViewPanel } from './BrowserViewPanel';
import { SaveRecordingDialog } from './SaveRecordingDialog';
import { StepList } from './StepList';

interface DevServerButtonProps {
  projectId: string;
  serverRunning: boolean;
  activeInstanceId: string | undefined;
}

function DevServerButton({ projectId, serverRunning, activeInstanceId }: DevServerButtonProps) {
  const scope: ScopeRef = useMemo(() => ({ kind: 'project' as const, projectId }), [projectId]);
  const { data: profiles = [] } = useRunnerProfiles(projectId);
  const startRunner = useStartRunnerInstance(scope);
  const stopRunner = useStopRunnerInstance(scope);
  const saveProfile = useSaveRunnerProfile(projectId);

  const handleStart = () => {
    if (profiles.length > 0) {
      startRunner.mutate(profiles[0].id);
    } else {
      const profile = newRunnerProfile(projectId);
      saveProfile.mutate(profile, {
        onSuccess: () => startRunner.mutate(profile.id),
      });
    }
  };

  return (
    <>
      <div className={`h-2 w-2 shrink-0 rounded-full ${serverRunning ? 'bg-green-500 animate-pulse' : 'bg-text-muted/30'}`} />
      {serverRunning && activeInstanceId ? (
        <Button className="h-7" size="sm" variant="destructive" onClick={() => stopRunner.mutate(activeInstanceId)}>
          <Square className="h-3 w-3" /> Stop Server
        </Button>
      ) : (
        <Button
          className="h-7"
          disabled={startRunner.isPending || saveProfile.isPending}
          size="sm"
          onClick={handleStart}
        >
          <Play className="h-3 w-3" /> Start Server
        </Button>
      )}
    </>
  );
}

export function RecordingPanel() {
  const { projectId } = useLooseParams();
  const { data: configs = [] } = useTestSuiteConfigs(projectId ?? '');
  const [selectedConfigId, setSelectedConfigId] = useState<string>();
  const [scriptName, setScriptName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const recording = useTestSuiteStore((s) => s.recordingActive);
  const setRecordingActive = useTestSuiteStore((s) => s.setRecordingActive);
  const recordedSteps = useTestSuiteStore((s) => s.recordedSteps);
  const clearSteps = useTestSuiteStore((s) => s.clearSteps);
  const saveScript = useSaveScript(projectId ?? '');

  // Runner state — shared between DevServerButton and BrowserViewPanel
  const scope: ScopeRef = useMemo(
    () => ({ kind: 'project' as const, projectId: projectId ?? '' }),
    [projectId],
  );
  const { data: instances = [] } = useRunnerInstances(scope);
  const activeInstance = instances.find(
    (i) => i.status === 'running' || i.status === 'ready' || i.status === 'starting',
  );
  const serverRunning = Boolean(activeInstance);

  const activeConfig = useMemo((): TestSuiteConfig | null => {
    if (configs.length === 0) return null;
    return configs.find((c) => c.id === selectedConfigId)
      ?? configs.find((c) => c.isActive)
      ?? configs[0];
  }, [configs, selectedConfigId]);

  const vw = activeConfig ? activeConfig.viewportWidth : DEFAULT_VIEWPORT_WIDTH;
  const vh = activeConfig ? activeConfig.viewportHeight : DEFAULT_VIEWPORT_HEIGHT;

  // URL state — initialized from active config, editable via address bar
  const [urlOverride, setUrlOverride] = useState<string>();
  const url = urlOverride ?? activeConfig?.targetUrl ?? '';

  if (!projectId) return null;

  const canRecord = serverRunning;
  const canSave = !recording && recordedSteps.length > 0;
  const recordTooltip = serverRunning ? '' : 'Start the dev server first';

  const onStartRecording = () => {
    clearSteps();
    setRecordingActive(true);
  };

  const onStopRecording = () => {
    setRecordingActive(false);
    if (recordedSteps.length > 0) {
      setSaveDialogOpen(true);
    }
  };

  return (
    <PageContent className="flex h-full flex-col overflow-hidden p-1">
      <Stack className="h-full overflow-hidden rounded-md border border-border" gap="none">
      {/* Toolbar */}
      <Flex align="center" className="shrink-0 border-b border-border px-3 py-1.5" gap="sm" wrap="nowrap">
        {configs.length > 0 && activeConfig ? (
          <Select
            value={activeConfig.id}
            onValueChange={(id) => {
              setSelectedConfigId(id);
              setUrlOverride(undefined);
            }}
          >
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue placeholder="Select config..." />
            </SelectTrigger>
            <SelectContent>
              {configs.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Text size="sm" variant="muted">No configs — add one in Settings</Text>
        )}

        <DevServerButton
          activeInstanceId={activeInstance?.id}
          projectId={projectId}
          serverRunning={serverRunning}
        />

        <Separator className="mx-1 h-4" orientation="vertical" />

        {recording ? (
          <Button size="sm" variant="destructive" onClick={onStopRecording}>
            <Circle className="h-3.5 w-3.5 fill-current" /> Stop
          </Button>
        ) : (
          <div title={recordTooltip || undefined}>
            <Button disabled={!canRecord} size="sm" onClick={onStartRecording}>
              <Circle className="h-3.5 w-3.5 fill-destructive text-destructive" /> Record
            </Button>
          </div>
        )}

        <Input
          className="h-7 max-w-[200px] flex-1 text-xs"
          placeholder="Test name (optional)..."
          readOnly={recording}
          value={scriptName}
          onChange={(e) => setScriptName(e.target.value)}
        />

        <Flex align="center" className="ml-auto" gap="sm" wrap="nowrap">
          <Button
            disabled={!canSave || saveScript.isPending}
            size="sm"
            variant="outline"
            onClick={() => setSaveDialogOpen(true)}
          >
            <Save className="h-3.5 w-3.5" /> Save ({recordedSteps.length})
          </Button>
        </Flex>
      </Flex>

      {/* Main split: steps + browser */}
      <Flex align="stretch" className="flex-1 overflow-hidden" gap="none" wrap="nowrap">
        <Stack className="w-64 shrink-0 overflow-y-auto border-r border-border" gap="none">
          <Flex align="center" className="h-10 shrink-0 border-b border-border px-3" gap="none">
            <Text className="text-xs font-semibold uppercase text-text-muted">
              Steps ({recordedSteps.length})
            </Text>
          </Flex>
          <StepList />
        </Stack>
        <BrowserViewPanel
          height={vh}
          recording={recording}
          serverRunning={serverRunning}
          url={url}
          width={vw}
          onUrlChange={setUrlOverride}
        />
      </Flex>
      </Stack>
      <SaveRecordingDialog
        defaultName={scriptName}
        open={saveDialogOpen}
        projectId={projectId}
        steps={recordedSteps}
        testDirectory={activeConfig?.testDirectory}
        onOpenChange={setSaveDialogOpen}
      />
    </PageContent>
  );
}
