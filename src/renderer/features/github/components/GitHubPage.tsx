/**
 * GitHubPage — Full GitHub integration page
 *
 * Tabbed interface: Pull Requests, Issues, Notifications.
 * Replaces the previous stub page with real feature module.
 */

import { useState } from 'react';

import { Bell, CircleDot, GitPullRequest, Settings } from 'lucide-react';

import { IntegrationRequired } from '@renderer/shared/components/IntegrationRequired';

import {
  Badge,
  Button,
  Input,
  MetricCard,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ui';

import { useGitHubIssues, useGitHubNotifications, useGitHubPrs } from '../api/useGitHub';
import { useGitHubEvents } from '../hooks/useGitHubEvents';
import { useGitHubStore } from '../store';

import { GitHubConnectionStatus } from './GitHubConnectionStatus';
import { IssueCreateForm } from './IssueCreateForm';
import { IssueList } from './IssueList';
import { NotificationList } from './NotificationList';
import { PrDetailModal } from './PrDetailModal';
import { PrList } from './PrList';

// ── Types ────────────────────────────────────────────────────

type GitHubTab = 'prs' | 'issues' | 'notifications';

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

  function renderTabContent(tab: string): React.ReactNode {
    if (tab === 'prs') {
      if (prsLoading) return <LoadingSpinner />;
      return <PrList prs={prs ?? []} onSelectPr={selectPr} />;
    }

    if (tab === 'issues') {
      if (issuesLoading) return <LoadingSpinner />;
      return <IssueList issues={issues ?? []} />;
    }

    if (notificationsLoading) return <LoadingSpinner />;
    return <NotificationList notifications={notifications ?? []} />;
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
          <Button
            aria-label={editingRepo ? 'Save repository' : 'Change repository'}
            size="icon"
            type="button"
            variant="ghost"
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
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <MetricCard
          icon={GitPullRequest}
          label="Open PRs"
          value={String(openPrCount)}
          variant="compact"
        />
        <MetricCard
          icon={CircleDot}
          label="Open Issues"
          value={String(openIssueCount)}
          variant="compact"
        />
        <MetricCard
          icon={Bell}
          label="Unread"
          value={String(unreadNotifCount)}
          variant="compact"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GitHubTab)}>
        <TabsList className="mb-6 h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            value="prs"
          >
            <GitPullRequest className="h-4 w-4" />
            Pull Requests
            {openPrCount > 0 ? (
              <Badge size="sm" variant="secondary">
                {String(openPrCount)}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            value="issues"
          >
            <CircleDot className="h-4 w-4" />
            Issues
            {openIssueCount > 0 ? (
              <Badge size="sm" variant="secondary">
                {String(openIssueCount)}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            value="notifications"
          >
            <Bell className="h-4 w-4" />
            Notifications
            {unreadNotifCount > 0 ? (
              <Badge size="sm" variant="secondary">
                {String(unreadNotifCount)}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prs">{renderTabContent('prs')}</TabsContent>
        <TabsContent value="issues">{renderTabContent('issues')}</TabsContent>
        <TabsContent value="notifications">{renderTabContent('notifications')}</TabsContent>
      </Tabs>

      {/* PR Detail Modal */}
      {selectedPrNumber === null ? null : (
        <PrDetailModal prNumber={selectedPrNumber} onClose={() => selectPr(null)} />
      )}

      {/* Issue Create Dialog */}
      <IssueCreateForm />
    </div>
  );
}

// ── LoadingSpinner ───────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner className="text-muted-foreground" size="md" />
    </div>
  );
}
