/**
 * AlertsPage — List of all alerts with management controls
 */

import { useState } from 'react';

import { Bell, Check, Clock, Plus, Repeat, Trash2 } from 'lucide-react';

import type { Alert } from '@shared/types';

import { cn } from '@renderer/shared/lib/utils';

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
  const [activeTab, setActiveTab] = useState<TabId>('active');

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
        <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-sm">
          <Bell className="mb-2 h-8 w-8 opacity-50" />
          <p>No alerts</p>
        </div>
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
                  <button
                    className="text-muted-foreground hover:text-success rounded-md p-1 transition-colors"
                    title="Dismiss"
                    onClick={() => dismissAlert.mutate(alert.id)}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  className="text-muted-foreground hover:text-destructive rounded-md p-1 transition-colors"
                  title="Delete"
                  onClick={() => deleteAlert.mutate(alert.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-foreground text-xl font-semibold">Alerts</h1>
          <p className="text-muted-foreground text-sm">
            Manage reminders, deadlines, and notifications
          </p>
        </div>
        <button
          className={cn(
            'bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
            'transition-opacity hover:opacity-90',
          )}
          onClick={openCreateModal}
        >
          <Plus className="h-4 w-4" />
          New Alert
        </button>
      </div>

      {/* Tabs */}
      <div className="border-border flex gap-0 border-b px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              'relative px-4 py-3 text-sm transition-colors',
              activeTab === tab.id
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count > 0 ? (
              <span className="bg-muted text-muted-foreground ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs">
                {tab.count}
              </span>
            ) : null}
            {activeTab === tab.id ? (
              <span className="bg-primary absolute inset-x-0 -bottom-px h-0.5" />
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
            Loading alerts...
          </div>
        ) : (
          <>
            {activeTab === 'active' ? renderAlertList(activeAlerts) : null}
            {activeTab === 'dismissed' ? renderAlertList(dismissedAlerts) : null}
            {activeTab === 'recurring' ? <RecurringAlerts alerts={alerts} /> : null}
          </>
        )}
      </div>

      <CreateAlertModal />
    </div>
  );
}
