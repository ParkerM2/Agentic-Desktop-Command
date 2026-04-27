import { useEffect, useState } from 'react';

import { useCommitHistory as useCommitHistoryQuery } from '../../api/useGit';

export function useCommitHistory(repoPath: string) {
  const [limit, setLimit] = useState(50);

  // Reset pagination when switching projects
  useEffect(() => {
    setLimit(50);
  }, [repoPath]);

  const { data: commits, isLoading } = useCommitHistoryQuery({ repoPath, limit });

  const hasCommits = (commits?.length ?? 0) > 0;

  function handleLoadMore() {
    setLimit((prev) => prev + 50);
  }

  return {
    commits,
    isLoading,
    hasCommits,
    handleLoadMore,
  };
}
