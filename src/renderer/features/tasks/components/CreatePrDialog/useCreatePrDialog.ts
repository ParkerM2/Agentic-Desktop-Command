import { useCallback, useEffect, useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import { GIT } from '@shared/ipc/git/channels';

import { ipc } from '@renderer/shared/lib/ipc';

interface UseCreatePrDialogProps {
  open: boolean;
  projectPath: string;
  taskDescription: string;
  taskName: string;
  onOpenChange: (open: boolean) => void;
}

export interface PrResult {
  number: number;
  title: string;
  url: string;
}

export function useCreatePrDialog({
  open,
  projectPath,
  taskDescription,
  taskName,
  onOpenChange,
}: UseCreatePrDialogProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [headBranch, setHeadBranch] = useState('');
  const [createdPr, setCreatedPr] = useState<PrResult | null>(null);

  const createPr = useMutation({
    mutationFn: (input: {
      baseBranch: string;
      body: string;
      headBranch: string;
      projectPath: string;
      title: string;
    }) => ipc(GIT.CREATE.PR, input),
    onSuccess: (data) => {
      setCreatedPr({ url: data.url, number: data.number, title: data.title });
    },
  });

  const resetForm = useCallback(() => {
    setTitle(taskName);
    setBody(taskDescription);
    setBaseBranch('main');
    setHeadBranch('');
    setCreatedPr(null);
    createPr.reset();
  }, [taskName, taskDescription, createPr]);

  // Auto-detect current branch when dialog opens
  useEffect(() => {
    if (!open) return;
    resetForm();

    if (projectPath.length === 0) return;

    void ipc(GIT.GET.STATUS, { repoPath: projectPath }).then((status) => {
      setHeadBranch(status.branch);
      return status;
    });
  }, [open, projectPath, resetForm]);

  const isFormValid =
    title.trim().length > 0 &&
    baseBranch.trim().length > 0 &&
    headBranch.trim().length > 0 &&
    projectPath.length > 0;

  const hasError = createPr.isError;
  const isSuccess = createdPr !== null;

  function handleSubmit() {
    if (!isFormValid || createPr.isPending) return;

    createPr.mutate({
      projectPath,
      title: title.trim(),
      body: body.trim(),
      baseBranch: baseBranch.trim(),
      headBranch: headBranch.trim(),
    });
  }

  function handleClose() {
    onOpenChange(false);
  }

  function handleOpenPr() {
    if (createdPr !== null) {
      void window.open(createdPr.url, '_blank');
    }
  }

  return {
    title,
    setTitle,
    body,
    setBody,
    baseBranch,
    setBaseBranch,
    headBranch,
    setHeadBranch,
    createdPr,
    createPr,
    isFormValid,
    hasError,
    isSuccess,
    handleSubmit,
    handleClose,
    handleOpenPr,
  };
}
