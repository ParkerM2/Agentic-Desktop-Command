/**
 * Error/health IPC event listeners -> query invalidation + toast notifications
 *
 * Bridges real-time error and health events from the main process to the
 * React Query cache and user-visible toast notifications.
 */

import { useQueryClient } from '@tanstack/react-query';

import { useIpcEvent } from '@renderer/shared/hooks';
import { useToastStore } from '@renderer/shared/stores';

import { healthKeys } from '../api/queryKeys';

/** Subscribe to error and health IPC events */
export function useErrorEvents(): void {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  // New error arrived -> invalidate error log and stats
  useIpcEvent('event:app.error', () => {
    void queryClient.invalidateQueries({ queryKey: healthKeys.errorLog() });
    void queryClient.invalidateQueries({ queryKey: healthKeys.errorStats() });
  });

  // Data store recovered from backup or defaults -> toast warning
  useIpcEvent('event:app.dataRecovery', (payload) => {
    addToast(`${payload.store}: ${payload.message}`, 'warning');
  });

  // Error log capacity alert -> toast warning
  useIpcEvent('event:app.capacityAlert', (payload) => {
    addToast(payload.message, 'warning');
  });

  // Service health degraded -> invalidate health status + toast
  useIpcEvent('event:app.serviceUnhealthy', (payload) => {
    void queryClient.invalidateQueries({ queryKey: healthKeys.status() });
    addToast(`Service unhealthy: ${payload.serviceName}`, 'warning');
  });
}
