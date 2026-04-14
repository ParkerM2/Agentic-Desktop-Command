/**
 * localStorage helpers for notification rules persistence.
 */

interface NotificationRule {
  id: string;
  service: 'slack' | 'discord';
  pattern: string;
  enabled: boolean;
}

export const RULES_STORAGE_KEY = 'adc:notification-rules';

export function loadRules(): NotificationRule[] {
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

export function saveRules(rules: NotificationRule[]): void {
  localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
}
