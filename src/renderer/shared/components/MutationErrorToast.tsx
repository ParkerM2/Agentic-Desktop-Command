/**
 * MutationErrorToast — Toast notification for errors, warnings, and success
 *
 * Renders toasts from the shared toast store with type-specific icons and colors.
 * Supports clickable toasts via the onClick callback.
 * Positioned fixed bottom-right. Auto-dismisses via the store.
 */

import { AlertTriangle, CheckCircle, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';
import type { ToastType } from '@renderer/shared/stores/toast-store';
import { useToastStore } from '@renderer/shared/stores/toast-store';

// -- Helpers --

interface ToastConfig {
  iconClass: string;
  borderClass: string;
  bgClass: string;
}

const TOAST_CONFIG: Record<ToastType, ToastConfig> = {
  error: {
    iconClass: 'text-destructive',
    borderClass: 'border-destructive/30',
    bgClass: 'bg-destructive/5',
  },
  warning: {
    iconClass: 'text-warning',
    borderClass: 'border-warning/30',
    bgClass: 'bg-warning/5',
  },
  success: {
    iconClass: 'text-success',
    borderClass: 'border-success/30',
    bgClass: 'bg-success/5',
  },
};

function ToastIcon({
  className,
  type,
}: {
  type: ToastType;
  className: string;
}) {
  if (type === 'success') {
    return <CheckCircle aria-hidden="true" className={className} />;
  }
  return <AlertTriangle aria-hidden="true" className={className} />;
}

// -- Component --

export function MutationErrorToast() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Notifications"
      aria-live="assertive"
      className="fixed right-4 bottom-16 z-50 flex flex-col gap-2"
      role="alert"
    >
      {toasts.map((toast) => {
        const config = TOAST_CONFIG[toast.type];
        const isClickable = toast.onClick !== undefined;

        return (
          <div
            key={toast.id}
            className={cn(
              'flex max-w-sm items-start gap-3 rounded-lg border p-3 shadow-lg',
              'bg-card text-foreground',
              config.borderClass,
              config.bgClass,
              isClickable && 'cursor-pointer hover:brightness-95',
            )}
            {...(isClickable
              ? {
                  role: 'button' as const,
                  tabIndex: 0,
                  onClick: toast.onClick,
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      toast.onClick?.();
                    }
                  },
                }
              : {})}
          >
            <ToastIcon
              className={cn('mt-0.5 h-4 w-4 shrink-0', config.iconClass)}
              type={toast.type}
            />
            <p className="min-w-0 flex-1 text-sm">{toast.message}</p>
            <button
              aria-label="Dismiss notification"
              className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
