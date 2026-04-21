import { useState } from 'react';

import { useGitBranches, useGitStatus, useCreateBranch } from '../../api/useGit';

interface UseBranchSelectorProps {
  repoPath: string;
}

export function useBranchSelector({ repoPath }: UseBranchSelectorProps) {
  const { data: status, isLoading: statusLoading } = useGitStatus(repoPath);
  const { data: branches, isLoading: branchesLoading } = useGitBranches(repoPath);
  const createBranch = useCreateBranch();

  const [isOpen, setIsOpen] = useState(false);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const isLoading = statusLoading || branchesLoading;

  async function handleCreateBranch() {
    if (!newBranchName) return;
    await createBranch.mutateAsync({ repoPath, branchName: newBranchName });
    setNewBranchName('');
    setShowNewBranch(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      void handleCreateBranch();
    }
  }

  return {
    status,
    branches,
    isLoading,
    isOpen,
    showNewBranch,
    newBranchName,
    createBranch,
    setIsOpen,
    setShowNewBranch,
    setNewBranchName,
    handleCreateBranch,
    handleKeyDown,
  };
}
