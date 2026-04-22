/**
 * useAlertEditDialog — all logic for AlertEditDialog
 */

import type { Alert, RecurringConfig } from '@shared/types';

import { useDialogWithMutation } from '@renderer/shared/hooks/useDialogWithMutation';
import { useModalFormState } from '@renderer/shared/hooks/useModalFormState';

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

interface AlertFormValues {
  message: string;
  triggerAt: string;
  enableRecurring: boolean;
  recurringFrequency: 'daily' | 'weekly' | 'monthly';
  recurringTime: string;
}

const ALERT_FORM_DEFAULTS: AlertFormValues = {
  message: '',
  triggerAt: '',
  enableRecurring: false,
  recurringFrequency: 'daily',
  recurringTime: '09:00',
};

interface UseAlertEditDialogParams {
  alert: Alert | null;
  onClose: () => void;
}

export function useAlertEditDialog({ alert, onClose }: UseAlertEditDialogParams) {
  const updateAlert = useUpdateAlert();
  const isOpen = alert !== null;

  const entityValues: Partial<AlertFormValues> | undefined = alert
    ? {
        message: alert.message,
        triggerAt: toDatetimeLocalValue(alert.triggerAt),
        enableRecurring: alert.recurring !== undefined,
        recurringFrequency: alert.recurring?.frequency ?? 'daily',
        recurringTime: alert.recurring?.time ?? '09:00',
      }
    : undefined;

  const { values, update } = useModalFormState<AlertFormValues>(
    isOpen,
    ALERT_FORM_DEFAULTS,
    entityValues,
  );

  const { handleSubmit: submitMutation, isPending } = useDialogWithMutation(updateAlert, {
    onClose,
  });

  function handleSubmit() {
    if (alert === null) return;
    const trimmed = values.message.trim();
    if (trimmed.length === 0) return;

    const recurring: RecurringConfig | null = values.enableRecurring
      ? { frequency: values.recurringFrequency, time: values.recurringTime }
      : null;

    const updatedMessage = trimmed === alert.message ? undefined : trimmed;
    const updatedTriggerAt =
      values.triggerAt.length > 0 ? new Date(values.triggerAt).toISOString() : undefined;

    submitMutation({
      id: alert.id,
      message: updatedMessage,
      triggerAt: updatedTriggerAt,
      recurring,
      linkedTo: alert.linkedTo,
    });
  }

  function handleOpenChange(open: boolean) {
    if (open) return;
    onClose();
  }

  return {
    isOpen,
    message: values.message,
    setMessage: (v: string) => update('message', v),
    triggerAt: values.triggerAt,
    setTriggerAt: (v: string) => update('triggerAt', v),
    enableRecurring: values.enableRecurring,
    setEnableRecurring: (v: boolean) => update('enableRecurring', v),
    recurringFrequency: values.recurringFrequency,
    setRecurringFrequency: (v: 'daily' | 'weekly' | 'monthly') =>
      update('recurringFrequency', v),
    recurringTime: values.recurringTime,
    setRecurringTime: (v: string) => update('recurringTime', v),
    handleSubmit,
    handleOpenChange,
    isPending,
    linkedTo: isOpen ? alert.linkedTo : undefined,
  };
}
