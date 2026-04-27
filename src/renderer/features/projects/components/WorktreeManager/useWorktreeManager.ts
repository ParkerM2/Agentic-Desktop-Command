import { useState } from 'react';

import { useGitBranches, useWorktrees, useCreateWorktree, useRemoveWorktree } from '../../api/useGit';

interface UseWorktreeManagerProps {
  projectId: string;
  repoPath: string;
}

export function useWorktreeManager({ projectId, repoPath }: UseWorktreeManagerProps) {
  const { data: worktrees, isLoading } = useWorktrees(projectId);
  const { data: branches } = useGitBranches(repoPath);
  const createWorktree = useCreateWorktree();
  const removeWorktree = useRemoveWorktree();

  const [branch, setBranch] = useState('');
  const [worktreePath, setWorktreePath] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [selectedWorktreeBranch, setSelectedWorktreeBranch] = useState<string | null>(null);

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

  return {
    worktrees,
    isLoading,
    branch,
    worktreePath,
    showForm,
    mergeModalOpen,
    selectedWorktreeBranch,
    mainBranch,
    createWorktree,
    repoPath,
    setBranch,
    setWorktreePath,
    setShowForm,
    handleOpenMerge,
    handleCloseMerge,
    handleCreate,
    handleRemove,
  };
}
