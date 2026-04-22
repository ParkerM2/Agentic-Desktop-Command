/**
 * useAlertNotification — all logic for AlertNotification
 */

import { useDismissAlert } from '../../api/useAlerts';
import { useAlertStore } from '../../store';

interface AlertNotificationItem {
  alertId: string;
  message: string;
  receivedAt: number;
}

export function useAlertNotification(): {
  notifications: AlertNotificationItem[];
  handleDismiss: (alertId: string) => void;
} {
  const notifications = useAlertStore((s) => s.notifications);
  const dismissNotification = useAlertStore((s) => s.dismissNotification);
  const dismissAlert = useDismissAlert();

  function handleDismiss(alertId: string) {
    dismissNotification(alertId);
    dismissAlert.mutate(alertId);
  }

  return {
    notifications,
    handleDismiss,
  };
}
