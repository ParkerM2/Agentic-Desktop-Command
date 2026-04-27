/**
 * useRetentionControl — logic hook for RetentionControl
 */

import { useState } from 'react';

import type { DataStoreEntry, DataStoreUsage, RetentionPolicy } from '@shared/types/data-management';

export interface RetentionControlProps {
  entry: DataStoreEntry;
  retention?: RetentionPolicy;
  onUpdate: (policy: Partial<RetentionPolicy>) => void;
  onClear: () => void;
  usage?: DataStoreUsage;
  clearPending?: boolean;
}

export function useRetentionControl(props: RetentionControlProps) {
  const { entry, retention, onUpdate } = props;
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const isEnabled = retention?.enabled ?? entry.defaultRetention.enabled;
  const maxAgeDays = retention?.maxAgeDays ?? entry.defaultRetention.maxAgeDays;
  const maxItems = retention?.maxItems ?? entry.defaultRetention.maxItems;

  function handleToggle() {
    onUpdate({ enabled: !isEnabled });
  }

  function handleMaxAgeDaysChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    if (value >= 0) {
      onUpdate({ maxAgeDays: value > 0 ? value : undefined });
    }
  }

  function handleMaxItemsChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    if (value >= 0) {
      onUpdate({ maxItems: value > 0 ? value : undefined });
    }
  }

  function handleClearConfirm() {
    props.onClear();
    setConfirmClearOpen(false);
  }

  return {
    confirmClearOpen,
    setConfirmClearOpen,
    isEnabled,
    maxAgeDays,
    maxItems,
    handleToggle,
    handleMaxAgeDaysChange,
    handleMaxItemsChange,
    handleClearConfirm,
  };
}
