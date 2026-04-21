/**
 * useWorkspacesTab — logic hook for WorkspacesTab
 */

import { useState } from 'react';

import type { Workspace } from '@shared/types';

import { useWorkspaces } from '@features/workspace';

import { useDevices } from '../../api/useDevices';

export function useWorkspacesTab() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { data: devices } = useDevices();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  function handleAddWorkspace() {
    setEditingWorkspace(null);
    setEditorOpen(true);
  }

  function handleEditWorkspace(workspace: Workspace) {
    setEditingWorkspace(workspace);
    setEditorOpen(true);
  }

  function handleCloseEditor() {
    setEditorOpen(false);
    setEditingWorkspace(null);
  }

  return {
    workspaces,
    isLoading,
    devices,
    editorOpen,
    editingWorkspace,
    handleAddWorkspace,
    handleEditWorkspace,
    handleCloseEditor,
  };
}
