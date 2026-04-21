import { useMemo, useState } from 'react';

import type { ScopeRef } from '@shared/ipc/runners/schemas';
import type { TestSuiteConfig } from '@shared/ipc/test-suite';

import { useLooseParams } from '@renderer/shared/hooks';

import {
  newRunnerProfile,
  useRunnerInstances,
  useRunnerProfiles,
  useSaveRunnerProfile,
  useStartRunnerInstance,
  useStopRunnerInstance,
} from '@features/runners';

import { useSaveScript } from '../../api/useSaveScript';
import { useTestSuiteConfigs } from '../../api/useTestSuiteConfigs';
import { DEFAULT_VIEWPORT_HEIGHT, DEFAULT_VIEWPORT_WIDTH } from '../../lib/constants';
import { useTestSuiteStore } from '../../test-suite-store';

export function useRecordingPanel() {
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

  const onConfigChange = (id: string) => {
    setSelectedConfigId(id);
    setUrlOverride(undefined);
  };

  return {
    projectId,
    configs,
    activeConfig,
    selectedConfigId,
    scriptName,
    setScriptName,
    saveDialogOpen,
    setSaveDialogOpen,
    recording,
    recordedSteps,
    saveScriptPending: saveScript.isPending,
    serverRunning,
    activeInstance,
    vw,
    vh,
    url,
    setUrlOverride,
    canRecord,
    canSave,
    recordTooltip,
    onStartRecording,
    onStopRecording,
    onConfigChange,
  };
}

interface UseDevServerButtonProps {
  projectId: string;
  serverRunning: boolean;
  activeInstanceId: string | undefined;
}

export function useDevServerButton({ projectId, serverRunning, activeInstanceId }: UseDevServerButtonProps) {
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

  const handleStop = () => {
    if (activeInstanceId) {
      stopRunner.mutate(activeInstanceId);
    }
  };

  return {
    serverRunning,
    activeInstanceId,
    startPending: startRunner.isPending || saveProfile.isPending,
    handleStart,
    handleStop,
  };
}
