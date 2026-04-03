/**
 * Communications Store — UI state for the communications feature.
 * Notification rules are persisted to localStorage so they survive restarts.
 * Service connection status is ephemeral and re-established on mount.
 */

import { create } from 'zustand';

type ServiceStatus = 'connected' | 'disconnected' | 'error';

interface NotificationRule {
  id: string;
  service: 'slack' | 'discord';
  pattern: string;
  enabled: boolean;
}

interface CommunicationsState {
  slackStatus: ServiceStatus;
  discordStatus: ServiceStatus;
  notificationRules: NotificationRule[];
  activeTab: 'overview' | 'slack' | 'discord' | 'rules';
  setSlackStatus: (status: ServiceStatus) => void;
  setDiscordStatus: (status: ServiceStatus) => void;
  setActiveTab: (tab: CommunicationsState['activeTab']) => void;
  addNotificationRule: (rule: Omit<NotificationRule, 'id'>) => void;
  removeNotificationRule: (id: string) => void;
  toggleNotificationRule: (id: string) => void;
}

const RULES_STORAGE_KEY = 'adc:notification-rules';

function loadRules(): NotificationRule[] {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is NotificationRule =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).service === 'string' &&
        typeof (item as Record<string, unknown>).pattern === 'string' &&
        typeof (item as Record<string, unknown>).enabled === 'boolean',
    );
  } catch {
    return [];
  }
}

function saveRules(rules: NotificationRule[]): void {
  localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
}

export const useCommunicationsStore = create<CommunicationsState>((set) => ({
  slackStatus: 'disconnected',
  discordStatus: 'disconnected',
  notificationRules: loadRules(),
  activeTab: 'overview',

  setSlackStatus: (status) => set({ slackStatus: status }),

  setDiscordStatus: (status) => set({ discordStatus: status }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  addNotificationRule: (rule) =>
    set((state) => {
      const next = [...state.notificationRules, { ...rule, id: crypto.randomUUID() }];
      saveRules(next);
      return { notificationRules: next };
    }),

  removeNotificationRule: (id) =>
    set((state) => {
      const next = state.notificationRules.filter((r) => r.id !== id);
      saveRules(next);
      return { notificationRules: next };
    }),

  toggleNotificationRule: (id) =>
    set((state) => {
      const next = state.notificationRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r,
      );
      saveRules(next);
      return { notificationRules: next };
    }),
}));
