/**
 * useAlertEditDialog — all logic for AlertEditDialog
 */

import { useEffect, useState } from 'react';

import type { Alert, RecurringConfig } from '@shared/types';

import { useUpdateAlert } from '../../api/useAlertMutations';

function toDatetimeLocalValue(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return '';
  }
}

interface UseAlertEditDialogParams {
  alert: Alert | null;
  onClose: () => void;
}

export function useAlertEditDialog({ alert, onClose }: UseAlertEditDialogParams) {
  const updateAlert = useUpdateAlert();

  const [message, setMessage] = useState('');
  const [triggerAt, setTriggerAt] = useState('');
  const [enableRecurring, setEnableRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<
    'daily' | 'weekly' | 'monthly'
  >('daily');
  const [recurringTime, setRecurringTime] = useState('09:00');

  useEffect(() => {
    if (alert === null) return;
    setMessage(alert.message);
    setTriggerAt(toDatetimeLocalValue(alert.triggerAt));
    if (alert.recurring === undefined) {
      setEnableRecurring(false);
      setRecurringFrequency('daily');
      setRecurringTime('09:00');
    } else {
      setEnableRecurring(true);
      setRecurringFrequency(alert.recurring.frequency);
      setRecurringTime(alert.recurring.time);
    }
  }, [alert]);

  const isOpen = alert !== null;

  function handleSubmit() {
    if (alert === null) return;
    const trimmed = message.trim();
    if (trimmed.length === 0) return;

    const recurring: RecurringConfig | null = enableRecurring
      ? { frequency: recurringFrequency, time: recurringTime }
      : null;

    const updatedMessage = trimmed === alert.message ? undefined : trimmed;
    const updatedTriggerAt =
      triggerAt.length > 0 ? new Date(triggerAt).toISOString() : undefined;

    updateAlert.mutate(
      {
        id: alert.id,
        message: updatedMessage,
        triggerAt: updatedTriggerAt,
        recurring,
        linkedTo: alert.linkedTo,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  }

  function handleOpenChange(open: boolean) {
    if (open) return;
    onClose();
  }

  return {
    isOpen,
    message,
    setMessage,
    triggerAt,
    setTriggerAt,
    enableRecurring,
    setEnableRecurring,
    recurringFrequency,
    setRecurringFrequency,
    recurringTime,
    setRecurringTime,
    handleSubmit,
    handleOpenChange,
    isPending: updateAlert.isPending,
    linkedTo: isOpen ? alert.linkedTo : undefined,
  };
}
