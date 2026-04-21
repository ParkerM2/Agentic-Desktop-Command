/**
 * useGitHubPanel — Logic hook for GitHubPanel
 */

import { useState } from 'react';

import { useGitHubIssues, useGitHubNotifications, useGitHubPrs } from '../../api/useGitHub';
import { useGitHubEvents } from '../../hooks/useGitHubEvents';
import { useGitHubProjectSync } from '../../hooks/useGitHubProjectSync';
import { useGitHubStore } from '../../store';

export type GitHubSubTab = 'prs' | 'issues' | 'notifications';

export function useGitHubPanel() {
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

  return {
    showDiff,
    setShowDiff,
    activeTab,
    selectedPrNumber,
    setActiveTab,
    selectPr,
    prs,
    prsLoading,
    issues,
    issuesLoading,
    notifications,
    notificationsLoading,
    openPrCount,
    openIssueCount,
    unreadNotifCount,
  };
}
