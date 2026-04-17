import { useMemo, useState } from 'react';

import {
  Circle,
  Globe,
  Layers,
  Play,
  Save,
  Square,
  Zap,
} from 'lucide-react';

import type { ScopeRef } from '@shared/ipc/runners/schemas';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  Button,
  Card,
  CardContent,
  Flex,
  Grid,
  Heading,
  Input,
  PageContent,
  Separator,
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
import { useTestSuiteScripts } from '../api/useTestSuiteScripts';
import { buildStarterTest } from '../lib/starter-test';
import { useTestSuiteStore } from '../test-suite-store';

import { BrowserViewPanel } from './BrowserViewPanel';
import { StepList } from './StepList';

function DevServerControl({ projectId }: { projectId: string }) {
  const scope: ScopeRef = useMemo(() => ({ kind: 'project' as const, projectId }), [projectId]);
  const { data: profiles = [] } = useRunnerProfiles(projectId);
  const { data: instances = [] } = useRunnerInstances(scope);
  const startRunner = useStartRunnerInstance(scope);
  const stopRunner = useStopRunnerInstance(scope);

  const activeInstance = instances.find(
    (i) => i.status === 'running' || i.status === 'ready' || i.status === 'starting',
  );
  const isRunning = Boolean(activeInstance);

  if (profiles.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className="h-2 w-2 rounded-full bg-text-muted/30" />
        <span>No dev server profile — configure one in project settings</span>
      </div>
    );
  }

  const profile = profiles[0];

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-text-muted/30'}`} />
      <span className="text-xs text-text-muted">
        {profile.name}: {isRunning ? 'Running' : 'Stopped'}
      </span>
      {isRunning && activeInstance ? (
        <Button className="h-6 px-2 text-xs" size="sm" variant="ghost" onClick={() => stopRunner.mutate(activeInstance.id)}>
          <Square className="h-3 w-3" /> Stop
        </Button>
      ) : (
        <Button
          className="h-6 px-2 text-xs"
          disabled={startRunner.isPending}
          size="sm"
          variant="ghost"
          onClick={() => startRunner.mutate(profile.id)}
        >
          <Play className="h-3 w-3" /> Start
        </Button>
      )}
    </div>
  );
}

function LibraryCardSubtext({ count }: { count: number }) {
  if (count > 0) {
    const label = count === 1 ? '1 test saved' : `${count} tests saved`;
    return <Text className="text-xs text-text-muted">{label}</Text>;
  }
  return <Text className="text-xs text-text-muted">Browse and manage saved tests</Text>;
}

export function RecordingPanel() {
  const { projectId } = useLooseParams();
  const { data: config } = useTestSuiteConfig(projectId ?? '');
  const { data: scripts = [] } = useTestSuiteScripts(projectId);
  const [url, setUrl] = useState(config?.targetUrl ?? '');
  const [scriptName, setScriptName] = useState('');
  const recording = useTestSuiteStore((s) => s.recordingActive);
  const setRecordingActive = useTestSuiteStore((s) => s.setRecordingActive);
  const recordedSteps = useTestSuiteStore((s) => s.recordedSteps);
  const clearSteps = useTestSuiteStore((s) => s.clearSteps);
  const setActiveTab = useTestSuiteStore((s) => s.setActiveTab);
  const start = useStartRecording();
  const stop = useStopRecording();
  const saveScript = useSaveScript(projectId ?? '');

  if (!projectId || !config) return null;

  const onStart = () => {
    clearSteps();
    start.mutate(
      { url, width: config.viewportWidth, height: config.viewportHeight },
      {
        onSuccess: () => setRecordingActive(true),
        onError: () => setRecordingActive(false),
      },
    );
  };

  const onStop = () => {
    stop.mutate(undefined, {
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

  const onCreateStarterTest = async () => {
    await saveScript.mutateAsync(
      buildStarterTest({ projectId, targetUrl: config.targetUrl }),
    );
    setActiveTab('library');
  };

  const isIdle = !recording && recordedSteps.length === 0;

  if (isIdle) {
    return (
      <PageContent className="flex flex-col p-0">
        <Flex align="center" className="flex-1 p-8" justify="center">
          <Stack align="center" className="max-w-lg text-center" gap="lg">
            <Flex
              align="center"
              className="h-16 w-16 rounded-2xl bg-accent/10"
              justify="center"
            >
              <Circle className="h-8 w-8 text-accent" />
            </Flex>

            <Stack align="center" gap="sm">
              <Heading as="h3">Record a Test</Heading>
              <Text className="text-text-muted">
                Click Record to open a browser and capture your interactions as
                Playwright test steps. You can edit, reorder, and save them as
                reusable scripts.
              </Text>
            </Stack>

            <Stack className="w-full max-w-sm" gap="md">
              <div className="flex items-center justify-center">
                <DevServerControl projectId={projectId} />
              </div>
              <Flex align="center" gap="sm">
                <Globe className="h-4 w-4 shrink-0 text-text-muted" />
                <Input
                  className="flex-1"
                  placeholder="Target URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </Flex>
              <Button className="w-full" size="lg" onClick={onStart}>
                <Circle className="h-4 w-4 fill-destructive text-destructive" />
                Start Recording
              </Button>
            </Stack>

            <Flex align="center" className="w-full pt-2" gap="md">
              <Separator className="flex-1" />
              <Text className="text-xs text-text-muted">or</Text>
              <Separator className="flex-1" />
            </Flex>

            <Grid className="w-full max-w-sm" cols={2} gap="md">
              <Card
                className="cursor-pointer transition-colors hover:bg-bg-hover"
                onClick={() => {
                  void onCreateStarterTest();
                }}
              >
                <CardContent className="flex flex-col items-center gap-2 p-4">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <Text className="text-sm font-medium">Starter Test</Text>
                  <Text className="text-xs text-text-muted">
                    Generate a smoke test for {new URL(config.targetUrl).hostname}
                  </Text>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer transition-colors hover:bg-bg-hover"
                onClick={() => setActiveTab('library')}
              >
                <CardContent className="flex flex-col items-center gap-2 p-4">
                  <Layers className="h-5 w-5 text-blue-500" />
                  <Text className="text-sm font-medium">
                    {scripts.length > 0 ? 'View Library' : 'Test Library'}
                  </Text>
                  <LibraryCardSubtext count={scripts.length} />
                </CardContent>
              </Card>
            </Grid>
          </Stack>
        </Flex>
      </PageContent>
    );
  }

  return (
    <PageContent className="flex h-full flex-col overflow-hidden p-0">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2">
        {recording ? (
          <Button size="sm" variant="destructive" onClick={onStop}>
            <Circle className="h-3.5 w-3.5 fill-current" /> Stop Recording
          </Button>
        ) : (
          <Button size="sm" onClick={onStart}>
            <Circle className="h-3.5 w-3.5 fill-destructive text-destructive" /> Resume Recording
          </Button>
        )}
        <Input
          className="h-8 max-w-xs flex-1"
          placeholder="Test name..."
          value={scriptName}
          onChange={(e) => setScriptName(e.target.value)}
        />
        <DevServerControl projectId={projectId} />
        <div className="ml-auto flex items-center gap-2">
          <Button disabled={recordedSteps.length === 0 || saveScript.isPending} size="sm" variant="outline" onClick={onSave}>
            <Save className="h-3.5 w-3.5" /> Save ({recordedSteps.length})
          </Button>
          <Button size="sm" variant="ghost">
            <Play className="h-3.5 w-3.5" /> Run
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Stack className="w-72 shrink-0 border-r border-border overflow-y-auto" gap="none">
          <Text className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-text-muted">
            Steps ({recordedSteps.length})
          </Text>
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
