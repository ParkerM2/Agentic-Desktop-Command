/**
 * GitHubPage — Full GitHub integration page
 *
 * Tabbed interface: Pull Requests, Issues, Notifications.
 * Replaces the previous stub page with real feature module.
 */

import { useState } from 'react';

import { Bell, CircleDot, GitPullRequest, Settings } from 'lucide-react';

import { IntegrationRequired } from '@renderer/shared/components/IntegrationRequired';
import { cn } from '@renderer/shared/lib/utils';

import { Input, Spinner } from '@ui';

import { useGitHubIssues, useGitHubNotifications, useGitHubPrs } from '../api/useGitHub';
import { useGitHubEvents } from '../hooks/useGitHubEvents';
import { useGitHubStore } from '../store';

import { GitHubConnectionStatus } from './GitHubConnectionStatus';
import { IssueCreateForm } from './IssueCreateForm';
import { IssueList } from './IssueList';
import { NotificationList } from './NotificationList';
import { PrDetailModal } from './PrDetailModal';
import { PrList } from './PrList';

// ── Tab Config ───────────────────────────────────────────────

type GitHubTab = 'prs' | 'issues' | 'notifications';

const TAB_CONFIG: Array<{
  id: GitHubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'prs', label: 'Pull Requests', icon: GitPullRequest },
  { id: 'issues', label: 'Issues', icon: CircleDot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

// ── Component ────────────────────────────────────────────────

export function GitHubPage() {
  const { activeTab, selectedPrNumber, owner, repo, setActiveTab, selectPr, setRepo } =
    useGitHubStore();
  const { data: prs, isLoading: prsLoading } = useGitHubPrs();
  const { data: issues, isLoading: issuesLoading } = useGitHubIssues();
  const { data: notifications, isLoading: notificationsLoading } = useGitHubNotifications();

  const [editingRepo, setEditingRepo] = useState(false);
  const [repoInput, setRepoInput] = useState(`${owner}/${repo}`);

  useGitHubEvents();

  function handleRepoSave() {
    const parts = repoInput.trim().split('/');
    if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
      setRepo(parts[0], parts[1]);
    }
    setEditingRepo(false);
  }

  const openPrCount = prs?.filter((pr) => pr.state === 'open').length ?? 0;
  const openIssueCount = issues?.filter((i) => i.state === 'open').length ?? 0;
  const unreadNotifCount = notifications?.filter((n) => n.unread).length ?? 0;

  function getTabCount(tab: GitHubTab): number {
    if (tab === 'prs') return openPrCount;
    if (tab === 'issues') return openIssueCount;
    return unreadNotifCount;
  }

  function renderActiveTab(): React.ReactNode {
    if (activeTab === 'prs') {
      if (prsLoading) return renderLoader();
      return <PrList prs={prs ?? []} onSelectPr={selectPr} />;
    }

    if (activeTab === 'issues') {
      if (issuesLoading) return renderLoader();
      return <IssueList issues={issues ?? []} />;
    }

    if (notificationsLoading) return renderLoader();
    return <NotificationList notifications={notifications ?? []} />;
  }

  function renderLoader(): React.ReactNode {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="text-muted-foreground" size="md" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <IntegrationRequired
        description="Connect your GitHub account to view pull requests, issues, and notifications."
        provider="github"
        title="Connect GitHub"
      />

      {/* Connection Status */}
      <GitHubConnectionStatus />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <GitPullRequest className="text-primary h-6 w-6" />
          <h1 className="text-2xl font-bold">GitHub</h1>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {editingRepo ? (
            <Input
              className="h-7 w-64 text-sm"
              id="github-repo-input"
              placeholder="owner/repo"
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRepoSave();
                if (e.key === 'Escape') setEditingRepo(false);
              }}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              {owner.length > 0 && repo.length > 0
                ? `${owner}/${repo}`
                : 'No repository configured'}
            </p>
          )}
          <button
            aria-label={editingRepo ? 'Save repository' : 'Change repository'}
            className="text-muted-foreground hover:text-foreground transition-colors"
            type="button"
            onClick={() => {
              if (editingRepo) {
                handleRepoSave();
              } else {
                setRepoInput(`${owner}/${repo}`);
                setEditingRepo(true);
              }
            }}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
            <GitPullRequest className="h-3.5 w-3.5" />
            Open PRs
          </div>
          <p className="text-lg font-semibold">{String(openPrCount)}</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
            <CircleDot className="h-3.5 w-3.5" />
            Open Issues
          </div>
          <p className="text-lg font-semibold">{String(openIssueCount)}</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
            <Bell className="h-3.5 w-3.5" />
            Unread
          </div>
          <p className="text-lg font-semibold">{String(unreadNotifCount)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-border mb-6 flex gap-1 border-b">
        {TAB_CONFIG.map((tab) => {
          const count = getTabCount(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {count > 0 ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs',
                    activeTab === tab.id
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {String(count)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {renderActiveTab()}

      {/* PR Detail Modal */}
      {selectedPrNumber === null ? null : (
        <PrDetailModal prNumber={selectedPrNumber} onClose={() => selectPr(null)} />
      )}

      {/* Issue Create Dialog */}
      <IssueCreateForm />
    </div>
  );
}
