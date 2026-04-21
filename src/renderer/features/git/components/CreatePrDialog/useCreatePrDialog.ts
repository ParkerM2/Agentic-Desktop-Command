import { useCallback, useState } from 'react';

import { useDialogWithMutation } from '@renderer/shared/hooks/useDialogWithMutation';

import { useCreatePr } from '../../api/useGit';

export function useCreatePrDialog() {
  const createPr = useCreatePr();

  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [prBaseBranch, setPrBaseBranch] = useState('main');
  const [prError, setPrError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const resetForm = useCallback(() => {
    setPrTitle('');
    setPrBody('');
    setPrBaseBranch('main');
    setPrError(null);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      resetForm();
    }
  }

  const { handleSubmit: submitMutation, isPending } = useDialogWithMutation(createPr, {
    onClose: () => handleOpenChange(false),
    resetForm,
  });

  function handleCreatePr(repoPath: string, headBranch: string) {
    if (prTitle.trim().length === 0) return;
    setPrError(null);
    submitMutation({
      projectPath: repoPath,
      title: prTitle.trim(),
      body: prBody.trim(),
      baseBranch: prBaseBranch.trim() || 'main',
      headBranch,
    });
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
    isPending,
    handleOpenChange,
    handleCreatePr,
  };
}
