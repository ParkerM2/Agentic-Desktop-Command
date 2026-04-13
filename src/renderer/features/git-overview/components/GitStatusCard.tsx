/**
 * GitStatusCard — Shows git repo status: branch, clean/dirty badge,
 * ahead/behind counts, and staged/modified/untracked file counts.
 */

import { GitBranch } from 'lucide-react';

import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton, Text } from '@ui';

import { useGitStatus } from '../api/useGit';

interface GitStatusCardProps {
  repoPath: string;
}

export function GitStatusCard({ repoPath }: GitStatusCardProps) {
  const { data: status, isLoading } = useGitStatus(repoPath);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Repository Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Repository Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-muted-foreground text-sm">Unable to load git status.</Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Repository Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Branch + clean/dirty + ahead/behind */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <GitBranch className="text-muted-foreground h-3.5 w-3.5" />
            <Text className="text-sm font-medium">{status.branch}</Text>
          </div>
          <Badge variant={status.isClean ? 'default' : 'destructive'}>
            {status.isClean ? 'Clean' : 'Dirty'}
          </Badge>
          {status.ahead > 0 || status.behind > 0 ? (
            <div className="flex items-center gap-1">
              {status.ahead > 0 ? (
                <Badge variant="secondary">{status.ahead} ahead</Badge>
              ) : null}
              {status.behind > 0 ? (
                <Badge variant="secondary">{status.behind} behind</Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* File count groups */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-0.5">
            <Text className="text-muted-foreground text-xs">Staged</Text>
            <Text className="text-sm font-medium">{status.staged.length}</Text>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Text className="text-muted-foreground text-xs">Modified</Text>
            <Text className="text-sm font-medium">{status.modified.length}</Text>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Text className="text-muted-foreground text-xs">Untracked</Text>
            <Text className="text-sm font-medium">{status.untracked.length}</Text>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
