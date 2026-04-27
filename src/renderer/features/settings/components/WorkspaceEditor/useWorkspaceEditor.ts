/**
 * useWorkspaceEditor — logic hook for WorkspaceEditor
 */

import { useState } from 'react';

import type { Workspace } from '@shared/types';

import { useCreateWorkspace, useUpdateWorkspace } from '@features/workspace';

export function useWorkspaceEditor(workspace: Workspace | null, onClose: () => void) {
  const isEditing = workspace !== null;

  const [name, setName] = useState(workspace?.name ?? '');
  const [description, setDescription] = useState(workspace?.description ?? '');
  const [hostDeviceId, setHostDeviceId] = useState(workspace?.hostDeviceId);
  const [autoStart, setAutoStart] = useState(workspace?.settings.autoStart ?? false);
  const [maxConcurrent, setMaxConcurrent] = useState(workspace?.settings.maxConcurrent ?? 2);
  const [defaultBranch, setDefaultBranch] = useState(workspace?.settings.defaultBranch ?? 'main');

  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();

  function handleSave() {
    if (name.trim().length === 0) return;

    if (isEditing) {
      updateWorkspace.mutate(
        {
          id: workspace.id,
          name: name.trim(),
          description: description.trim() || undefined,
          hostDeviceId,
          settings: { autoStart, maxConcurrent, defaultBranch },
        },
        { onSuccess: onClose },
      );
    } else {
      createWorkspace.mutate(
        { name: name.trim(), description: description.trim() || undefined },
        { onSuccess: onClose },
      );
    }
  }

  const isSaving = createWorkspace.isPending || updateWorkspace.isPending;

  return {
    isEditing,
    name,
    setName,
    description,
    setDescription,
    hostDeviceId,
    setHostDeviceId,
    autoStart,
    setAutoStart,
    maxConcurrent,
    setMaxConcurrent,
    defaultBranch,
    setDefaultBranch,
    isSaving,
    handleSave,
  };
}
