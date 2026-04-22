/**
 * NotificationsPanel — Watcher status, config, and notification list management
 */

import { Bell } from 'lucide-react';

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

import { useNotificationsPanel } from './useNotificationsPanel';

export function NotificationsPanel() {
  const {
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
  } = useNotificationsPanel();

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
                {notification.timestamp}
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
