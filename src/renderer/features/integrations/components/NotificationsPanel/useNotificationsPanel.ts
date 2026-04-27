/**
 * useNotificationsPanel — Logic hook for NotificationsPanel
 */

import { useState } from 'react';

import type { NotificationSource } from '@shared/types/notifications';

import {
  useAllNotifications,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotificationsConfig,
  useStartWatching,
  useStopWatching,
  useUpdateNotificationsConfig,
  useWatcherStatus,
} from '../../api/useNotifications';

type WatcherStatusVariant = 'success' | 'error' | 'neutral';

interface WatcherDisplay {
  variant: WatcherStatusVariant;
  label: string;
  dotClass: string;
}

export function getWatcherDisplay(isWatching: boolean, hasErrors: boolean): WatcherDisplay {
  if (hasErrors) return { variant: 'error', label: 'Error', dotClass: 'bg-red-500' };
  if (isWatching) return { variant: 'success', label: 'Watching', dotClass: 'bg-green-500' };
  return { variant: 'neutral', label: 'Stopped', dotClass: 'bg-muted-foreground' };
}

export function relativeTime(timestamp: string): string {
  const diffMin = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function useNotificationsPanel() {
  const { data: watcherStatus, isLoading: statusLoading } = useWatcherStatus();
  const { data: config } = useNotificationsConfig();
  const { data: notifications, isLoading: notificationsLoading } = useAllNotifications();
  const startWatching = useStartWatching();
  const stopWatching = useStopWatching();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const updateConfig = useUpdateNotificationsConfig();

  const [refreshInterval, setRefreshInterval] = useState(
    config === undefined ? '60' : String(config.slack.pollIntervalSeconds),
  );
  const [slackEnabled, setSlackEnabled] = useState(config === undefined ? false : config.slack.enabled);
  const [githubEnabled, setGithubEnabled] = useState(config === undefined ? false : config.github.enabled);

  const isWatching = watcherStatus === undefined ? false : watcherStatus.isWatching;
  const hasErrors = Object.keys(watcherStatus?.errors ?? {}).length > 0;
  const { label: statusLabel, dotClass: statusDotClass } = getWatcherDisplay(isWatching, hasErrors);
  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  function handleSaveConfig(): void {
    const interval = parseInt(refreshInterval, 10);
    const ms = isNaN(interval) ? 60 : interval;
    updateConfig.mutate({
      slack: { enabled: slackEnabled, pollIntervalSeconds: ms },
      github: { enabled: githubEnabled, pollIntervalSeconds: ms },
    });
  }

  function handleSourceToggle(source: NotificationSource, checked: boolean): void {
    if (source === 'slack') setSlackEnabled(checked);
    else setGithubEnabled(checked);
  }

  return {
    watcherStatus,
    statusLoading,
    notifications,
    notificationsLoading,
    startWatching,
    stopWatching,
    markRead,
    markAllRead,
    updateConfig,
    refreshInterval,
    setRefreshInterval,
    slackEnabled,
    githubEnabled,
    isWatching,
    statusLabel,
    statusDotClass,
    unreadCount,
    handleSaveConfig,
    handleSourceToggle,
  };
}
