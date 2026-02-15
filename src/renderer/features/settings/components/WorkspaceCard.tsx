/**
 * WorkspaceCard — Displays a single workspace with edit/delete actions
 */

import { useState } from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import type { Device, Workspace } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

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
          <button
            aria-label="Edit workspace"
            className="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
            type="button"
            onClick={() => onEdit(workspace)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                className="bg-destructive text-destructive-foreground rounded-md px-2 py-1 text-xs font-medium"
                type="button"
                onClick={handleDelete}
              >
                Confirm
              </button>
              <button
                className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-xs"
                type="button"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              aria-label="Delete workspace"
              className="text-muted-foreground hover:text-destructive rounded-md p-1.5 transition-colors"
              type="button"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
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
