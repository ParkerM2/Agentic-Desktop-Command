/**
 * AlertNotification — Toast-style notification for triggered alerts
 */

import { Bell, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button } from '@ui';

import { useDismissAlert } from '../api/useAlerts';
import { useAlertStore } from '../store';

export function AlertNotification() {
  const notifications = useAlertStore((s) => s.notifications);
  const dismissNotification = useAlertStore((s) => s.dismissNotification);
  const dismissAlert = useDismissAlert();

  if (notifications.length === 0) {
    return null;
  }

  function handleDismiss(alertId: string) {
    dismissNotification(alertId);
    dismissAlert.mutate(alertId);
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((notification) => (
        <div
          key={notification.alertId}
          className={cn(
            'bg-card border-border flex items-start gap-3 rounded-lg border p-4',
            'shadow-lg',
            'animate-in slide-in-from-right fade-in',
            'max-w-sm',
          )}
        >
          <Bell className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-foreground flex-1 text-sm">{notification.message}</p>
          <Button
            aria-label="Dismiss notification"
            className="h-6 w-6 shrink-0 p-0.5 text-muted-foreground"
            size="icon"
            variant="ghost"
            onClick={() => handleDismiss(notification.alertId)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
