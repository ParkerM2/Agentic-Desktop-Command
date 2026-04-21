import { useState } from 'react';

import { useGitCommit, useGitPush, useGitStatus } from '../../api/useGit';

export function useCommitPanel(repoPath: string) {
  const { data: status } = useGitStatus(repoPath);
  const gitCommit = useGitCommit();
  const gitPush = useGitPush();

  const [commitMessage, setCommitMessage] = useState('');
  const [commitError, setCommitError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  const staged = status?.staged ?? [];
  const hasStagedFiles = staged.length > 0;
  const hasCommitMessage = commitMessage.trim().length > 0;
  const canCommit = hasStagedFiles && hasCommitMessage;
  const headBranch = status?.branch ?? '';

  function handleCommit() {
    if (!canCommit) return;
    setCommitError(null);
    gitCommit.mutate(
      { projectPath: repoPath, message: commitMessage.trim(), files: staged },
      {
        onSuccess: () => {
          setCommitMessage('');
          setCommitError(null);
        },
        onError: (err) => {
          setCommitError(err instanceof Error ? err.message : 'Commit failed');
        },
      },
    );
  }

  function handlePush() {
    setPushError(null);
    gitPush.mutate(
      { projectPath: repoPath },
      {
        onError: (err) => {
          setPushError(err instanceof Error ? err.message : 'Push failed');
        },
      },
    );
  }

  return {
    staged,
    hasStagedFiles,
    canCommit,
    headBranch,
    commitMessage,
    setCommitMessage,
    commitError,
    pushError,
    isCommitting: gitCommit.isPending,
    isPushing: gitPush.isPending,
    handleCommit,
    handlePush,
  };
}
