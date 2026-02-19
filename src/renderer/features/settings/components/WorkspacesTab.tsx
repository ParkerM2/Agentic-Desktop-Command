/**
 * WorkspacesTab — Main panel for managing workspaces in settings
 */

import { useState } from 'react';

import { Plus, Server } from 'lucide-react';

import type { Workspace } from '@shared/types';

import { Button, Spinner } from '@ui';

import { useDevices } from '@features/devices';
import { useWorkspaces } from '@features/workspaces';

import { WorkspaceCard } from './WorkspaceCard';
import { WorkspaceEditor } from './WorkspaceEditor';

export function WorkspacesTab() {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="text-muted-foreground" size="sm" />
      </div>
    );
  }

  const workspaceList = workspaces ?? [];
  const deviceList = devices ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Workspaces
        </h2>
        <Button size="sm" variant="primary" onClick={handleAddWorkspace}>
          <Plus className="h-3.5 w-3.5" />
          Add Workspace
        </Button>
      </div>

      {workspaceList.length > 0 ? (
        <div className="space-y-3">
          {workspaceList.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              devices={deviceList}
              workspace={workspace}
              onEdit={handleEditWorkspace}
            />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-10">
          <Server className="mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No workspaces yet</p>
          <p className="text-xs opacity-60">Create a workspace to organize your projects</p>
        </div>
      )}

      {editorOpen ? (
        <WorkspaceEditor workspace={editingWorkspace} onClose={handleCloseEditor} />
      ) : null}
    </div>
  );
}
