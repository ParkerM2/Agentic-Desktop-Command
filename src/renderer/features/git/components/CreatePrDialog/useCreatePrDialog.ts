import { useState } from 'react';

import { useCreatePr } from '../../api/useGit';

export function useCreatePrDialog() {
  const createPr = useCreatePr();

  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prBaseBranch, setPrBaseBranch] = useState('main');
  const [prError, setPrError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPrTitle('');
      setPrBody('');
      setPrBaseBranch('main');
      setPrError(null);
    }
  }

  function handleCreatePr(repoPath: string, headBranch: string) {
    if (prTitle.trim().length === 0) return;
    setPrError(null);
    createPr.mutate(
      {
        projectPath: repoPath,
        title: prTitle.trim(),
        body: prBody.trim(),
        baseBranch: prBaseBranch.trim() || 'main',
        headBranch,
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
        onError: (err) => {
          setPrError(err instanceof Error ? err.message : 'Failed to create PR');
        },
      },
    );
  }

  return {
    prTitle,
    setPrTitle,
    prBody,
    setPrBody,
    prBaseBranch,
    setPrBaseBranch,
    prError,
    open,
    isPending: createPr.isPending,
    handleOpenChange,
    handleCreatePr,
  };
}
