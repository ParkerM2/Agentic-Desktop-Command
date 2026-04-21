/**
 * useCreateAlertModal — all logic for CreateAlertModal
 */

import { useState } from 'react';

import { useDialogWithMutation } from '@renderer/shared/hooks/useDialogWithMutation';
import { useModalFormState } from '@renderer/shared/hooks/useModalFormState';

import { useCreateAlert } from '../../api/useAlerts';
import { useAlertStore } from '../../store';

interface ParsePreview {
  date: string;
  isRecurring: boolean;
  confidence: number;
}

type AlertType = 'reminder' | 'deadline' | 'notification' | 'recurring';

interface CreateAlertFormValues {
  message: string;
  timeInput: string;
  alertType: AlertType;
  manualDate: string;
  useManualDate: boolean;
}

const CREATE_ALERT_DEFAULTS: CreateAlertFormValues = {
  message: '',
  timeInput: '',
  alertType: 'reminder',
  manualDate: '',
  useManualDate: false,
};

export function useCreateAlertModal() {
  const showCreateModal = useAlertStore((s) => s.showCreateModal);
  const closeCreateModal = useAlertStore((s) => s.closeCreateModal);
  const createAlert = useCreateAlert();

  const { values, update, reset } = useModalFormState<CreateAlertFormValues>(
    showCreateModal,
    CREATE_ALERT_DEFAULTS,
  );

  const [parsePreview, setParsePreview] = useState<ParsePreview | null>(null);

  const { handleSubmit: submitMutation, isPending } = useDialogWithMutation(createAlert, {
    onClose: closeCreateModal,
    resetForm: () => {
      reset();
      setParsePreview(null);
    },
  });

  function handleTimeInputChange(value: string) {
    update('timeInput', value);
    if (value.trim().length === 0) {
      setParsePreview(null);
      return;
    }

    try {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        setParsePreview({
          date: date.toLocaleString(),
          isRecurring: false,
          confidence: 0.9,
        });
        return;
      }
    } catch {
      // Fall through to keyword check
    }

    const isRecurring = /^every\s/i.test(value);
    setParsePreview({
      date: 'Will be parsed on creation',
      isRecurring,
      confidence: 0.5,
    });
  }

  function handleSubmit() {
    if (values.message.trim().length === 0) return;

    let triggerAt: string;
    const type = values.alertType;

    if (values.useManualDate && values.manualDate.length > 0) {
      triggerAt = new Date(values.manualDate).toISOString();
    } else if (values.timeInput.trim().length > 0) {
      const directDate = new Date(values.timeInput);
      triggerAt = Number.isNaN(directDate.getTime())
        ? new Date(Date.now() + 3_600_000).toISOString()
        : directDate.toISOString();
    } else {
      triggerAt = new Date(Date.now() + 3_600_000).toISOString();
    }

    submitMutation({ type, message: values.message.trim(), triggerAt });
  }

  return {
    showCreateModal,
    closeCreateModal,
    message: values.message,
    setMessage: (v: string) => update('message', v),
    timeInput: values.timeInput,
    alertType: values.alertType,
    setAlertType: (v: AlertType) => update('alertType', v),
    parsePreview,
    manualDate: values.manualDate,
    setManualDate: (v: string) => update('manualDate', v),
    useManualDate: values.useManualDate,
    setUseManualDate: (v: boolean) => update('useManualDate', v),
    handleTimeInputChange,
    handleSubmit,
    isPending,
  };
}
