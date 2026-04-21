/**
 * useWorkspacesTab — logic hook for WorkspacesTab
 */

import type { Workspace } from '@shared/types';

import { useModalWithEditState } from '@renderer/shared/hooks/useModalWithEditState';

import { useWorkspaces } from '@features/workspace';

import { useDevices } from '../../api/useDevices';

export function useWorkspacesTab() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { data: devices } = useDevices();

  const {
    open: editorOpen,
    editing: editingWorkspace,
    handleAdd: handleAddWorkspace,
    handleEdit: handleEditWorkspace,
    handleClose: handleCloseEditor,
  } = useModalWithEditState<Workspace>();

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
