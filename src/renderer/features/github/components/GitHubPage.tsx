/**
 * GitHubPage — Full GitHub integration page
 *
 * Tabbed interface: Pull Requests, Issues, Notifications.
 * Replaces the previous stub page with real feature module.
 */

import { Bell, CircleDot, GitPullRequest } from 'lucide-react';

import {
  Badge,
  MetricCard,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ui';

import { useGitHubIssues, useGitHubNotifications, useGitHubPrs } from '../api/useGitHub';
import { useGitHubEvents } from '../hooks/useGitHubEvents';
import { useGitHubProjectSync } from '../hooks/useGitHubProjectSync';
import { useGitHubStore } from '../store';

import { IssueCreateForm } from './IssueCreateForm';
import { IssueList } from './IssueList';
import { NotificationList } from './NotificationList';
import { PrDetailModal } from './PrDetailModal';
import { PrList } from './PrList';

// ── Types ────────────────────────────────────────────────────

type GitHubTab = 'prs' | 'issues' | 'notifications';

// ── Component ────────────────────────────────────────────────

export function GitHubPage() {
  const { activeTab, selectedPrNumber, setActiveTab, selectPr } =
    useGitHubStore();
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
    <div className="space-y-6 p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
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
