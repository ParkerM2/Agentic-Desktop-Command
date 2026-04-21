/**
 * useRecurringAlerts — all logic for RecurringAlerts
 */

import type { Alert } from '@shared/types';

import { useDeleteAlert } from '../../api/useAlerts';

interface UseRecurringAlertsParams {
  alerts: Alert[];
}

export function useRecurringAlerts({ alerts }: UseRecurringAlertsParams) {
  const deleteAlert = useDeleteAlert();

  const recurringAlerts = alerts.filter(
    (a) => a.type === 'recurring' || a.recurring !== undefined,
  );

  return {
    recurringAlerts,
    deleteAlert,
  };
}
