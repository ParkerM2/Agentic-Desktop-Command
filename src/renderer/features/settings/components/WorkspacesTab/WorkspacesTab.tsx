/**
 * WorkspacesTab — Main panel for managing workspaces in settings
 */

import { Plus, Server } from 'lucide-react';

import { Button, Heading, Spinner } from '@ui';

import { WorkspaceCard } from '../WorkspaceCard';
import { WorkspaceEditor } from '../WorkspaceEditor';

import { useWorkspacesTab } from './useWorkspacesTab';

export function WorkspacesTab() {
  const {
    workspaces,
    isLoading,
    devices,
    editorOpen,
    editingWorkspace,
    handleAddWorkspace,
    handleEditWorkspace,
    handleCloseEditor,
  } = useWorkspacesTab();

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
        <Heading as="h2" className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Workspaces
        </Heading>
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
