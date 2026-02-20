/**
 * GitHubConnectionStatus — Displays gh CLI auth status and repo selector
 *
 * Shows connection state (not installed / not auth'd / connected),
 * username and scopes when connected, and a repo picker.
 */

import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  Spinner,
} from '@ui';

import { useGitHubAuthStatus, useGitHubRepos } from '../api/useGitHub';
import { useGitHubStore } from '../store';

// ── Icons ─────────────────────────────────────────────────────

/** GitHub mark (Simple Icons) -- lucide deprecated their Github icon. */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

// ── Sub-Components ────────────────────────────────────────────

interface RepoItemProps {
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

function RepoItem({ fullName, description, isPrivate, isSelected, onSelect }: RepoItemProps) {
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      aria-selected={isSelected}
      role="option"
      tabIndex={0}
      className={cn(
        'cursor-pointer rounded-md border px-3 py-2 transition-colors',
        isSelected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border bg-card hover:border-primary/40 text-foreground',
      )}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{fullName}</span>
        {isPrivate ? (
          <Badge size="sm" variant="secondary">
            Private
          </Badge>
        ) : null}
      </div>
      {description ? (
        <p className="text-muted-foreground mt-0.5 truncate text-xs">{description}</p>
      ) : null}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export function GitHubConnectionStatus() {
  const { owner, repo, setRepo } = useGitHubStore();
  const { data: authStatus, isLoading: authLoading, isError: authError } = useGitHubAuthStatus();
  const { data: repos, isLoading: reposLoading } = useGitHubRepos();

  // ── Derived state ──
  const isConnected = authStatus?.authenticated === true;
  const isInstalled = authStatus?.installed === true;
  const selectedFullName = owner.length > 0 && repo.length > 0 ? `${owner}/${repo}` : '';

  // ── Status rendering helper ──
  function renderStatusContent() {
    if (authLoading) {
      return (
        <div className="flex items-center gap-2 py-4">
          <Spinner className="text-muted-foreground" size="sm" />
          <span className="text-muted-foreground text-sm">Checking GitHub CLI status...</span>
        </div>
      );
    }

    if (authError) {
      return (
        <div className="flex items-center gap-2 py-4">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="text-sm text-destructive">Failed to check GitHub CLI status</span>
        </div>
      );
    }

    if (!isInstalled) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
            <Badge size="sm" variant="error">
              Not Installed
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            The GitHub CLI (gh) is not installed. Install it from{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">
              https://cli.github.com
            </code>{' '}
            to connect your GitHub account.
          </p>
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
            <Badge size="sm" variant="warning">
              Not Authenticated
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            GitHub CLI is installed but not authenticated. Run{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">gh auth login</code>{' '}
            in a terminal to sign in.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <Badge size="sm" variant="success">
            Connected
          </Badge>
          {authStatus.username ? (
            <span className="text-foreground text-sm font-medium">
              {authStatus.username}
            </span>
          ) : null}
        </div>
        {authStatus.scopes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {authStatus.scopes.map((scope) => (
              <Badge key={scope} size="sm" variant="outline">
                {scope}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  // ── Repo selector rendering helper ──
  function renderRepoSelector() {
    if (!isConnected) return null;

    if (reposLoading) {
      return (
        <div className="flex items-center gap-2 pt-4">
          <Spinner className="text-muted-foreground" size="sm" />
          <span className="text-muted-foreground text-sm">Loading repositories...</span>
        </div>
      );
    }

    if (!repos || repos.length === 0) {
      return (
        <p className="text-muted-foreground pt-4 text-sm">
          No repositories found.
        </p>
      );
    }

    return (
      <div className="pt-4">
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          Select Repository
        </p>
        <ScrollArea className="h-48">
          <div aria-label="Repository list" className="space-y-1 pr-3" role="listbox">
            {repos.map((r) => (
              <RepoItem
                key={r.fullName}
                description={r.description}
                fullName={r.fullName}
                isPrivate={r.isPrivate}
                isSelected={r.fullName === selectedFullName}
                onSelect={() => setRepo(r.owner, r.name)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ── Render ──
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GitHubIcon className="h-5 w-5" />
          <CardTitle className="text-base">GitHub Connection</CardTitle>
        </div>
        <CardDescription>Status of the gh CLI and your authenticated account</CardDescription>
      </CardHeader>
      <CardContent>
        {renderStatusContent()}
        {renderRepoSelector()}
      </CardContent>
    </Card>
  );
}
