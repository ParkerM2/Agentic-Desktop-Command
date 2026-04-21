/**
 * ConfirmDialog — Reusable confirmation dialog for destructive actions.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={isOpen}
 *     title="Delete Task"
 *     description="This action cannot be undone."
 *     variant="destructive"
 *     onConfirm={handleDelete}
 *     onOpenChange={setIsOpen}
 *   />
 */

import { useEffect } from 'react';

import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from '@ui';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
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

  if (!open) {
    return null;
  }

  function handleClose() {
    onOpenChange(false);
  }

  function handleConfirm() {
    onConfirm();
  }

  const isDestructive = variant === 'destructive';

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
      <div className="bg-card border-border relative z-10 w-full max-w-md rounded-lg border shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6">
          {isDestructive ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="text-destructive h-5 w-5" />
            </div>
          ) : null}
          <h2 className="text-foreground text-lg font-semibold">{title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 pt-3 pb-6">
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

        {/* Footer */}
        <div className="border-border flex justify-end gap-2 border-t px-6 py-4">
          <Button
            disabled={loading}
            variant="outline"
            onClick={handleClose}
          >
            {cancelLabel}
          </Button>
          <Button
            disabled={loading}
            variant={isDestructive ? 'destructive' : 'primary'}
            onClick={handleConfirm}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                {confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
