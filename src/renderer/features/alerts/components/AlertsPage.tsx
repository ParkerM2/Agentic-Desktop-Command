/**
 * AlertsPage — List of all alerts with management controls
 */

import { useState } from 'react';

import { Bell, Check, Clock, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';

import type { Alert } from '@shared/types';

import { RelativeTime } from '@renderer/shared/components/RelativeTime';
import { useDebounce } from '@renderer/shared/hooks/useDebounce';
import { cn } from '@renderer/shared/lib/utils';

import {
  Badge,
  Button,
  EmptyState,
  PageContent,
  PageHeader,
  PageLayout,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@ui';

import { useAlerts, useDeleteAlert, useDismissAlert } from '../api/useAlerts';
import { useAlertEvents } from '../hooks/useAlertEvents';
import { useAlertStore } from '../store';

import { AlertEditDialog } from './AlertEditDialog';
import { CreateAlertModal } from './CreateAlertModal';
import { RecurringAlerts } from './RecurringAlerts';

type TabId = 'active' | 'dismissed' | 'recurring';
type SortField = 'triggerAt' | 'createdAt';
type AlertTypeFilter = 'all' | Alert['type'];

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

function applyFilters(
  alertList: Alert[],
  searchQuery: string,
  typeFilter: AlertTypeFilter,
  sortField: SortField,
): Alert[] {
  let result = alertList;

  if (searchQuery.length > 0) {
    const lower = searchQuery.toLowerCase();
    result = result.filter((a) => a.message.toLowerCase().includes(lower));
  }

  if (typeFilter !== 'all') {
    result = result.filter((a) => a.type === typeFilter);
  }

  return [...result].sort((a, b) => {
    const aVal = new Date(a[sortField]).getTime();
    const bVal = new Date(b[sortField]).getTime();
    return aVal - bVal;
  });
}

export function AlertsPage() {
  useAlertEvents();

  const { data: alerts = [], isLoading } = useAlerts(true);
  const dismissAlert = useDismissAlert();
  const deleteAlert = useDeleteAlert();
  const openCreateModal = useAlertStore((s) => s.openCreateModal);

  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState<SortField>('triggerAt');
  const [typeFilter, setTypeFilter] = useState<AlertTypeFilter>('all');

  const debouncedSearch = useDebounce(searchText, 250);

  const activeAlerts = alerts.filter((a) => !a.dismissed);
  const dismissedAlerts = alerts.filter((a) => a.dismissed);

  const filteredActive = applyFilters(activeAlerts, debouncedSearch, typeFilter, sortField);
  const filteredDismissed = applyFilters(dismissedAlerts, debouncedSearch, typeFilter, sortField);

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
                <Text className="text-foreground font-medium" size="sm">{alert.message}</Text>
                <Text
                  className={cn(
                    'text-xs',
                    isOverdue ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {formatTriggerTime(alert.triggerAt)}
                  {alert.recurring === undefined ? '' : ' (recurring)'}
                </Text>
                <RelativeTime value={alert.createdAt} />
                {alert.linkedTo === undefined ? null : (
                  <Badge className="mt-1 text-xs" variant="outline">
                    {alert.linkedTo.type}
                  </Badge>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <Button
                  aria-label="Edit alert"
                  className="h-7 w-7 p-1 text-muted-foreground hover:text-foreground"
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingAlert(alert)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {alert.dismissed ? null : (
                  <Button
                    aria-label="Dismiss alert"
                    className="h-7 w-7 p-1 text-muted-foreground hover:text-success"
                    size="icon"
                    variant="ghost"
                    onClick={() => dismissAlert.mutate(alert.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  aria-label="Delete alert"
                  className="h-7 w-7 p-1 text-muted-foreground hover:text-destructive"
                  size="icon"
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
      <PageHeader.Tabs defaultValue="active">
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
        </PageHeader>

        {/* Filter toolbar */}
        <div className="border-border flex items-center gap-3 border-b px-4 py-3">
          <SearchInput
            aria-label="Search alerts"
            className="flex-1"
            placeholder="Search alerts..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onClear={() => setSearchText('')}
          />

          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as AlertTypeFilter)}
          >
            <SelectTrigger aria-label="Filter by type" className="w-36">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="notification">Notification</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortField}
            onValueChange={(v) => setSortField(v as SortField)}
          >
            <SelectTrigger aria-label="Sort by" className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="triggerAt">Trigger time</SelectItem>
              <SelectItem value="createdAt">Created time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PageContent>
          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
              Loading alerts...
            </div>
          ) : (
            <>
              <PageHeader.TabContent value="active">{renderAlertList(filteredActive)}</PageHeader.TabContent>
              <PageHeader.TabContent value="dismissed">{renderAlertList(filteredDismissed)}</PageHeader.TabContent>
              <PageHeader.TabContent value="recurring">
                <RecurringAlerts alerts={alerts} />
              </PageHeader.TabContent>
            </>
          )}
        </PageContent>
      </PageHeader.Tabs>

      <CreateAlertModal />
      <AlertEditDialog
        alert={editingAlert}
        onClose={() => setEditingAlert(null)}
      />
    </PageLayout>
  );
}
