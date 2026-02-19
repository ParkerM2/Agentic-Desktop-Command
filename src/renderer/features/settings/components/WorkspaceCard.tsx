/**
 * WorkspaceCard — Displays a single workspace with edit/delete actions
 */

import { useState } from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import type { Device, Workspace } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';


import { useDeleteWorkspace } from '@features/workspaces';

interface WorkspaceCardProps {
  workspace: Workspace;
  devices: Device[];
  onEdit: (workspace: Workspace) => void;
}

export function WorkspaceCard({ workspace, devices, onEdit }: WorkspaceCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteWorkspace = useDeleteWorkspace();

  const hostDevice = devices.find((d) => d.id === workspace.hostDeviceId);
  const isOnline = hostDevice?.isOnline ?? false;

  function handleDelete() {
    if (confirmDelete) {
      deleteWorkspace.mutate(workspace.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  }

  function handleCancelDelete() {
    setConfirmDelete(false);
  }

  return (
    <div className="border-border bg-card rounded-lg border p-4 transition-colors">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            title={isOnline ? 'Online' : 'Offline'}
            className={cn(
              'inline-block h-2.5 w-2.5 rounded-full',
              isOnline ? 'bg-success' : 'bg-muted-foreground',
            )}
          />
          <h3 className="text-sm font-semibold">{workspace.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Edit workspace"
            className="text-muted-foreground hover:text-foreground"
            size="icon"
            variant="ghost"
            onClick={() => onEdit(workspace)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" onClick={handleDelete}>
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelDelete}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              aria-label="Delete workspace"
              className="text-muted-foreground hover:text-destructive"
              size="icon"
              variant="ghost"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {workspace.description ? (
        <p className="text-muted-foreground mb-2 text-xs">{workspace.description}</p>
      ) : null}

      <div className="text-muted-foreground flex items-center gap-4 text-xs">
        {hostDevice ? (
          <span>Host: {hostDevice.deviceName}</span>
        ) : (
          <span>No host assigned</span>
        )}
      </div>
    </div>
  );
}
