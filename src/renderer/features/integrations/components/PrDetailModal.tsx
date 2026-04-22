/**
 * PrDetailModal — Pull request detail overlay
 */

import { GitMerge, GitPullRequest } from 'lucide-react';

import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Heading, ScrollArea, Text } from '@ui';

import { useGitHubPrDetail } from '../api/useGitHub';

import type { GitHubPr } from '../api/useGitHub';

// ── Helpers ──────────────────────────────────────────────────

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPrStatusVariant(
  pr: GitHubPr,
): 'default' | 'secondary' | 'destructive' | 'success' | 'info' | 'warning' {
  if (pr.merged) return 'info';
  if (pr.draft) return 'secondary';
  if (pr.state === 'closed') return 'destructive';
  return 'success';
}

function getPrStatusLabel(pr: GitHubPr): string {
  if (pr.merged) return 'Merged';
  if (pr.draft) return 'Draft';
  if (pr.state === 'closed') return 'Closed';
  return 'Open';
}

// ── Sub-components ───────────────────────────────────────────

function PrDetailLoading() {
  return (
    <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
      Loading...
    </div>
  );
}

function PrDetailEmpty() {
  return (
    <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
      Pull request not found
    </div>
  );
}

function PrDetailContent({ pr }: { pr: GitHubPr }) {
  return (
    <div>
      {/* Title and status */}
      <div className="mb-4 flex items-start gap-3">
        <Heading as="h2" className="flex-1 text-lg">{pr.title}</Heading>
        <Badge variant={getPrStatusVariant(pr)}>{getPrStatusLabel(pr)}</Badge>
      </div>

      {/* Meta */}
      <div className="text-muted-foreground mb-4 flex flex-wrap gap-4 text-sm">
        <span>
          <span className="font-medium">{pr.author}</span> wants to merge{' '}
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{pr.headBranch}</code>
          {' into '}
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{pr.baseBranch}</code>
        </span>
      </div>

      {/* Stats */}
      <div className="border-border mb-4 grid grid-cols-4 gap-3 rounded-lg border p-3">
        <div className="text-center">
          <Text className="text-xs" variant="muted">
            Commits
          </Text>
          <p className="font-semibold">-</p>
        </div>
        <div className="text-center">
          <Text className="text-xs" variant="muted">
            Changed
          </Text>
          <p className="font-semibold">{String(pr.changedFiles)}</p>
        </div>
        <div className="text-center">
          <Text className="text-xs" variant="muted">
            Additions
          </Text>
          <p className="text-success font-semibold">+{String(pr.additions)}</p>
        </div>
        <div className="text-center">
          <Text className="text-xs" variant="muted">
            Deletions
          </Text>
          <p className="text-destructive font-semibold">-{String(pr.deletions)}</p>
        </div>
      </div>

      {/* Labels */}
      {pr.labels.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-1">
          {pr.labels.map((label) => (
            <Badge key={label.name} variant="secondary">
              {label.name}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Reviewers */}
      {pr.reviewers.length > 0 ? (
        <div className="mb-4">
          <Text className="mb-1 text-xs uppercase" variant="muted">
            Reviewers
          </Text>
          <div className="flex gap-2">
            {pr.reviewers.map((reviewer) => (
              <Badge key={reviewer} variant="outline">
                {reviewer}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {/* Body */}
      {pr.body ? (
        <div className="border-border border-t pt-4">
          <Text className="mb-2 text-xs uppercase" variant="muted">
            Description
          </Text>
          <Text className="whitespace-pre-wrap" variant="muted">
            {pr.body}
          </Text>
        </div>
      ) : null}

      {/* Dates */}
      <Text className="border-border mt-4 border-t pt-4 text-xs" variant="muted">
        Created {formatDate(pr.createdAt)}
        <span className="mx-2">&middot;</span>
        Updated {formatDate(pr.updatedAt)}
      </Text>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────

interface PrDetailModalProps {
  prNumber: number;
  onClose: () => void;
}

function renderBody(isLoading: boolean, pr: GitHubPr | undefined): React.ReactNode {
  if (isLoading) return <PrDetailLoading />;
  if (pr) return <PrDetailContent pr={pr} />;
  return <PrDetailEmpty />;
}

export function PrDetailModal({ prNumber, onClose }: PrDetailModalProps) {
  const { data: pr, isLoading } = useGitHubPrDetail(prNumber);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pr?.merged ? (
              <GitMerge className="h-5 w-5 text-purple-400" />
            ) : (
              <GitPullRequest className="text-success h-5 w-5" />
            )}
            <span className="text-muted-foreground text-sm">#{String(prNumber)}</span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="pr-4">{renderBody(isLoading, pr)}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
