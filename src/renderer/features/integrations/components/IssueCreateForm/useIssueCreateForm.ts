/**
 * useIssueCreateForm — Logic hook for IssueCreateForm
 */

import { useCallback, useEffect, useState } from 'react';

import { useCreateIssue } from '../../api/useGitHub';
import { useGitHubStore } from '../../store';

export function useIssueCreateForm() {
  const {
    githubIssueCreateDialogOpen: issueCreateDialogOpen,
    githubOwner: owner,
    githubRepo: repo,
    setIssueCreateDialogOpen,
  } = useGitHubStore();
  const createIssue = useCreateIssue();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labelsInput, setLabelsInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setBody('');
    setLabelsInput('');
    setError(null);
  }, []);

  useEffect(() => {
    resetForm();
  }, [issueCreateDialogOpen, resetForm]);

  function handleClose(): void {
    setIssueCreateDialogOpen(false);
  }

  function handleSubmit(): void {
    if (title.trim().length === 0) {
      setError('Title is required');
      return;
    }

    if (owner.length === 0 || repo.length === 0) {
      setError('Repository owner and name must be configured');
      return;
    }

    setError(null);

    const labels = labelsInput
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    createIssue.mutate(
      {
        title: title.trim(),
        body: body.trim().length > 0 ? body.trim() : undefined,
        labels: labels.length > 0 ? labels : undefined,
      },
      {
        onSuccess: () => {
          handleClose();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Failed to create issue');
        },
      },
    );
  }

  const isFormValid = title.trim().length > 0;

  return {
    issueCreateDialogOpen,
    setIssueCreateDialogOpen,
    owner,
    repo,
    createIssue,
    title,
    setTitle,
    body,
    setBody,
    labelsInput,
    setLabelsInput,
    error,
    isFormValid,
    handleClose,
    handleSubmit,
  };
}
