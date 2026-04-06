/**
 * AlertsPage — List of all alerts with management controls
 */

import { Bell, Check, Clock, Plus, Repeat, Trash2 } from 'lucide-react';

import type { Alert } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

import { Button, EmptyState, PageContent, PageHeader, PageLayout } from '@ui';

import { useAlerts, useDeleteAlert, useDismissAlert } from '../api/useAlerts';
import { useAlertEvents } from '../hooks/useAlertEvents';
import { useAlertStore } from '../store';

import { CreateAlertModal } from './CreateAlertModal';
import { RecurringAlerts } from './RecurringAlerts';

type TabId = 'active' | 'dismissed' | 'recurring';

function getAlertIcon(type: Alert['type']) {
  switch (type) {
    case 'reminder': {
      return Bell;
    }
    case 'deadline': {
      return Clock;
    }
    case 'recurring': {
      return Repeat;
    }
    case 'notification': {
      return Bell;
    }
  }
}

function formatTriggerTime(triggerAt: string): string {
  const date = new Date(triggerAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return 'Overdue';
  if (diffMs < 3_600_000) return `In ${String(Math.round(diffMs / 60_000))} min`;
  if (diffMs < 86_400_000) return `In ${String(Math.round(diffMs / 3_600_000))} hours`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AlertsPage() {
  useAlertEvents();

  const { data: alerts = [], isLoading } = useAlerts(true);
  const dismissAlert = useDismissAlert();
  const deleteAlert = useDeleteAlert();
  const openCreateModal = useAlertStore((s) => s.openCreateModal);

  const activeAlerts = alerts.filter((a) => !a.dismissed);
  const dismissedAlerts = alerts.filter((a) => a.dismissed);

  const tabs: Array<{ id: TabId; label: string; count: number }> = [
    { id: 'active', label: 'Active', count: activeAlerts.length },
    { id: 'dismissed', label: 'Dismissed', count: dismissedAlerts.length },
    {
      id: 'recurring',
      label: 'Recurring',
      count: alerts.filter((a) => a.recurring !== undefined).length,
    },
  ];

  function renderAlertList(alertList: Alert[]) {
    if (alertList.length === 0) {
      return (
        <EmptyState
          icon={Bell}
          size="md"
          title="No alerts"
        />
      );
    }

    return (
      <div className="space-y-2">
        {alertList.map((alert) => {
          const Icon = getAlertIcon(alert.type);
          const isOverdue = new Date(alert.triggerAt) <= new Date() && !alert.dismissed;

          return (
            <div
              key={alert.id}
              className={cn(
                'bg-card border-border flex items-start gap-3 rounded-lg border p-4',
                isOverdue && 'border-destructive/50',
                alert.dismissed && 'opacity-60',
              )}
            >
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  isOverdue ? 'text-destructive' : 'text-primary',
                )}
              />

              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium">{alert.message}</p>
                <p
                  className={cn(
                    'text-xs',
                    isOverdue ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {formatTriggerTime(alert.triggerAt)}
                  {alert.recurring === undefined ? '' : ' (recurring)'}
                </p>
              </div>

              <div className="flex shrink-0 gap-1">
                {alert.dismissed ? null : (
                  <Button
                    className="h-7 w-7 p-1 text-muted-foreground hover:text-success"
                    size="icon"
                    title="Dismiss"
                    variant="ghost"
                    onClick={() => dismissAlert.mutate(alert.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  className="h-7 w-7 p-1 text-muted-foreground hover:text-destructive"
                  size="icon"
                  title="Delete"
                  variant="ghost"
                  onClick={() => deleteAlert.mutate(alert.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <PageLayout>
      <PageHeader>
        <PageHeader.Row>
          <PageHeader.Title description="Manage reminders, deadlines, and notifications">
            Alerts
          </PageHeader.Title>
          <PageHeader.Actions>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              New Alert
            </Button>
          </PageHeader.Actions>
        </PageHeader.Row>
        <PageHeader.Tabs defaultValue="active">
          <PageHeader.TabList>
            {tabs.map((tab) => (
              <PageHeader.Tab key={tab.id} value={tab.id}>
                {tab.label}
                {tab.count > 0 ? (
                  <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs">
                    {tab.count}
                  </span>
                ) : null}
              </PageHeader.Tab>
            ))}
          </PageHeader.TabList>

          <PageContent>
            {isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
                Loading alerts...
              </div>
            ) : (
              <>
                <PageHeader.TabContent value="active">{renderAlertList(activeAlerts)}</PageHeader.TabContent>
                <PageHeader.TabContent value="dismissed">{renderAlertList(dismissedAlerts)}</PageHeader.TabContent>
                <PageHeader.TabContent value="recurring">
                  <RecurringAlerts alerts={alerts} />
                </PageHeader.TabContent>
              </>
            )}
          </PageContent>
        </PageHeader.Tabs>
      </PageHeader>

      <CreateAlertModal />
    </PageLayout>
  );
}
