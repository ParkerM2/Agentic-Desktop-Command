/**
 * Communications Store — UI state for integrations: tab navigation, Slack, Discord,
 * and notification rules.
 *
 * Notification rules are persisted to localStorage so they survive restarts.
 * Service connection status is ephemeral and re-established on mount.
 */

import { create } from 'zustand';

// ── Types ────────────────────────────────────────────────────

type ServiceStatus = 'connected' | 'disconnected' | 'error';

export type IntegrationsTab =
  | 'slack'
  | 'discord'
  | 'rules'
  | 'github'
  | 'calendar'
  | 'email'
  | 'notifications';

interface NotificationRule {
  id: string;
  service: 'slack' | 'discord';
  pattern: string;
  enabled: boolean;
}

interface IntegrationsState {
  // ── Page-level tab ──
  activeTab: IntegrationsTab;
  setActiveTab: (tab: IntegrationsTab) => void;

  // ── Communications (Slack / Discord) ──
  slackStatus: ServiceStatus;
  discordStatus: ServiceStatus;
  notificationRules: NotificationRule[];
  setSlackStatus: (status: ServiceStatus) => void;
  setDiscordStatus: (status: ServiceStatus) => void;
  addNotificationRule: (rule: Omit<NotificationRule, 'id'>) => void;
  removeNotificationRule: (id: string) => void;
  toggleNotificationRule: (id: string) => void;
}

// ── localStorage helpers ──────────────────────────────────────

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

// ── Store ────────────────────────────────────────────────────

export const useIntegrationsStore = create<IntegrationsState>((set) => ({
  // Page-level tab
  activeTab: 'slack',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Communications
  slackStatus: 'disconnected',
  discordStatus: 'disconnected',
  notificationRules: loadRules(),

  setSlackStatus: (status) => set({ slackStatus: status }),
  setDiscordStatus: (status) => set({ discordStatus: status }),

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
