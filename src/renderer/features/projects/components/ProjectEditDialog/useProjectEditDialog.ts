import { useEffect, useState } from 'react';

import type { Project } from '@shared/types';

import { useWorkspaces } from '@features/workspace';

import { useRemoveProject, useUpdateProject } from '../../api/useProjects';

interface UseProjectEditDialogProps {
  project: Project | null;
  onClose: () => void;
}

export function useProjectEditDialog({ project, onClose }: UseProjectEditDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateProject = useUpdateProject();
  const removeProject = useRemoveProject();
  const { data: workspaces } = useWorkspaces();

  useEffect(() => {
    if (project !== null) {
      setName(project.name);
      setDescription(project.description ?? '');
      setDefaultBranch(project.defaultBranch ?? '');
      setGitUrl(project.gitUrl ?? '');
      setWorkspaceId(project.workspaceId ?? '');
      setErrorMessage(null);
    }
  }, [project]);

  const nameIsEmpty = name.trim().length === 0;

  function handleSave() {
    if (project === null || nameIsEmpty) {
      return;
    }

    setErrorMessage(null);

    const updates: Record<string, string> = {};
    if (name.trim() !== project.name) {
      updates.name = name.trim();
    }
    if (description.trim() !== (project.description ?? '')) {
      updates.description = description.trim();
    }
    if (defaultBranch.trim() !== (project.defaultBranch ?? '')) {
      updates.defaultBranch = defaultBranch.trim();
    }
    if (gitUrl.trim() !== (project.gitUrl ?? '')) {
      updates.gitUrl = gitUrl.trim();
    }
    if (workspaceId !== (project.workspaceId ?? '')) {
      updates.workspaceId = workspaceId;
    }

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    updateProject.mutate(
      { projectId: project.id, ...updates },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to update project');
        },
      },
    );
  }

  function handleDeleteConfirm() {
    if (project === null) {
      return;
    }

    removeProject.mutate(project.id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        onClose();
      },
      onError: (error) => {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to delete project',
        );
        setDeleteConfirmOpen(false);
      },
    });
  }

  return {
    name,
    description,
    defaultBranch,
    gitUrl,
    workspaceId,
    deleteConfirmOpen,
    errorMessage,
    nameIsEmpty,
    updateProject,
    removeProject,
    workspaces,
    setName,
    setDescription,
    setDefaultBranch,
    setGitUrl,
    setWorkspaceId,
    setDeleteConfirmOpen,
    handleSave,
    handleDeleteConfirm,
  };
}
