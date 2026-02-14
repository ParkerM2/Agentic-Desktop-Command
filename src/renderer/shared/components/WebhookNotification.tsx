/**
 * WebhookNotification — Toast notification for incoming webhook commands
 *
 * Listens for event:webhook.received IPC events and displays a brief
 * notification showing the source and command text.
 * Positioned fixed bottom-right (AuthNotification is bottom-left).
 * Auto-dismisses after 5 seconds.
 */

import { useCallback, useEffect, useState } from 'react';

import { GitBranch, MessageSquare, X } from 'lucide-react';

import { useIpcEvent } from '@renderer/shared/hooks';

// ── Types ─────────────────────────────────────────────────────

interface WebhookNotificationItem {
  id: string;
  source: 'slack' | 'github';
  commandText: string;
  channelName: string;
  timestamp: string;
}

// ── Helpers ───────────────────────────────────────────────────

function buildSummary(item: WebhookNotificationItem): string {
  const sourceLabel = item.source === 'slack' ? 'Slack' : 'GitHub';
  const contextLabel = item.channelName.length > 0 ? ` from ${item.channelName}` : '';
  const truncatedCommand =
    item.commandText.length > 60 ? `${item.commandText.slice(0, 57)}...` : item.commandText;
  return `${sourceLabel}: ${truncatedCommand}${contextLabel}`;
}

function SourceIcon({ source }: { source: 'slack' | 'github' }) {
  if (source === 'slack') {
    return <MessageSquare aria-hidden="true" className="text-info h-4 w-4 shrink-0" />;
  }
  return <GitBranch aria-hidden="true" className="text-info h-4 w-4 shrink-0" />;
}

// ── Component ─────────────────────────────────────────────────

export function WebhookNotification() {
  const [notifications, setNotifications] = useState<WebhookNotificationItem[]>([]);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Subscribe to webhook events from main process
  useIpcEvent('event:webhook.received', (payload) => {
    const item: WebhookNotificationItem = {
      id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: payload.source,
      commandText: payload.commandText,
      channelName: payload.sourceContext.channelName,
      timestamp: payload.timestamp,
    };

    setNotifications((prev) => [...prev, item]);
  });

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notifications.length === 0) {
      return;
    }

    const timers = notifications.map((n) =>
      window.setTimeout(() => {
        handleDismiss(n.id);
      }, 5000),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [notifications, handleDismiss]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Webhook notifications"
      aria-live="polite"
      className="fixed right-4 bottom-4 z-50 flex flex-col gap-2"
      role="status"
    >
      {notifications.map((item) => (
        <div
          key={item.id}
          className="bg-card border-border text-foreground flex max-w-sm items-start gap-3 rounded-lg border p-3 shadow-lg"
        >
          <SourceIcon source={item.source} />
          <p className="min-w-0 flex-1 text-sm">{buildSummary(item)}</p>
          <button
            aria-label="Dismiss webhook notification"
            className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
            type="button"
            onClick={() => {
              handleDismiss(item.id);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
