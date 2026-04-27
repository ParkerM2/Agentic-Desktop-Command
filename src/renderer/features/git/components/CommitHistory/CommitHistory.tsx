/**
 * CommitHistory — Paginated commit log for a git repository.
 *
 * Shows short hash, commit message, author name, and relative date.
 * Supports "Load more" to incrementally fetch additional commits.
 */

import { GitCommit } from 'lucide-react';

import type { GitCommit as GitCommitType } from '@shared/ipc/git/schemas';

import { RelativeTime } from '@renderer/shared/components/RelativeTime';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Code,
  EmptyState,
  Separator,
  Skeleton,
  Text,
} from '@ui';

import { useCommitHistory } from './useCommitHistory';

interface CommitHistoryProps {
  repoPath: string;
}

function CommitRowSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3">
      <Skeleton className="mt-0.5 h-4 w-16 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-3 w-14 shrink-0" />
    </div>
  );
}

function CommitRow({ commit }: { commit: GitCommitType }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Code className="mt-0.5 shrink-0 text-xs">{commit.shortHash}</Code>
      <div className="min-w-0 flex-1">
        <Text className="truncate" size="sm">{commit.message}</Text>
        <Text className="text-xs text-muted-foreground">{commit.author}</Text>
      </div>
      <RelativeTime className="text-xs text-muted-foreground shrink-0" value={commit.date} />
    </div>
  );
}

export function CommitHistory({ repoPath }: CommitHistoryProps) {
  const { commits, isLoading, hasCommits, handleLoadMore } = useCommitHistory(repoPath);

  function renderContent() {
    if (isLoading) {
      return (
        <div className="divide-y divide-border">
          <CommitRowSkeleton />
          <CommitRowSkeleton />
          <CommitRowSkeleton />
          <CommitRowSkeleton />
          <CommitRowSkeleton />
        </div>
      );
    }

    if (!hasCommits) {
      return (
        <EmptyState
          description="This repository has no commit history yet."
          icon={GitCommit}
          size="sm"
          title="No commits found"
        />
      );
    }

    return (
      <div className="divide-y divide-border">
        {commits?.map((commit) => (
          <CommitRow key={commit.hash} commit={commit} />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Commit History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {renderContent()}
        {hasCommits && !isLoading ? (
          <>
            <Separator />
            <div className="flex justify-center pt-1">
              <Button size="sm" variant="outline" onClick={handleLoadMore}>
                Load more
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
