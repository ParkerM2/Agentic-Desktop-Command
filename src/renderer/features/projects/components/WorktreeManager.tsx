/**
 * WorktreeManager — Lists and manages git worktrees for a project
 */

import { useState } from 'react';

import { FolderGit2, GitBranch, GitMerge, Plus, Trash2 } from 'lucide-react';

import { Button, Input, Spinner } from '@ui';

import { MergeConfirmModal } from '@features/merge';

import { useGitBranches, useWorktrees, useCreateWorktree, useRemoveWorktree } from '../api/useGit';

interface WorktreeManagerProps {
  projectId: string;
  repoPath: string;
}

export function WorktreeManager({ projectId, repoPath }: WorktreeManagerProps) {
  const { data: worktrees, isLoading } = useWorktrees(projectId);
  const { data: branches } = useGitBranches(repoPath);
  const createWorktree = useCreateWorktree();
  const removeWorktree = useRemoveWorktree();

  const [branch, setBranch] = useState('');
  const [worktreePath, setWorktreePath] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedWorktreeBranch, setSelectedWorktreeBranch] = useState<string | null>(null);

  // Determine the main branch (main or master)
  const mainBranch =
    branches?.find((b) => b.name === 'main' || b.name === 'master')?.name ?? 'main';

  function handleOpenMerge(wtBranch: string) {
    setSelectedWorktreeBranch(wtBranch);
    setMergeModalOpen(true);
  }

  function handleCloseMerge() {
    setMergeModalOpen(false);
    setSelectedWorktreeBranch(null);
  }

  async function handleCreate() {
    if (!branch || !worktreePath) return;
    await createWorktree.mutateAsync({ repoPath, worktreePath, branch });
    setBranch('');
    setWorktreePath('');
    setShowForm(false);
  }

  function handleRemove(wtPath: string) {
    removeWorktree.mutate({ repoPath, worktreePath: wtPath });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="text-muted-foreground" size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <FolderGit2 className="h-4 w-4" />
          Worktrees
        </h3>
        <Button
          className="text-muted-foreground hover:text-foreground gap-1 text-xs"
          size="sm"
          variant="ghost"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-3 w-3" />
          New
        </Button>
      </div>

      {showForm ? (
        <div className="border-border space-y-2 rounded-md border p-3">
          <Input
            className="text-sm"
            placeholder="Branch name"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />
          <Input
            className="text-sm"
            placeholder="Worktree path"
            value={worktreePath}
            onChange={(e) => setWorktreePath(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              disabled={!branch || !worktreePath || createWorktree.isPending}
              size="sm"
              onClick={handleCreate}
            >
              {createWorktree.isPending ? 'Creating...' : 'Create'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {worktrees && worktrees.length > 0 ? (
        <div className="space-y-1">
          {worktrees.map((wt) => (
            <div
              key={wt.id}
              className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <GitBranch className="text-muted-foreground h-3.5 w-3.5" />
                <span className="font-medium">{wt.branch}</span>
                <span className="text-muted-foreground text-xs">{wt.path}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  className="text-muted-foreground hover:text-primary h-7 w-7"
                  size="icon"
                  title={`Merge ${wt.branch} into ${mainBranch}`}
                  variant="ghost"
                  onClick={() => handleOpenMerge(wt.branch)}
                >
                  <GitMerge className="h-3.5 w-3.5" />
                </Button>
                <Button
                  className="text-muted-foreground hover:text-destructive h-7 w-7"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemove(wt.path)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">No worktrees created yet.</p>
      )}

      {/* Merge modal */}
      {selectedWorktreeBranch === null ? null : (
        <MergeConfirmModal
          isOpen={mergeModalOpen}
          repoPath={repoPath}
          sourceBranch={selectedWorktreeBranch}
          targetBranch={mainBranch}
          onClose={handleCloseMerge}
        />
      )}
    </div>
  );
}
