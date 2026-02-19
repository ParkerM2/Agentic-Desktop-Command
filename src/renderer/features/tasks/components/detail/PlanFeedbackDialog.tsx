/**
 * PlanFeedbackDialog — Dialog with textarea for providing feedback when requesting
 * changes to an agent plan. Used by PlanViewer for the "Request Changes" action.
 */

import { useEffect, useRef, useState } from 'react';

import { MessageSquare } from 'lucide-react';

import { Button, Spinner, Textarea } from '@ui';

interface PlanFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: string) => void;
  loading?: boolean;
}

export function PlanFeedbackDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: PlanFeedbackDialogProps) {
  const [feedback, setFeedback] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Escape key closes the dialog
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  // Focus textarea when dialog opens and reset feedback
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (open) {
      setFeedback('');
      // Delay focus to ensure the DOM has rendered
      timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit() {
    const trimmed = feedback.trim();
    if (trimmed.length > 0) {
      onSubmit(trimmed);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        role="button"
        tabIndex={0}
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClose();
        }}
      />

      {/* Modal */}
      <div className="bg-card border-border relative z-10 w-full max-w-lg rounded-lg border shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <MessageSquare className="text-warning h-5 w-5" />
          </div>
          <div>
            <h2 className="text-foreground text-lg font-semibold">Request Changes</h2>
            <p className="text-muted-foreground text-sm">
              Describe what changes you&apos;d like to see in the plan.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pt-4 pb-6">
          <Textarea
            ref={textareaRef}
            disabled={loading}
            placeholder="e.g., Add error handling for the API calls, use a different approach for..."
            resize="none"
            rows={5}
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <p className="text-muted-foreground mt-1.5 text-xs">
            Press Ctrl+Enter to submit
          </p>
        </div>

        {/* Footer */}
        <div className="border-border flex justify-end gap-2 border-t px-6 py-4">
          <Button
            disabled={loading}
            variant="ghost"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            disabled={loading || feedback.trim().length === 0}
            variant="primary"
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
