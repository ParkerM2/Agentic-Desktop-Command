/**
 * NotificationsPanel — Watcher status, config, and notification list management
 */

import { useState } from 'react';

import { Bell } from 'lucide-react';

import type { NotificationSource } from '@shared/types/notifications';

import { cn } from '@renderer/shared/lib/utils';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Spinner,
  Text,
} from '@ui';

import {
  useAllNotifications,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotificationsConfig,
  useStartWatching,
  useStopWatching,
  useUpdateNotificationsConfig,
  useWatcherStatus,
} from '../api/useNotifications';


type WatcherStatusVariant = 'success' | 'error' | 'neutral';

interface WatcherDisplay {
  variant: WatcherStatusVariant;
  label: string;
  dotClass: string;
}

function getWatcherDisplay(isWatching: boolean, hasErrors: boolean): WatcherDisplay {
  if (hasErrors) return { variant: 'error', label: 'Error', dotClass: 'bg-red-500' };
  if (isWatching) return { variant: 'success', label: 'Watching', dotClass: 'bg-green-500' };
  return { variant: 'neutral', label: 'Stopped', dotClass: 'bg-muted-foreground' };
}

function relativeTime(timestamp: string): string {
  const diffMin = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function NotificationsPanel() {
  // 1. Hooks
  const { data: watcherStatus, isLoading: statusLoading } = useWatcherStatus();
  const { data: config } = useNotificationsConfig();
  const { data: notifications, isLoading: notificationsLoading } = useAllNotifications();
  const startWatching = useStartWatching();
  const stopWatching = useStopWatching();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const updateConfig = useUpdateNotificationsConfig();

  // 2. Local config state
  const [refreshInterval, setRefreshInterval] = useState(
    config === undefined ? '60' : String(config.slack.pollIntervalSeconds),
  );
  const [slackEnabled, setSlackEnabled] = useState(config === undefined ? false : config.slack.enabled);
  const [githubEnabled, setGithubEnabled] = useState(config === undefined ? false : config.github.enabled);

  // 3. Derived state
  const isWatching = watcherStatus === undefined ? false : watcherStatus.isWatching;
  const hasErrors = Object.keys(watcherStatus?.errors ?? {}).length > 0;
  const { label: statusLabel, dotClass: statusDotClass } = getWatcherDisplay(isWatching, hasErrors);
  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  // 4. Handlers
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

  // 5. Render helpers
  function renderNotifications() {
    if (notificationsLoading) {
      return (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      );
    }

    const items = notifications ?? [];
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 py-8">
          <Bell className="text-muted-foreground h-8 w-8" />
          <Text className="text-muted-foreground" size="sm">No notifications</Text>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {items.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              'border-border flex items-start justify-between rounded-md border p-3',
              notification.read ? 'opacity-60' : '',
            )}
          >
            <div className="flex flex-col gap-1">
              <Text className="font-medium" size="sm">
                {notification.title}
              </Text>
              <Text className="text-muted-foreground" size="sm">
                {notification.body}
              </Text>
              <Text className="text-muted-foreground text-xs">
                {relativeTime(notification.timestamp)}
              </Text>
            </div>
            {notification.read ? null : (
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => { markRead.mutate({ id: notification.id }); }}
              >
                Mark Read
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Watcher status */}
      <Card>
        <CardHeader>
          <CardTitle>Watcher Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {statusLoading ? (
            <Spinner size="sm" />
          ) : (
            <div className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', statusDotClass)} />
              <Text className="font-medium" size="sm">{statusLabel}</Text>
              {watcherStatus !== undefined && watcherStatus.activeWatchers.length > 0 ? (
                <Text className="text-muted-foreground" size="sm">
                  — {watcherStatus.activeWatchers.join(', ')}
                </Text>
              ) : null}
            </div>
          )}
          <div className="flex gap-3">
            <Button
              disabled={isWatching || startWatching.isPending}
              size="sm"
              type="button"
              variant="primary"
              onClick={() => { startWatching.mutate(); }}
            >
              {startWatching.isPending ? <Spinner size="sm" /> : null}
              Start Watching
            </Button>
            <Button
              disabled={!isWatching || stopWatching.isPending}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => { stopWatching.mutate(); }}
            >
              {stopWatching.isPending ? <Spinner size="sm" /> : null}
              Stop Watching
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Config form */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Text className="mb-2 font-medium" size="sm">Sources</Text>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={slackEnabled}
                  id="notifications-slack"
                  onCheckedChange={(checked) => {
                    handleSourceToggle('slack', checked === true);
                  }}
                />
                <Label htmlFor="notifications-slack">Slack</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={githubEnabled}
                  id="notifications-github"
                  onCheckedChange={(checked) => {
                    handleSourceToggle('github', checked === true);
                  }}
                />
                <Label htmlFor="notifications-github">GitHub</Label>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="notifications-interval">Refresh Interval (seconds)</Label>
            <Input
              id="notifications-interval"
              placeholder="60"
              type="number"
              value={refreshInterval}
              onChange={(e) => { setRefreshInterval(e.target.value); }}
            />
          </div>
          <Button
            className="self-start"
            disabled={updateConfig.isPending}
            size="sm"
            type="button"
            onClick={handleSaveConfig}
          >
            {updateConfig.isPending ? <Spinner size="sm" /> : null}
            Save Config
          </Button>
        </CardContent>
      </Card>

      {/* Notifications list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Notifications</CardTitle>
              {unreadCount > 0 ? (
                <Badge variant="secondary">{unreadCount}</Badge>
              ) : null}
            </div>
            <Button
              disabled={markAllRead.isPending || unreadCount === 0}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => { markAllRead.mutate({}); }}
            >
              Mark All Read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderNotifications()}
        </CardContent>
      </Card>
    </div>
  );
}
