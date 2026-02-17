/**
 * Briefing Cache — Daily briefing storage (check/store/invalidate)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import type { DailyBriefing } from '@shared/types';

interface BriefingsStore {
  briefings: DailyBriefing[];
}

const MAX_STORED_BRIEFINGS = 30;

export interface BriefingCache {
  /** Get today's cached briefing, or null */
  getTodayBriefing: () => DailyBriefing | null;
  /** Store a briefing (replaces same-day, keeps last 30 days) */
  storeBriefing: (briefing: DailyBriefing) => void;
}

/**
 * Create a briefing cache backed by a JSON file.
 */
export function createBriefingCache(briefingPath: string): BriefingCache {
  function loadBriefings(): BriefingsStore {
    if (!existsSync(briefingPath)) {
      return { briefings: [] };
    }
    try {
      const content = readFileSync(briefingPath, 'utf-8');
      return JSON.parse(content) as BriefingsStore;
    } catch {
      return { briefings: [] };
    }
  }

  function saveBriefings(store: BriefingsStore): void {
    writeFileSync(briefingPath, JSON.stringify(store, null, 2));
  }

  function getTodayDate(): string {
    return new Date().toISOString().split('T')[0] ?? '';
  }

  return {
    getTodayBriefing() {
      const store = loadBriefings();
      const today = getTodayDate();
      return store.briefings.find((b) => b.date === today) ?? null;
    },

    storeBriefing(briefing) {
      const store = loadBriefings();
      // Remove old briefings for the same day
      store.briefings = store.briefings.filter((b) => b.date !== briefing.date);
      store.briefings.push(briefing);
      // Keep only last N days of briefings
      store.briefings = store.briefings.slice(-MAX_STORED_BRIEFINGS);
      saveBriefings(store);
    },
  };
}
