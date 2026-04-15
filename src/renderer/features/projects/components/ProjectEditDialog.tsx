/**
 * ProjectEditDialog — Modal for editing project details (name, description, branch, git URL, workspace).
 * Includes delete functionality via ConfirmDialog.
 */

import { useEffect, useState } from 'react';

import { Loader2, Pencil, Trash2 } from 'lucide-react';

import type { Project } from '@shared/types';

import { ConfirmDialog } from '@renderer/shared/components/ConfirmDialog';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@ui';

import { useWorkspaces } from '@features/workspace';

import { useRemoveProject, useUpdateProject } from '../api/useProjects';

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
    <>
      <Dialog open={project !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Pencil className="text-primary h-5 w-5" />
              Edit Project
            </DialogTitle>
          </DialogHeader>

          {/* Body */}
          <div className="space-y-4 py-2">
            {/* Name */}
            <div>
              <Label htmlFor="edit-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1"
                id="edit-name"
                placeholder="Project name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                className="mt-1 resize-none"
                id="edit-description"
                placeholder="Optional project description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Default Branch */}
            <div>
              <Label htmlFor="edit-default-branch">Default Branch</Label>
              <Input
                className="mt-1"
                id="edit-default-branch"
                placeholder="main"
                type="text"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
              />
            </div>

            {/* Git URL */}
            <div>
              <Label htmlFor="edit-git-url">Git URL</Label>
              <Input
                className="mt-1"
                id="edit-git-url"
                placeholder="https://github.com/user/repo.git"
                type="text"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
              />
            </div>

            {/* Workspace */}
            {(workspaces?.length ?? 0) > 0 ? (
              <div>
                <Label htmlFor="edit-workspace">Workspace</Label>
                <Select value={workspaceId} onValueChange={setWorkspaceId}>
                  <SelectTrigger className="mt-1" id="edit-workspace">
                    <SelectValue placeholder="No workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No workspace</SelectItem>
                    {workspaces?.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {/* Error message */}
          {errorMessage === null ? null : (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-destructive text-sm">{errorMessage}</p>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {/* Delete button (left side) */}
            <Button
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              variant="ghost"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Project
            </Button>

            {/* Cancel + Save (right side) */}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={nameIsEmpty || updateProject.isPending}
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
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      {project === null ? null : (
        <ConfirmDialog
          confirmLabel="Delete"
          description={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
          open={deleteConfirmOpen}
          title="Delete Project"
          variant="destructive"
          onConfirm={handleDeleteConfirm}
          onOpenChange={setDeleteConfirmOpen}
        />
      )}
    </>
  );
}
