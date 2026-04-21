import { useEffect, useState } from 'react';

import {
  useDiffSummary,
  useDiffViewerUI,
  useFileDiffContent,
} from '@features/diff-viewer';

import { useGitBranches } from '../../api/useGit';

export function useBranchDiffPanel(repoPath: string) {
  const { data: branches = [] } = useGitBranches(repoPath);

  const [sourceBranch, setSourceBranch] = useState<string | null>(null);
  const [targetBranch, setTargetBranch] = useState<string | null>(null);

  // Set sensible defaults once branches load
  useEffect(() => {
    if (branches.length === 0) return;
    setSourceBranch((prev) => {
      if (prev !== null) return prev;
      return branches.find((b) => b.current)?.name ?? branches[0].name;
    });
    setTargetBranch((prev) => {
      if (prev !== null) return prev;
      return (
        branches.find((b) => b.name === 'main' && !b.current)?.name ??
        branches.find((b) => b.name === 'master' && !b.current)?.name ??
        branches.find((b) => !b.current)?.name ??
        null
      );
    });
  }, [branches]);

  const { expandedContext, selectedFile, selectFile, setViewMode, toggleExpandedContext, viewMode } =
    useDiffViewerUI();

  const { data: diffSummary } = useDiffSummary(repoPath, sourceBranch, targetBranch);
  const { data: fileDiff } = useFileDiffContent(repoPath, sourceBranch, targetBranch, selectedFile);

  const files = diffSummary?.files ?? [];
  const selectedFileStats = files.find((f) => f.filePath === selectedFile);

  return {
    branches,
    sourceBranch,
    setSourceBranch,
    targetBranch,
    setTargetBranch,
    expandedContext,
    selectedFile,
    selectFile,
    setViewMode,
    toggleExpandedContext,
    viewMode,
    diffSummary,
    fileDiff,
    files,
    selectedFileStats,
  };
}
