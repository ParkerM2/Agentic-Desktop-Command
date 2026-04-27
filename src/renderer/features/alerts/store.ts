/**
 * Alerts UI state store
 */

import { create } from 'zustand';

interface AlertNotification {
  alertId: string;
  message: string;
  receivedAt: number;
}

interface AlertUIState {
  showCreateModal: boolean;
  notifications: AlertNotification[];
  openCreateModal: () => void;
  closeCreateModal: () => void;
  addNotification: (notification: Omit<AlertNotification, 'receivedAt'>) => void;
  dismissNotification: (alertId: string) => void;
  clearNotifications: () => void;
}

export const useAlertStore = create<AlertUIState>()((set) => ({
  showCreateModal: false,
  notifications: [],

  openCreateModal: () => set({ showCreateModal: true }),
  closeCreateModal: () => set({ showCreateModal: false }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, { ...notification, receivedAt: Date.now() }],
    })),

  dismissNotification: (alertId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.alertId !== alertId),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
