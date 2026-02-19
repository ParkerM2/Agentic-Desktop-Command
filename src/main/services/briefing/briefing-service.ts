/**
 * Briefing Service — Orchestrator for daily briefing generation
 *
 * Delegates to focused modules:
 * - briefing-config.ts — Config loading/saving
 * - briefing-cache.ts — Daily cache (check/store/invalidate)
 * - briefing-generator.ts — Data gathering + summary generation
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { app } from 'electron';

import type { BriefingConfig, DailyBriefing, Suggestion } from '@shared/types';

import { createBriefingCache } from './briefing-cache';
import { createBriefingConfigManager } from './briefing-config';
import { createBriefingGenerator } from './briefing-generator';

import type { SuggestionEngine } from './suggestion-engine';
import type { IpcRouter } from '../../ipc/router';
import type { AgentOrchestrator } from '../agent-orchestrator/types';
import type { ClaudeClient } from '../claude/claude-client';
import type { NotificationManager } from '../notifications';
import type { ProjectService } from '../project/project-service';
import type { TaskService } from '../project/task-service';

const BRIEFING_FILE = 'briefings.json';
const CONFIG_FILE = 'briefing-config.json';
const BRIEFING_READY_EVENT = 'event:briefing.ready' as const;

/** Briefing service interface */
export interface BriefingService {
  /** Get the current daily briefing (cached for the day) */
  getDailyBriefing: () => DailyBriefing | null;
  /** Generate a new daily briefing */
  generateBriefing: () => Promise<DailyBriefing>;
  /** Get briefing configuration */
  getConfig: () => BriefingConfig;
  /** Update briefing configuration */
  updateConfig: (updates: Partial<BriefingConfig>) => BriefingConfig;
  /** Get proactive suggestions */
  getSuggestions: () => Suggestion[];
  /** Start the scheduled briefing checker */
  startScheduler: () => void;
  /** Stop the scheduled briefing checker */
  stopScheduler: () => void;
}

/** Dependencies for the briefing service */
export interface BriefingServiceDeps {
  router: IpcRouter;
  projectService: ProjectService;
  taskService: TaskService;
  claudeClient: ClaudeClient;
  notificationManager?: NotificationManager;
  suggestionEngine: SuggestionEngine;
  agentOrchestrator: AgentOrchestrator;
}

/**
 * Create a briefing service instance.
 */
export function createBriefingService(deps: BriefingServiceDeps): BriefingService {
  const { router, suggestionEngine } = deps;

  const dataDir = app.getPath('userData');

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const configManager = createBriefingConfigManager(join(dataDir, CONFIG_FILE));
  const cache = createBriefingCache(join(dataDir, BRIEFING_FILE));
  const generator = createBriefingGenerator({
    projectService: deps.projectService,
    taskService: deps.taskService,
    claudeClient: deps.claudeClient,
    notificationManager: deps.notificationManager,
    suggestionEngine: deps.suggestionEngine,
    agentOrchestrator: deps.agentOrchestrator,
  });

  let schedulerInterval: ReturnType<typeof setInterval> | null = null;
  let lastScheduledDate = '';

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

    getSuggestions: () => suggestionEngine.getSuggestions(),

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
  };
}
