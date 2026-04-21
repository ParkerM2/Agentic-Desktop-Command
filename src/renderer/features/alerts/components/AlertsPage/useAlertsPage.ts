/**
 * useAlertsPage — all logic for AlertsPage
 */

import { useState } from 'react';

import type { Alert } from '@shared/types';

import { useDebounce } from '@renderer/shared/hooks/useDebounce';

import { useAlerts, useDeleteAlert, useDismissAlert } from '../../api/useAlerts';
import { useAlertEvents } from '../../hooks/useAlertEvents';
import { useAlertStore } from '../../store';

export type TabId = 'active' | 'dismissed' | 'recurring';
export type SortField = 'triggerAt' | 'createdAt';
export type AlertTypeFilter = 'all' | Alert['type'];

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

export function useAlertsPage() {
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

  return {
    alerts,
    isLoading,
    dismissAlert,
    deleteAlert,
    openCreateModal,
    editingAlert,
    setEditingAlert,
    searchText,
    setSearchText,
    sortField,
    setSortField,
    typeFilter,
    setTypeFilter,
    filteredActive,
    filteredDismissed,
    tabs,
  };
}
