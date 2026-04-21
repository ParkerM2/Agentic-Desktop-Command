import { useState } from 'react';

import { useCreateBranch, useGitBranches } from '../../api/useGit';

export function useBranchList(repoPath: string) {
  const { data: branches, isLoading } = useGitBranches(repoPath);
  const createBranch = useCreateBranch();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [baseBranch, setBaseBranch] = useState('');

  async function handleCreate() {
    if (!branchName) return;
    await createBranch.mutateAsync({
      repoPath,
      branchName,
      baseBranch: baseBranch || undefined,
    });
    setBranchName('');
    setBaseBranch('');
    setDialogOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void handleCreate();
    }
  }

  return {
    branches,
    isLoading,
    isCreating: createBranch.isPending,
    dialogOpen,
    setDialogOpen,
    branchName,
    setBranchName,
    baseBranch,
    setBaseBranch,
    handleCreate,
    handleKeyDown,
  };
}
