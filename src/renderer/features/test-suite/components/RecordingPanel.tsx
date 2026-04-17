import { useEffect, useMemo, useState } from 'react';

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
import { useStartRecording } from '../api/useStartRecording';
import { useStopRecording } from '../api/useStopRecording';
import { useTestSuiteConfigs } from '../api/useTestSuiteConfigs';
import { useTestSuiteStore } from '../test-suite-store';

import { BrowserViewPanel } from './BrowserViewPanel';
import { StepList } from './StepList';

function DevServerButton({ projectId }: { projectId: string }) {
  const scope: ScopeRef = useMemo(() => ({ kind: 'project' as const, projectId }), [projectId]);
  const { data: profiles = [] } = useRunnerProfiles(projectId);
  const { data: instances = [] } = useRunnerInstances(scope);
  const startRunner = useStartRunnerInstance(scope);
  const stopRunner = useStopRunnerInstance(scope);
  const saveProfile = useSaveRunnerProfile(projectId);

  const activeInstance = instances.find(
    (i) => i.status === 'running' || i.status === 'ready' || i.status === 'starting',
  );
  const isRunning = Boolean(activeInstance);

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
      <span className={`h-2 w-2 shrink-0 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-text-muted/30'}`} />
      {isRunning && activeInstance ? (
        <Button className="h-7" size="sm" variant="destructive" onClick={() => stopRunner.mutate(activeInstance.id)}>
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
  const [url, setUrl] = useState('');
  const [scriptName, setScriptName] = useState('');
  const recording = useTestSuiteStore((s) => s.recordingActive);
  const setRecordingActive = useTestSuiteStore((s) => s.setRecordingActive);
  const recordedSteps = useTestSuiteStore((s) => s.recordedSteps);
  const clearSteps = useTestSuiteStore((s) => s.clearSteps);
  const startRec = useStartRecording();
  const stopRec = useStopRecording();
  const saveScript = useSaveScript(projectId ?? '');

  const activeConfig = useMemo((): TestSuiteConfig | null => {
    if (configs.length === 0) return null;
    return configs.find((c) => c.id === selectedConfigId)
      ?? configs.find((c) => c.isActive)
      ?? configs[0];
  }, [configs, selectedConfigId]);

  useEffect(() => {
    if (activeConfig) {
      setUrl(activeConfig.targetUrl);
    }
  }, [activeConfig]);  

  if (!projectId) return null;

  const vw = activeConfig ? activeConfig.viewportWidth : 1280;
  const vh = activeConfig ? activeConfig.viewportHeight : 720;

  const onStartRecording = () => {
    clearSteps();
    startRec.mutate(
      { url, width: vw, height: vh },
      {
        onSuccess: () => setRecordingActive(true),
        onError: () => setRecordingActive(false),
      },
    );
  };

  const onStopRecording = () => {
    stopRec.mutate(undefined, {
      onSuccess: () => setRecordingActive(false),
      onError: () => setRecordingActive(false),
    });
  };

  const onSave = () => {
    if (recordedSteps.length === 0) return;
    const name = scriptName.trim() || `Recording ${new Date().toLocaleString()}`;
    saveScript.mutate(
      { projectId, name, steps: recordedSteps.map((r) => r.step) },
      {
        onSuccess: () => {
          clearSteps();
          setScriptName('');
        },
      },
    );
  };

  return (
    <PageContent className="flex h-full flex-col overflow-hidden p-0">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
        {configs.length > 0 && activeConfig ? (
          <Select value={activeConfig.id} onValueChange={setSelectedConfigId}>
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
          <span className="text-xs text-text-muted">No configs — add one in Settings</span>
        )}

        <DevServerButton projectId={projectId} />

        <div className="mx-1 h-4 w-px bg-border" />

        {recording ? (
          <Button size="sm" variant="destructive" onClick={onStopRecording}>
            <Circle className="h-3.5 w-3.5 fill-current" /> Stop
          </Button>
        ) : (
          <Button disabled={startRec.isPending} size="sm" onClick={onStartRecording}>
            <Circle className="h-3.5 w-3.5 fill-destructive text-destructive" /> Record
          </Button>
        )}

        <Input
          className="h-7 max-w-[200px] flex-1 text-xs"
          placeholder="Test name..."
          value={scriptName}
          onChange={(e) => setScriptName(e.target.value)}
        />

        <div className="ml-auto flex items-center gap-2">
          <Button
            disabled={recordedSteps.length === 0 || saveScript.isPending}
            size="sm"
            variant="outline"
            onClick={onSave}
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
          url={url}
          width={vw}
          onUrlChange={setUrl}
        />
      </div>
    </PageContent>
  );
}
