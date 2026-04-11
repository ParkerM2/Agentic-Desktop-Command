/**
 * React Query hooks for alerts
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ALERTS } from '@shared/ipc/misc/alerts.channels';
import type { Alert, RecurringConfig, AlertLinkedTo } from '@shared/types';

import { ipc } from '@renderer/shared/lib/ipc';
import { optimisticCreate, optimisticDelete } from '@renderer/shared/lib/optimistic';

import { alertKeys } from './queryKeys';

/** Input type for creating an alert */
interface CreateAlertInput {
  type: 'reminder' | 'deadline' | 'notification' | 'recurring';
  message: string;
  triggerAt: string;
  recurring?: RecurringConfig;
  linkedTo?: AlertLinkedTo;
}

/** Fetch all alerts */
export function useAlerts(includeExpired = false) {
  return useQuery({
    queryKey: alertKeys.list(includeExpired),
    queryFn: () => ipc(ALERTS.LIST.ALL, { includeExpired }),
    staleTime: 30_000,
  });
}

/** Create a new alert */
export function useCreateAlert() {
  const queryClient = useQueryClient();

  const toOptimistic = (data: CreateAlertInput): Alert => ({
    id: crypto.randomUUID(),
    ...data,
    dismissed: false,
    createdAt: new Date().toISOString(),
  });

  return useMutation({
    mutationFn: (data: CreateAlertInput) => {
      const id = crypto.randomUUID();
      return ipc(ALERTS.CREATE.ALERT, { ...data, id });
    },
    ...optimisticCreate<CreateAlertInput, Alert>(
      queryClient,
      alertKeys.lists(),
      toOptimistic,
    ),
  });
}

/** Dismiss an alert */
export function useDismissAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(ALERTS.DISMISS.ALERT, { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

/** Delete an alert */
export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc(ALERTS.DELETE.ALERT, { id }),
    ...optimisticDelete<Alert>(queryClient, alertKeys.lists()),
  });
}
