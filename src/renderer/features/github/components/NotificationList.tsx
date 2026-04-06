/**
 * NotificationList — GitHub notifications component
 */

import { Bell, BellDot, CircleDot, GitPullRequest } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Card, EmptyState } from '@ui';

import type { GitHubNotification } from '../api/useGitHub';

// ── Helpers ──────────────────────────────────────────────────

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${String(diffDays)}d ago`;
  if (diffHours > 0) return `${String(diffHours)}h ago`;
  if (diffMinutes > 0) return `${String(diffMinutes)}m ago`;
  return 'just now';
}

function getNotificationIcon(type: string): React.ComponentType<{ className?: string }> {
  if (type === 'PullRequest') return GitPullRequest;
  if (type === 'Issue') return CircleDot;
  return Bell;
}

function formatReason(reason: string): string {
  const labels: Record<string, string> = {
    review_requested: 'Review requested',
    mention: 'Mentioned',
    subscribed: 'Subscribed',
    assign: 'Assigned',
    author: 'Author',
    comment: 'Commented',
    ci_activity: 'CI activity',
  };
  return labels[reason] ?? reason;
}

// ── Component ────────────────────────────────────────────────

interface NotificationListProps {
  notifications: GitHubNotification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        description="No notifications"
        icon={Bell}
        title="All caught up"
      />
    );
  }

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div>
      {unreadCount > 0 ? (
        <div className="text-muted-foreground mb-3 flex items-center gap-2 text-xs">
          <BellDot className="text-primary h-3.5 w-3.5" />
          <span>
            {String(unreadCount)} unread notification{unreadCount === 1 ? '' : 's'}
          </span>
        </div>
      ) : null}
      <Card>
        <div className="divide-border divide-y">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);

            return (
              <div
                key={notification.id}
                className={cn('flex items-start gap-3 p-4', notification.unread && 'bg-accent/50')}
              >
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    notification.unread ? 'text-primary' : 'text-muted-foreground',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'truncate text-sm',
                        notification.unread ? 'font-medium' : 'text-muted-foreground',
                      )}
                    >
                      {notification.title}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                    <span>{notification.repoName}</span>
                    <span>{formatReason(notification.reason)}</span>
                    <span>{formatRelativeTime(notification.updatedAt)}</span>
                  </div>
                </div>
                {notification.unread ? (
                  <div className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
