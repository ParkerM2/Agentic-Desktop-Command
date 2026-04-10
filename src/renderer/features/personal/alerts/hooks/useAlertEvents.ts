/**
 * Alert IPC event listeners -> query invalidation
 */

import { useQueryClient } from '@tanstack/react-query';

import { ALERTS_EVENTS } from '@shared/ipc/misc/alerts.channels';

import { useIpcEvent } from '@renderer/shared/hooks';

import { alertKeys } from '../api/queryKeys';
import { useAlertStore } from '../store';

export function useAlertEvents() {
  const queryClient = useQueryClient();
  const addNotification = useAlertStore((s) => s.addNotification);

  useIpcEvent(ALERTS_EVENTS.ALERT.TRIGGERED, ({ alertId, message }) => {
    addNotification({ alertId, message });
    void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
  });

  useIpcEvent(ALERTS_EVENTS.ALERT.CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
  });
}
