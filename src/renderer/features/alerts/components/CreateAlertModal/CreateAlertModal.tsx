/**
 * CreateAlertModal — Natural language input with parsed preview
 */

import { Bell, Calendar, Clock, Repeat, X } from 'lucide-react';

import { Button, Checkbox, Heading, Input, Label } from '@ui';

import { useCreateAlertModal } from './useCreateAlertModal';

export function CreateAlertModal() {
  const {
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
    isPending,
  } = useCreateAlertModal();

  if (!showCreateModal) {
    return null;
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
          <Heading as="h2" className="text-lg">Create Alert</Heading>
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
            disabled={message.trim().length === 0 || isPending}
            onClick={handleSubmit}
          >
            {isPending ? 'Creating...' : 'Create Alert'}
          </Button>
        </div>
      </div>
    </div>
  );
}
