/**
 * WorkspaceEditor — Modal dialog for creating/editing a workspace
 */

import { useState } from 'react';

import { X } from 'lucide-react';

import type { Workspace } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { useCreateWorkspace, useUpdateWorkspace } from '@features/workspaces';

import { DeviceSelector } from './DeviceSelector';

interface WorkspaceEditorProps {
  workspace: Workspace | null;
  onClose: () => void;
}

const INPUT_CLASS = cn(
  'border-border bg-background w-full rounded-lg border px-3 py-2 text-sm',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
);

const SETTINGS_INPUT_CLASS = cn(
  'border-border bg-background w-16 rounded-md border px-2 py-1 text-center text-sm',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
);

export function WorkspaceEditor({ workspace, onClose }: WorkspaceEditorProps) {
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

  return (
    <div
      aria-label={isEditing ? 'Edit workspace' : 'Create workspace'}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
    >
      <div className="bg-card border-border mx-4 w-full max-w-md rounded-xl border p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Workspace' : 'New Workspace'}
          </h2>
          <button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-muted-foreground mb-1 block text-sm font-medium" htmlFor="ws-name">
              Name
            </label>
            <input
              className={INPUT_CLASS}
              id="ws-name"
              placeholder="Workspace name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-muted-foreground mb-1 block text-sm font-medium" htmlFor="ws-desc">
              Description
            </label>
            <textarea
              className={cn(INPUT_CLASS, 'resize-none')}
              id="ws-desc"
              placeholder="Optional description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Device Selector */}
          <div>
            <span className="text-muted-foreground mb-1 block text-sm font-medium">
              Host Device
            </span>
            <DeviceSelector value={hostDeviceId} onChange={setHostDeviceId} />
          </div>

          {/* Settings */}
          <div className="border-border rounded-lg border p-3">
            <h3 className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
              Settings
            </h3>

            {/* Auto-start toggle */}
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm" htmlFor="ws-autostart">
                Auto-start agents
              </label>
              <button
                aria-checked={autoStart}
                id="ws-autostart"
                role="switch"
                type="button"
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors',
                  autoStart ? 'bg-primary' : 'bg-muted',
                )}
                onClick={() => setAutoStart(!autoStart)}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                    autoStart && 'translate-x-4',
                  )}
                />
              </button>
            </div>

            {/* Max concurrent */}
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm" htmlFor="ws-concurrent">
                Max concurrent
              </label>
              <input
                className={SETTINGS_INPUT_CLASS}
                id="ws-concurrent"
                max={10}
                min={1}
                type="number"
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(Number(e.target.value))}
              />
            </div>

            {/* Default branch */}
            <div className="flex items-center justify-between">
              <label className="text-sm" htmlFor="ws-branch">
                Default branch
              </label>
              <input
                className={cn(SETTINGS_INPUT_CLASS, 'w-28 text-left')}
                id="ws-branch"
                placeholder="main"
                type="text"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <button
            className="text-muted-foreground hover:text-foreground rounded-lg px-4 py-2 text-sm transition-colors"
            disabled={isSaving}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            disabled={name.trim().length === 0 || isSaving}
            type="button"
            className={cn(
              'bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'hover:bg-primary/90 disabled:opacity-50',
            )}
            onClick={handleSave}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
