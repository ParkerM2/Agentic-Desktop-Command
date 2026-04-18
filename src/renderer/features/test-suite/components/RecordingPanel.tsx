import { useMemo, useState } from 'react';

import { Circle, Play, Save, Square } from 'lucide-react';

import type { ScopeRef } from '@shared/ipc/runners/schemas';
import type { TestSuiteConfig } from '@shared/ipc/test-suite';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  Button,
  Input,
  PageContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

  const vw = activeConfig ? activeConfig.viewportWidth : 1280;
  const vh = activeConfig ? activeConfig.viewportHeight : 720;

  // URL state — initialized from active config, editable via address bar
  const [urlOverride, setUrlOverride] = useState<string>();
  const url = urlOverride ?? activeConfig?.targetUrl ?? '';

  if (!projectId) return null;

  const hasName = scriptName.trim().length > 0;
  const canRecord = hasName && serverRunning;
  const canSave = !recording && recordedSteps.length > 0;
  let recordTooltip = '';
  if (!hasName) recordTooltip = 'Enter a test name to start recording';
  else if (!serverRunning) recordTooltip = 'Start the dev server first';

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
      <div className="flex h-full flex-col overflow-hidden rounded-md border border-border">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
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

        <div className="mx-1 h-4 w-px bg-border" />

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
          placeholder="Test name (required)..."
          readOnly={recording}
          value={scriptName}
          onChange={(e) => setScriptName(e.target.value)}
        />

        <div className="ml-auto flex items-center gap-2">
          <Button
            disabled={!canSave || saveScript.isPending}
            size="sm"
            variant="outline"
            onClick={() => setSaveDialogOpen(true)}
          >
            <Save className="h-3.5 w-3.5" /> Save ({recordedSteps.length})
          </Button>
        </div>
      </div>

      {/* Main split: steps + browser */}
      <div className="flex flex-1 overflow-hidden">
        <Stack className="w-64 shrink-0 overflow-y-auto border-r border-border" gap="none">
          <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
            <Text className="text-xs font-semibold uppercase text-text-muted">
              Steps ({recordedSteps.length})
            </Text>
          </div>
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
      </div>
      </div>
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
