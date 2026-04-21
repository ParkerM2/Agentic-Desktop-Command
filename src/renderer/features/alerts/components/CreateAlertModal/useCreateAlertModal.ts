/**
 * useCreateAlertModal — all logic for CreateAlertModal
 */

import { useState } from 'react';

import { useCreateAlert } from '../../api/useAlerts';
import { useAlertStore } from '../../store';

interface ParsePreview {
  date: string;
  isRecurring: boolean;
  confidence: number;
}

export function useCreateAlertModal() {
  const showCreateModal = useAlertStore((s) => s.showCreateModal);
  const closeCreateModal = useAlertStore((s) => s.closeCreateModal);
  const createAlert = useCreateAlert();

  const [message, setMessage] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [alertType, setAlertType] = useState<
    'reminder' | 'deadline' | 'notification' | 'recurring'
  >('reminder');
  const [parsePreview, setParsePreview] = useState<ParsePreview | null>(null);
  const [manualDate, setManualDate] = useState('');
  const [useManualDate, setUseManualDate] = useState(false);

  function handleTimeInputChange(value: string) {
    setTimeInput(value);
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
    if (message.trim().length === 0) return;

    let triggerAt: string;
    const type = alertType;

    if (useManualDate && manualDate.length > 0) {
      triggerAt = new Date(manualDate).toISOString();
    } else if (timeInput.trim().length > 0) {
      const directDate = new Date(timeInput);
      triggerAt = Number.isNaN(directDate.getTime())
        ? new Date(Date.now() + 3_600_000).toISOString()
        : directDate.toISOString();
    } else {
      triggerAt = new Date(Date.now() + 3_600_000).toISOString();
    }

    createAlert.mutate(
      { type, message: message.trim(), triggerAt },
      {
        onSuccess: () => {
          setMessage('');
          setTimeInput('');
          setManualDate('');
          setParsePreview(null);
          closeCreateModal();
        },
      },
    );
  }

  return {
    showCreateModal,
    closeCreateModal,
    message,
    setMessage,
    timeInput,
    alertType,
    setAlertType,
    parsePreview,
    manualDate,
    setManualDate,
    useManualDate,
    setUseManualDate,
    handleTimeInputChange,
    handleSubmit,
    isPending: createAlert.isPending,
  };
}
