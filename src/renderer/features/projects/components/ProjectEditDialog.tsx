/**
 * ProjectEditDialog — Modal for editing project details (name, description, branch, git URL, workspace).
 * Includes delete functionality via ConfirmDialog.
 */

import { useEffect, useState } from 'react';

import { Loader2, Pencil, Trash2, X } from 'lucide-react';

import type { Project } from '@shared/types';

import { ConfirmDialog } from '@renderer/shared/components/ConfirmDialog';
import { cn } from '@renderer/shared/lib/utils';

import { useWorkspaces } from '@features/workspaces';

import { useRemoveProject, useUpdateProject } from '../api/useProjects';

const INPUT_BASE_CLASS =
  'border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm';
const INPUT_FOCUS_CLASS = 'focus:ring-ring focus:border-ring focus:outline-none focus:ring-1';
const INPUT_PLACEHOLDER_CLASS = 'placeholder:text-muted-foreground';

interface ProjectEditDialogProps {
  project: Project | null;
  onClose: () => void;
}

export function ProjectEditDialog({ project, onClose }: ProjectEditDialogProps) {
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

  // Initialize form state when project changes
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

  // Escape key closes the dialog
  useEffect(() => {
    if (project === null) {
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [project, onClose]);

  if (project === null) {
    return null;
  }

  const nameIsEmpty = name.trim().length === 0;

  function handleSave() {
    if (project === null || nameIsEmpty) {
      return;
    }

    setErrorMessage(null);

    // Only send changed fields
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

    // If nothing changed, just close
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClose();
        }}
      />

      {/* Modal */}
      <div className="bg-card border-border relative z-10 w-full max-w-lg rounded-lg border shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Pencil className="text-primary h-5 w-5" />
            <h2 className="text-foreground text-lg font-semibold">Edit Project</h2>
          </div>
          <button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Name */}
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium" htmlFor="edit-name">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="edit-name"
              placeholder="Project name"
              type="text"
              value={name}
              className={cn(
                INPUT_BASE_CLASS,
                INPUT_FOCUS_CLASS,
                INPUT_PLACEHOLDER_CLASS,
              )}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="text-foreground mb-1 block text-sm font-medium"
              htmlFor="edit-description"
            >
              Description
            </label>
            <textarea
              id="edit-description"
              placeholder="Optional project description"
              rows={3}
              value={description}
              className={cn(
                INPUT_BASE_CLASS,
                INPUT_FOCUS_CLASS,
                INPUT_PLACEHOLDER_CLASS,
                'resize-none',
              )}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Default Branch */}
          <div>
            <label
              className="text-foreground mb-1 block text-sm font-medium"
              htmlFor="edit-default-branch"
            >
              Default Branch
            </label>
            <input
              id="edit-default-branch"
              placeholder="main"
              type="text"
              value={defaultBranch}
              className={cn(
                INPUT_BASE_CLASS,
                INPUT_FOCUS_CLASS,
                INPUT_PLACEHOLDER_CLASS,
              )}
              onChange={(e) => setDefaultBranch(e.target.value)}
            />
          </div>

          {/* Git URL */}
          <div>
            <label
              className="text-foreground mb-1 block text-sm font-medium"
              htmlFor="edit-git-url"
            >
              Git URL
            </label>
            <input
              id="edit-git-url"
              placeholder="https://github.com/user/repo.git"
              type="text"
              value={gitUrl}
              className={cn(
                INPUT_BASE_CLASS,
                INPUT_FOCUS_CLASS,
                INPUT_PLACEHOLDER_CLASS,
              )}
              onChange={(e) => setGitUrl(e.target.value)}
            />
          </div>

          {/* Workspace */}
          {(workspaces?.length ?? 0) > 0 ? (
            <div>
              <label
                className="text-foreground mb-1 block text-sm font-medium"
                htmlFor="edit-workspace"
              >
                Workspace
              </label>
              <select
                id="edit-workspace"
                value={workspaceId}
                className={cn(
                  INPUT_BASE_CLASS,
                  INPUT_FOCUS_CLASS,
                )}
                onChange={(e) => setWorkspaceId(e.target.value)}
              >
                <option value="">No workspace</option>
                {workspaces?.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {/* Error message */}
        {errorMessage === null ? null : (
          <div className="mx-6 mb-4 rounded-md bg-destructive/10 p-3">
            <p className="text-destructive text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-border flex items-center justify-between border-t px-6 py-4">
          {/* Delete button (left side) */}
          <button
            className={cn(
              'text-destructive hover:bg-destructive/10 flex items-center gap-2 rounded-md px-3 py-2 text-sm',
              'transition-colors',
            )}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Project
          </button>

          {/* Cancel + Save (right side) */}
          <div className="flex gap-2">
            <button
              className={cn(
                'text-muted-foreground hover:text-foreground rounded-md px-4 py-2 text-sm',
                'transition-colors',
              )}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              disabled={nameIsEmpty || updateProject.isPending}
              className={cn(
                'bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2',
                'text-sm font-medium transition-opacity hover:opacity-90',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
              onClick={handleSave}
            >
              {updateProject.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        confirmLabel="Delete"
        description={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
        open={deleteConfirmOpen}
        title="Delete Project"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        onOpenChange={setDeleteConfirmOpen}
      />
    </div>
  );
}
