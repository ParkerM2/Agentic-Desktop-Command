/**
 * WorkspaceEditor — Modal dialog for creating/editing a workspace
 */

import { X } from 'lucide-react';

import type { Workspace } from '@shared/types';

import { Button, Heading, Input, Label, Switch, Textarea } from '@ui';

import { DeviceSelector } from '../DeviceSelector';

import { useWorkspaceEditor } from './useWorkspaceEditor';

interface WorkspaceEditorProps {
  workspace: Workspace | null;
  onClose: () => void;
}

export function WorkspaceEditor({ workspace, onClose }: WorkspaceEditorProps) {
  const {
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
  } = useWorkspaceEditor(workspace, onClose);

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
          <Heading as="h2" className="text-lg">
            {isEditing ? 'Edit Workspace' : 'New Workspace'}
          </Heading>
          <Button
            aria-label="Close"
            size="icon"
            variant="ghost"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label className="mb-1 block" htmlFor="ws-name">
              Name
            </Label>
            <Input
              id="ws-name"
              placeholder="Workspace name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label className="mb-1 block" htmlFor="ws-desc">
              Description
            </Label>
            <Textarea
              id="ws-desc"
              placeholder="Optional description"
              resize="none"
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
            <Heading as="h3" className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
              Settings
            </Heading>

            {/* Auto-start toggle */}
            <div className="mb-3 flex items-center justify-between">
              <Label htmlFor="ws-autostart">
                Auto-start agents
              </Label>
              <Switch
                checked={autoStart}
                id="ws-autostart"
                onCheckedChange={setAutoStart}
              />
            </div>

            {/* Max concurrent */}
            <div className="mb-3 flex items-center justify-between">
              <Label htmlFor="ws-concurrent">
                Max concurrent
              </Label>
              <Input
                className="w-16 text-center"
                id="ws-concurrent"
                max={10}
                min={1}
                size="sm"
                type="number"
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(Number(e.target.value))}
              />
            </div>

            {/* Default branch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="ws-branch">
                Default branch
              </Label>
              <Input
                className="w-28 text-left"
                id="ws-branch"
                placeholder="main"
                size="sm"
                type="text"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <Button disabled={isSaving} variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={name.trim().length === 0 || isSaving}
            variant="primary"
            onClick={handleSave}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
