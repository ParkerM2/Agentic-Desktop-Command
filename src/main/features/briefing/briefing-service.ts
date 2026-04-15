/**
 * Briefing Service — Orchestrator for daily briefing generation
 *
 * Delegates to focused modules:
 * - briefing-config.ts — Config loading/saving (SQLite-backed)
 * - briefing-cache.ts — Daily cache (SQLite-backed)
 * - briefing-generator.ts — Data gathering + summary generation
 */

import { BRIEFING_EVENTS } from '@shared/ipc/briefing/channels';
import type { BriefingConfig, DailyBriefing, Suggestion } from '@shared/types';


import type { ReinitializableService } from '@main/features/settings/data-management';

import { createBriefingCache } from './briefing-cache';
import { createBriefingConfigManager } from './briefing-config';
import { createBriefingGenerator } from './briefing-generator';

import type { SuggestionEngine } from './suggestion-engine';
import type { BusSessionManager } from '../../bus/session-manager';
import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';
import type { ClaudeClient } from '../claude/claude-client';
import type { NotificationManager } from '../integrations/notifications';
import type { ProgressService } from '../progress/progress-service';
import type { ProjectService } from '../projects/project-service';

const BRIEFING_READY_EVENT = BRIEFING_EVENTS.BRIEFING.READY;

/** Briefing service interface */
export interface BriefingService extends ReinitializableService {
  /** Get the current daily briefing (cached for the day) */
  getDailyBriefing: () => DailyBriefing | null;
  /** Generate a new daily briefing */
  generateBriefing: () => Promise<DailyBriefing>;
  /** Get briefing configuration */
  getConfig: () => BriefingConfig;
  /** Update briefing configuration */
  updateConfig: (updates: Partial<BriefingConfig>) => BriefingConfig;
  /** Get proactive suggestions */
  getSuggestions: () => Promise<Suggestion[]>;
  /** Start the scheduled briefing checker */
  startScheduler: () => void;
  /** Stop the scheduled briefing checker */
  stopScheduler: () => void;
}

/** Dependencies for the briefing service */
export interface BriefingServiceDeps {
  db: AdcDatabase;
  dataDir: string;
  router: IpcRouter;
  projectService: ProjectService;
  progressService: ProgressService;
  claudeClient: ClaudeClient;
  notificationManager?: NotificationManager;
  suggestionEngine: SuggestionEngine;
  busSessionManager: BusSessionManager;
}

/**
 * Create a briefing service instance.
 */
export function createBriefingService(deps: BriefingServiceDeps): BriefingService {
  const { db, dataDir, router, suggestionEngine } = deps;

  let configManager = createBriefingConfigManager(db, dataDir);
  let cache = createBriefingCache(db, dataDir);
  const generator = createBriefingGenerator({
    progressService: deps.progressService,
    claudeClient: deps.claudeClient,
    notificationManager: deps.notificationManager,
    suggestionEngine: deps.suggestionEngine,
    busSessionManager: deps.busSessionManager,
  });

  let schedulerInterval: ReturnType<typeof setInterval> | null = null;
  let lastScheduledDate = '';
  // Reserved for future caching - currently cleared on reinit/clearState
  let _cachedBriefing: DailyBriefing | null = null;

  function getTodayDate(): string {
    return new Date().toISOString().split('T')[0] ?? '';
  }

  async function generateBriefing(): Promise<DailyBriefing> {
    const config = configManager.loadConfig();
    const briefing = await generator.generate(config);
    cache.storeBriefing(briefing);
    return briefing;
  }

  function checkScheduledTime(): void {
    const config = configManager.loadConfig();
    if (!config.enabled) return;

    const now = new Date();
    const today = getTodayDate();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if we should generate today's briefing
    if (currentTime === config.scheduledTime && lastScheduledDate !== today) {
      lastScheduledDate = today;
      void generateBriefing().then((briefing) => {
        router.emit(BRIEFING_READY_EVENT, { briefingId: briefing.id, date: briefing.date });
        return briefing;
      });
    }
  }

  return {
    getDailyBriefing: () => cache.getTodayBriefing(),

    generateBriefing,

    getConfig: () => configManager.loadConfig(),

    updateConfig(updates) {
      const config = configManager.loadConfig();
      const updated = { ...config, ...updates };
      configManager.saveConfig(updated);
      return updated;
    },

    getSuggestions: () => suggestionEngine.getSuggestions(),  // returns Promise<Suggestion[]>

    startScheduler() {
      if (schedulerInterval !== null) return;
      // Check every minute for scheduled time
      schedulerInterval = setInterval(checkScheduledTime, 60 * 1000);
      // Also check immediately
      checkScheduledTime();
    },

    stopScheduler() {
      if (schedulerInterval !== null) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
      }
    },

    reinitialize(_dataDir: string) {
      // SQLite is shared — sub-modules re-created to re-run migration for new dataDir
      configManager = createBriefingConfigManager(db, _dataDir);
      cache = createBriefingCache(db, _dataDir);
      _cachedBriefing = null;
      lastScheduledDate = '';
    },

    clearState() {
      _cachedBriefing = null;
      lastScheduledDate = '';
    },
  };
}
