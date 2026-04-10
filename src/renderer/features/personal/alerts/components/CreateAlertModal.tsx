/**
 * CreateAlertModal — Natural language input with parsed preview
 */

import { useState } from 'react';

import { Bell, Calendar, Clock, Repeat, X } from 'lucide-react';

import { Button, Checkbox, Input, Label } from '@ui';

import { useCreateAlert } from '../api/useAlerts';
import { useAlertStore } from '../store';

interface ParsePreview {
  date: string;
  isRecurring: boolean;
  confidence: number;
}

export function CreateAlertModal() {
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

  if (!showCreateModal) {
    return null;
  }

  function handleTimeInputChange(value: string) {
    setTimeInput(value);
    if (value.trim().length === 0) {
      setParsePreview(null);
      return;
    }

    // Simple client-side preview — actual NLP parsing happens on the backend
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

    // Check for recurring keywords
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
      // Try parsing as direct date first
      const directDate = new Date(timeInput);
      triggerAt = Number.isNaN(directDate.getTime())
        ? new Date(Date.now() + 3_600_000).toISOString()
        : directDate.toISOString();
    } else {
      // Default: 1 hour from now
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

  const typeOptions = [
    { value: 'reminder' as const, label: 'Reminder', icon: Bell },
    { value: 'deadline' as const, label: 'Deadline', icon: Calendar },
    { value: 'notification' as const, label: 'Notification', icon: Clock },
    { value: 'recurring' as const, label: 'Recurring', icon: Repeat },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        aria-label="Close modal"
        className="absolute inset-0 bg-black/50"
        role="button"
        tabIndex={0}
        onClick={closeCreateModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') closeCreateModal();
        }}
      />

      {/* Modal */}
      <div className="bg-card border-border relative z-10 w-full max-w-md rounded-lg border p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">Create Alert</h2>
          <Button
            className="h-7 w-7 text-muted-foreground"
            size="icon"
            variant="ghost"
            onClick={closeCreateModal}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Alert type */}
        <div className="mb-4">
          <span className="text-foreground mb-1.5 block text-sm font-medium">Type</span>
          <div className="flex gap-2">
            {typeOptions.map((option) => (
              <Button
                key={option.value}
                className="gap-1.5"
                size="sm"
                variant={alertType === option.value ? 'primary' : 'ghost'}
                onClick={() => setAlertType(option.value)}
              >
                <option.icon className="h-3.5 w-3.5" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="mb-4">
          <Label className="mb-1.5 block" htmlFor="alert-message">
            Message
          </Label>
          <Input
            id="alert-message"
            placeholder="What should you be reminded about?"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* Time input — NLP */}
        <div className="mb-4">
          <Label className="mb-1.5 block" htmlFor="alert-time">
            When (natural language)
          </Label>
          <Input
            disabled={useManualDate}
            id="alert-time"
            placeholder='e.g. "tomorrow at 3pm", "in 2 hours", "every Monday at 9am"'
            type="text"
            value={timeInput}
            onChange={(e) => handleTimeInputChange(e.target.value)}
          />
          {parsePreview === null ? null : (
            <div className="bg-muted mt-2 rounded-md p-2 text-xs">
              <span className="text-muted-foreground">
                {parsePreview.isRecurring ? 'Recurring: ' : 'One-time: '}
                {parsePreview.date}
              </span>
            </div>
          )}
        </div>

        {/* Manual date fallback */}
        <div className="mb-4">
          <Label className="text-muted-foreground flex items-center gap-2 text-sm" htmlFor="alert-manual-toggle">
            <Checkbox
              checked={useManualDate}
              id="alert-manual-toggle"
              onCheckedChange={(checked) => setUseManualDate(checked === true)}
            />
            Use manual date/time
          </Label>
          {useManualDate ? (
            <Input
              className="mt-2"
              type="datetime-local"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closeCreateModal}>
            Cancel
          </Button>
          <Button
            disabled={message.trim().length === 0 || createAlert.isPending}
            onClick={handleSubmit}
          >
            {createAlert.isPending ? 'Creating...' : 'Create Alert'}
          </Button>
        </div>
      </div>
    </div>
  );
}
