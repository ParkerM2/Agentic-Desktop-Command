import { useMemo, useState } from 'react';

import { Circle, Play, Save, Square } from 'lucide-react';

import type { ScopeRef } from '@shared/ipc/runners/schemas';

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
  useRunnerInstances,
  useRunnerProfiles,
  useStartRunnerInstance,
  useStopRunnerInstance,
} from '@features/runners';

import { useSaveScript } from '../api/useSaveScript';
import { useStartRecording } from '../api/useStartRecording';
import { useStopRecording } from '../api/useStopRecording';
import { useTestSuiteConfig } from '../api/useTestSuiteConfig';
import { useTestSuiteStore } from '../test-suite-store';

import { BrowserViewPanel } from './BrowserViewPanel';
import { StepList } from './StepList';

function DevServerToolbar({ projectId }: { projectId: string }) {
  const scope: ScopeRef = useMemo(() => ({ kind: 'project' as const, projectId }), [projectId]);
  const { data: profiles = [] } = useRunnerProfiles(projectId);
  const { data: instances = [] } = useRunnerInstances(scope);
  const startRunner = useStartRunnerInstance(scope);
  const stopRunner = useStopRunnerInstance(scope);
  const [selectedId, setSelectedId] = useState<string>();

  const effectiveId = selectedId ?? profiles[0]?.id;
  const activeInstance = instances.find(
    (i) =>
      i.profileId === effectiveId &&
      (i.status === 'running' || i.status === 'ready' || i.status === 'starting'),
  );
  const isRunning = Boolean(activeInstance);

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-text-muted/30'}`} />
      {profiles.length > 0 ? (
        <Select value={effectiveId || ''} onValueChange={setSelectedId}>
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="Select profile..." />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-xs text-text-muted">No profiles — add one in settings</span>
      )}
      {isRunning && activeInstance ? (
        <Button className="h-7" size="sm" variant="destructive" onClick={() => stopRunner.mutate(activeInstance.id)}>
          <Square className="h-3 w-3" /> Stop Server
        </Button>
      ) : (
        <Button
          className="h-7"
          disabled={!effectiveId || startRunner.isPending}
          size="sm"
          onClick={() => { if (effectiveId) startRunner.mutate(effectiveId); }}
        >
          <Play className="h-3 w-3" /> Start Server
        </Button>
      )}
    </div>
  );
}

export function RecordingPanel() {
  const { projectId } = useLooseParams();
  const { data: config } = useTestSuiteConfig(projectId ?? '');
  const [url, setUrl] = useState(config?.targetUrl ?? '');
  const [scriptName, setScriptName] = useState('');
  const recording = useTestSuiteStore((s) => s.recordingActive);
  const setRecordingActive = useTestSuiteStore((s) => s.setRecordingActive);
  const recordedSteps = useTestSuiteStore((s) => s.recordedSteps);
  const clearSteps = useTestSuiteStore((s) => s.clearSteps);
  const startRec = useStartRecording();
  const stopRec = useStopRecording();
  const saveScript = useSaveScript(projectId ?? '');

  if (!projectId || !config) return null;

  const onStartRecording = () => {
    clearSteps();
    startRec.mutate(
      { url, width: config.viewportWidth, height: config.viewportHeight },
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
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-1.5">
        <DevServerToolbar projectId={projectId} />

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
          <div className="flex items-center border-b border-border px-3 py-1.5">
            <Text className="text-xs font-semibold uppercase text-text-muted">
              Steps ({recordedSteps.length})
            </Text>
          </div>
          <StepList />
        </Stack>
        <BrowserViewPanel
          height={config.viewportHeight}
          url={url}
          width={config.viewportWidth}
          onUrlChange={setUrl}
        />
      </div>
    </PageContent>
  );
}
