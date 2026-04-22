import { useState } from 'react';

import { useCreateWorktree, useListWorktrees, useRemoveWorktree } from '../../api/useGit';

export function useWorktreeList(repoPath: string, projectId: string) {
  const { data: worktrees, isLoading } = useListWorktrees(projectId);
  const createWorktree = useCreateWorktree();
  const removeWorktree = useRemoveWorktree();

  const [addOpen, setAddOpen] = useState(false);
  const [worktreePath, setWorktreePath] = useState('');
  const [branch, setBranch] = useState('');

  async function handleCreate() {
    if (!worktreePath || !branch) return;
    await createWorktree.mutateAsync({ repoPath, worktreePath, branch });
    setWorktreePath('');
    setBranch('');
    setAddOpen(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void handleCreate();
    }
  }

  function handleRemove(path: string) {
    removeWorktree.mutate({ repoPath, worktreePath: path });
  }

  return {
    worktrees,
    isLoading,
    isCreating: createWorktree.isPending,
    addOpen,
    setAddOpen,
    worktreePath,
    setWorktreePath,
    branch,
    setBranch,
    handleCreate,
    handleInputKeyDown,
    handleRemove,
  };
}
