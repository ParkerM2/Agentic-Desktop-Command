/**
 * PrList — Pull request listing component
 */

import { GitMerge, GitPullRequest, MessageSquare } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Badge, Button, Card, EmptyState } from '@ui';

import type { GitHubPr } from '../api/useGitHub';

// ── Helpers ──────────────────────────────────────────────────

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${String(diffDays)}d ago`;
  if (diffHours > 0) return `${String(diffHours)}h ago`;
  if (diffMinutes > 0) return `${String(diffMinutes)}m ago`;
  return 'just now';
}

function getPrIconClass(pr: GitHubPr): string {
  if (pr.merged) return 'text-purple-400';
  if (pr.draft) return 'text-muted-foreground';
  if (pr.state === 'closed') return 'text-destructive';
  return 'text-success';
}

// ── Component ────────────────────────────────────────────────

interface PrListProps {
  prs: GitHubPr[];
  onSelectPr: (prNumber: number) => void;
}

export function PrList({ prs, onSelectPr }: PrListProps) {
  if (prs.length === 0) {
    return (
      <EmptyState
        description="No pull requests found"
        icon={GitPullRequest}
        title="No Pull Requests"
      />
    );
  }

  return (
    <Card>
      <div className="divide-border divide-y">
        {prs.map((pr) => {
          const Icon = pr.merged ? GitMerge : GitPullRequest;

          return (
            <Button
              key={pr.id}
              className="hover:bg-accent flex h-auto w-full items-start gap-3 rounded-none p-4 text-left"
              type="button"
              variant="ghost"
              onClick={() => onSelectPr(pr.number)}
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', getPrIconClass(pr))} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{pr.title}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">#{String(pr.number)}</span>
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                  <span>{pr.author}</span>
                  <span>{formatRelativeTime(pr.updatedAt)}</span>
                  <span className="text-success">+{String(pr.additions)}</span>
                  <span className="text-destructive">-{String(pr.deletions)}</span>
                  {pr.comments > 0 ? (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {String(pr.comments)}
                    </span>
                  ) : null}
                </div>
                {pr.labels.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pr.labels.map((label) => (
                      <Badge key={label.name} size="sm" variant="secondary">
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
