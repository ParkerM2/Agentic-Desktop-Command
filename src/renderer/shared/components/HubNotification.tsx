/**
 * HubNotification — Toast notification for hub connection status changes
 *
 * Listens for hub connection and sync events from main process.
 * Shows brief notifications when connection state changes or sync completes.
 * Auto-dismisses after 4 seconds.
 */

import { useCallback, useEffect, useState } from 'react';

import { CheckCircle, Cloud, CloudOff, RefreshCw, X } from 'lucide-react';

import { useIpcEvent } from '@renderer/shared/hooks';

// ── Types ─────────────────────────────────────────────────────

interface HubNotificationItem {
  id: string;
  type: 'connection' | 'sync';
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'synced';
  message: string;
}

// ── Helpers ───────────────────────────────────────────────────

function getStatusIcon(status: HubNotificationItem['status']) {
  switch (status) {
    case 'connected':
      return <Cloud aria-hidden="true" className="text-success h-4 w-4 shrink-0" />;
    case 'disconnected':
    case 'error':
      return <CloudOff aria-hidden="true" className="text-muted-foreground h-4 w-4 shrink-0" />;
    case 'connecting':
      return <RefreshCw aria-hidden="true" className="text-info h-4 w-4 shrink-0 animate-spin" />;
    case 'synced':
      return <CheckCircle aria-hidden="true" className="text-success h-4 w-4 shrink-0" />;
  }
}

function getStatusMessage(status: 'connected' | 'disconnected' | 'connecting' | 'error'): string {
  switch (status) {
    case 'connected':
      return 'Hub connected';
    case 'disconnected':
      return 'Hub disconnected';
    case 'connecting':
      return 'Connecting to hub...';
    case 'error':
      return 'Hub connection error';
  }
}

// ── Component ─────────────────────────────────────────────────

export function HubNotification() {
  const [notifications, setNotifications] = useState<HubNotificationItem[]>([]);

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Subscribe to hub connection events
  useIpcEvent('event:hub.connectionChanged', (payload) => {
    const item: HubNotificationItem = {
      id: `hub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'connection',
      status: payload.status,
      message: getStatusMessage(payload.status),
    };

    setNotifications((prev) => [...prev, item]);
  });

  // Subscribe to hub sync events
  useIpcEvent('event:hub.syncCompleted', (payload) => {
    const item: HubNotificationItem = {
      id: `hub-sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'sync',
      status: 'synced',
      message: `Synced ${payload.syncedCount} ${payload.syncedCount === 1 ? 'item' : 'items'}`,
    };

    setNotifications((prev) => [...prev, item]);
  });

  // Auto-dismiss notifications after 4 seconds
  useEffect(() => {
    if (notifications.length === 0) {
      return;
    }

    const timers = notifications.map((n) =>
      window.setTimeout(() => {
        handleDismiss(n.id);
      }, 4000),
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
      aria-label="Hub notifications"
      aria-live="polite"
      className="fixed top-16 right-4 z-50 flex flex-col gap-2"
      role="status"
    >
      {notifications.map((item) => (
        <div
          key={item.id}
          className="bg-card border-border text-foreground flex max-w-xs items-center gap-3 rounded-lg border p-3 shadow-lg"
        >
          {getStatusIcon(item.status)}
          <p className="min-w-0 flex-1 text-sm">{item.message}</p>
          <button
            aria-label="Dismiss hub notification"
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
