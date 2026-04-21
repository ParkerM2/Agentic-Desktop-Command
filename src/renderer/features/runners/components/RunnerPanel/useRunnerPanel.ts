import { useEffect, useMemo, useState } from 'react';

import type { ScopeRef } from '@shared/ipc/runners/schemas';

import {
  useRestartRunnerInstance,
  useRunnerInstances,
  useStartRunnerInstance,
  useStopRunnerInstance,
} from '../../api/useRunnerInstances';
import { useRunnerEvents } from '../../api/useRunnerOutput';
import { useRunnerProfiles } from '../../api/useRunnerProfiles';
import { useRunnersStore } from '../../runners-store';

interface UseRunnerPanelProps {
  scope: ScopeRef;
}

export function useRunnerPanel({ scope }: UseRunnerPanelProps) {
  useRunnerEvents(scope);
  const { data: profiles = [] } = useRunnerProfiles(scope.projectId);
  const { data: instances = [] } = useRunnerInstances(scope);
  const start = useStartRunnerInstance(scope);
  const stop = useStopRunnerInstance(scope);
  const restart = useRestartRunnerInstance(scope);

  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(profiles[0]?.id);
  const [editing, setEditing] = useState<{ open: boolean; id?: string }>({ open: false });

  const pruneExcept = useRunnersStore((s) => s.pruneExcept);
  useEffect(() => {
    pruneExcept(instances.map((i) => i.id));
  }, [instances, pruneExcept]);

  const activeInstance = useMemo(
    () =>
      instances.find(
        (i) =>
          i.profileId === selectedProfileId &&
          (i.status === 'running' || i.status === 'ready' || i.status === 'starting'),
      ),
    [instances, selectedProfileId],
  );

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const scopeLabel = scope.kind === 'worktree' ? 'worktree' : 'project';

  let startDisabledReason: string | undefined;
  if (!selectedProfileId) {
    startDisabledReason = profiles.length === 0
      ? 'Create a runner profile first'
      : 'Select a profile to start';
  }

  let consoleHint: string;
  if (profiles.length === 0) {
    consoleHint = 'No runner profiles yet — click New to create one.';
  } else if (selectedProfileId) {
    consoleHint = 'Click Start to launch this runner.';
  } else {
    consoleHint = 'Select a profile to begin.';
  }

  return {
    profiles,
    activeInstance,
    selectedProfile,
    selectedProfileId,
    editing,
    scopeLabel,
    startDisabledReason,
    consoleHint,
    start,
    stop,
    restart,
    setSelectedProfileId,
    setEditing,
  };
}
