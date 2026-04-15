/**
 * Alert mutation hooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ALERTS } from '@shared/ipc/alerts';
import type { UpdateAlertInput } from '@shared/ipc/alerts';

import { ipc } from '@renderer/shared/lib/ipc';

import { alertKeys } from './queryKeys';

/** Update an existing alert (message, triggerAt, recurring, linkedTo) */
export function useUpdateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAlertInput) => ipc(ALERTS.UPDATE.ALERT, data),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}
