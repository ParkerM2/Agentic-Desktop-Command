/**
 * Notifications React Query hooks
 *
 * Fetches notification watcher data and configuration via IPC.
 * Covers listing notifications, config, watcher status, and mutations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS } from '@shared/ipc/notifications/channels';
import type {
  GitHubWatcherConfig,
  NotificationFilter,
  NotificationSource,
  SlackWatcherConfig,
} from '@shared/types/notifications';

import { ipc } from '@renderer/shared/lib/ipc';

import { integrationsKeys } from './queryKeys';

// ── Queries ──────────────────────────────────────────────────

/** Fetch all notifications, with optional filter and limit */
export function useAllNotifications(filter?: NotificationFilter, limit?: number) {
  return useQuery({
    queryKey: integrationsKeys.notificationsAll(),
    queryFn: () => ipc(NOTIFICATIONS.LIST.ALL, { filter, limit }),
    staleTime: 30_000,
  });
}

/** Fetch notification watcher configuration */
export function useNotificationsConfig() {
  return useQuery({
    queryKey: integrationsKeys.notificationsConfig(),
    queryFn: () => ipc(NOTIFICATIONS.GET.CONFIG, {}),
    staleTime: 60_000,
  });
}

/** Fetch current watcher status */
export function useWatcherStatus() {
  return useQuery({
    queryKey: integrationsKeys.notificationsWatcherStatus(),
    queryFn: () => ipc(NOTIFICATIONS.GET['WATCHER-STATUS'], {}),
    staleTime: 10_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────

/** Mark a single notification as read */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string }) => ipc(NOTIFICATIONS.MARK.READ, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.notificationsAll(),
      });
    },
  });
}

/** Mark all notifications as read, optionally filtered by source */
export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { source?: NotificationSource }) =>
      ipc(NOTIFICATIONS.MARK['ALL-READ'], input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.notificationsAll(),
      });
    },
  });
}

/** Update notification watcher configuration */
export function useUpdateNotificationsConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      enabled?: boolean;
      slack?: Partial<SlackWatcherConfig>;
      github?: Partial<GitHubWatcherConfig>;
    }) => ipc(NOTIFICATIONS.UPDATE.CONFIG, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.notificationsConfig(),
      });
    },
  });
}

/** Start all notification watchers */
export function useStartWatching() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ipc(NOTIFICATIONS.START.WATCHING, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.notificationsWatcherStatus(),
      });
    },
  });
}

/** Stop all notification watchers */
export function useStopWatching() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ipc(NOTIFICATIONS.STOP.WATCHING, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: integrationsKeys.notificationsWatcherStatus(),
      });
    },
  });
}
