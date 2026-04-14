/**
 * GitHubPanel — GitHub integration content for the Integrations page
 *
 * Shows connection status, repo selector, and sub-tabs for PRs, Issues, Notifications.
 */

import { useState } from 'react';

import { Bell, CircleDot, GitPullRequest } from 'lucide-react';

import { Badge, Button, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@ui';

import { useGitHubIssues, useGitHubNotifications, useGitHubPrs } from '../api/useGitHub';
import { useGitHubEvents } from '../hooks/useGitHubEvents';
import { useGitHubProjectSync } from '../hooks/useGitHubProjectSync';
import { useGitHubStore } from '../store';

import { GitHubConnectionStatus } from './GitHubConnectionStatus';
import { IssueCreateForm } from './IssueCreateForm';
import { IssueList } from './IssueList';
import { NotificationList } from './NotificationList';
import { PrDetailModal } from './PrDetailModal';
import { PrDiffView } from './PrDiffView';
import { PrList } from './PrList';

// ── Types ────────────────────────────────────────────────────

type GitHubSubTab = 'prs' | 'issues' | 'notifications';

// ── Helper ───────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner className="text-muted-foreground" size="md" />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────

export function GitHubPanel() {
  const [showDiff, setShowDiff] = useState(false);

  const {
    githubActiveTab: activeTab,
    githubSelectedPrNumber: selectedPrNumber,
    setGitHubActiveTab: setActiveTab,
    selectPr,
  } = useGitHubStore();

  const { data: prs, isLoading: prsLoading } = useGitHubPrs();
  const { data: issues, isLoading: issuesLoading } = useGitHubIssues();
  const { data: notifications, isLoading: notificationsLoading } = useGitHubNotifications();

  useGitHubEvents();
  useGitHubProjectSync();

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
    <div className="space-y-4">
      <GitHubConnectionStatus />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GitHubSubTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="prs">
            <GitPullRequest className="h-4 w-4" />
            Pull Requests
            {openPrCount > 0 ? (
              <Badge size="sm" variant="secondary">
                {String(openPrCount)}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="issues">
            <CircleDot className="h-4 w-4" />
            Issues
            {openIssueCount > 0 ? (
              <Badge size="sm" variant="secondary">
                {String(openIssueCount)}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="notifications">
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
        <PrDetailModal prNumber={selectedPrNumber} onClose={() => { selectPr(null); setShowDiff(false); }} />
      )}

      {/* View Files toggle — only shown when a PR is selected */}
      {selectedPrNumber === null ? null : (
        <div className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDiff(!showDiff)}
          >
            {showDiff ? 'Hide Files' : 'View Files'}
          </Button>
          {showDiff ? <PrDiffView prNumber={selectedPrNumber} /> : null}
        </div>
      )}

      {/* Issue Create Dialog */}
      <IssueCreateForm />
    </div>
  );
}
