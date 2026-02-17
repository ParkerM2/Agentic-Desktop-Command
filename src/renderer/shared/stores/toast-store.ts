/**
 * Toast Store — Global toast notification state
 *
 * Minimal Zustand store for mutation error toasts.
 * Auto-dismisses after 8s (errors) or 5s (success/warning). Max 3 visible toasts.
 */

import { create } from 'zustand';

const MAX_TOASTS = 3;
const AUTO_DISMISS_ERROR_MS = 8000;
const AUTO_DISMISS_DEFAULT_MS = 5000;

export type ToastType = 'error' | 'success' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
  onClick?: () => void;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, onClick?: () => void) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  addToast: (message, type, onClick) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    set((state) => {
      const updated = [
        ...state.toasts,
        { id, message, type, createdAt: Date.now(), onClick },
      ];
      // Keep only the most recent MAX_TOASTS
      if (updated.length > MAX_TOASTS) {
        return { toasts: updated.slice(updated.length - MAX_TOASTS) };
      }
      return { toasts: updated };
    });

    // Auto-dismiss: 8s for errors, 5s for success/warning
    const dismissMs = type === 'error' ? AUTO_DISMISS_ERROR_MS : AUTO_DISMISS_DEFAULT_MS;

    window.setTimeout(() => {
      const current = get().toasts;
      if (current.some((t) => t.id === id)) {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }
    }, dismissMs);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
