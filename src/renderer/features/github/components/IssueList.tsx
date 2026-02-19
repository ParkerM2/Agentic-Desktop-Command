/**
 * IssueList — GitHub issues listing component
 */

import { CircleDot, MessageSquare, Plus } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { useGitHubStore } from '../store';

import type { GitHubIssue } from '../api/useGitHub';

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

// ── Component ────────────────────────────────────────────────

interface IssueListProps {
  issues: GitHubIssue[];
}

export function IssueList({ issues }: IssueListProps) {
  const setIssueCreateDialogOpen = useGitHubStore((s) => s.setIssueCreateDialogOpen);

  return (
    <div>
      {/* Header with New Issue button */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-foreground text-sm font-medium">
          {issues.length > 0 ? `${String(issues.length)} issues` : 'Issues'}
        </h3>
        <button
          type="button"
          className={cn(
            'bg-primary text-primary-foreground flex items-center gap-1.5 rounded-md px-3 py-1.5',
            'text-sm font-medium transition-opacity hover:opacity-90',
          )}
          onClick={() => setIssueCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Issue
        </button>
      </div>

      {/* Issue list */}
      {issues.length === 0 ? (
        <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
          No issues found
        </div>
      ) : (
        <div className="border-border bg-card divide-border divide-y rounded-lg border">
          {issues.map((issue) => (
            <div key={issue.id} className="flex items-start gap-3 p-4">
              <CircleDot
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  issue.state === 'open' ? 'text-success' : 'text-destructive',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{issue.title}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    #{String(issue.number)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                  <span>{issue.author}</span>
                  <span>{formatRelativeTime(issue.updatedAt)}</span>
                  {issue.assignees.length > 0 ? (
                    <span>Assigned: {issue.assignees.join(', ')}</span>
                  ) : null}
                  {issue.comments > 0 ? (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {String(issue.comments)}
                    </span>
                  ) : null}
                </div>
                {issue.labels.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {issue.labels.map((label) => (
                      <span
                        key={label.name}
                        className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
