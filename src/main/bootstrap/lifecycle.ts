/**
 * Lifecycle — Electron app lifecycle event handlers.
 *
 * Handles:
 * - window-all-closed: quit on non-macOS
 * - before-quit: dispose all services, clear intervals
 * - activate: re-create window on macOS dock click
 */

import { app, BrowserWindow } from 'electron';

import { closeDatabase } from '../db';
import { appLogger } from '../lib/logger';

import type { CommandBus } from '../bus';
import type { BusSessionManager } from '../bus/session-manager';
import type { createAgentOrchestrator } from '../services/agent-orchestrator/agent-orchestrator';
import type { createAgentWatchdog } from '../services/agent-orchestrator/agent-watchdog';
import type { createJsonlProgressWatcher } from '../services/agent-orchestrator/jsonl-progress-watcher';
import type { createAlertService } from '../services/alerts/alert-service';
import type { AppUpdateService } from '../services/app/app-update-service';
import type { createWatchEvaluator } from '../services/assistant/watch-evaluator';
import type { createBriefingService } from '../services/briefing/briefing-service';
import type { CleanupService } from '../services/data-management/cleanup-service';
import type { CrashRecovery } from '../services/data-management/crash-recovery';
import type { ErrorCollector } from '../services/health/error-collector';
import type { HealthRegistry } from '../services/health/health-registry';
import type { createHubConnectionManager } from '../services/hub/hub-connection';
import type { createNotificationManager } from '../services/notifications';
import type { QaTrigger } from '../services/qa/qa-trigger';
import type { createTerminalService } from '../services/terminal/terminal-service';
import type { HotkeyManager } from '../tray/hotkey-manager';

export interface LifecycleDeps {
  createWindow: () => void;
  terminalService: ReturnType<typeof createTerminalService>;
  agentOrchestrator: ReturnType<typeof createAgentOrchestrator>;
  agentWatchdog: ReturnType<typeof createAgentWatchdog>;
  errorCollector: ErrorCollector;
  healthRegistry: HealthRegistry;
  jsonlProgressWatcher: ReturnType<typeof createJsonlProgressWatcher>;
  qaTrigger: QaTrigger;
  alertService: ReturnType<typeof createAlertService>;
  hubConnectionManager: ReturnType<typeof createHubConnectionManager>;
  notificationManager: ReturnType<typeof createNotificationManager>;
  briefingService: ReturnType<typeof createBriefingService>;
  watchEvaluator: ReturnType<typeof createWatchEvaluator>;
  cleanupService: CleanupService;
  crashRecovery: CrashRecovery;
  hotkeyManager: HotkeyManager;
  appUpdateService: AppUpdateService;
  commandBus: CommandBus;
  busSessionManager: BusSessionManager;
  getHeartbeatIntervalId: () => ReturnType<typeof setInterval> | null;
}

/** Registers Electron app lifecycle event handlers. */
export function setupLifecycle(deps: LifecycleDeps): void {
  // Run crash recovery on startup (before agents)
  const recovery = deps.crashRecovery.recover();
  if (recovery.fixed > 0) {
    console.warn(`[Recovery] Fixed ${String(recovery.fixed)} orphaned artifacts on startup`);
  }

  // Start periodic cleanup service
  deps.cleanupService.start();

  // Check for app updates on startup (production only)
  if (app.isPackaged) {
    try {
      deps.appUpdateService.checkForUpdates();
      appLogger.info('[Lifecycle] Auto-update check triggered');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      appLogger.warn('[Lifecycle] Auto-update check failed:', message);
    }
  }

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) deps.createWindow();
  });

  app.on('before-quit', () => {
    (app as unknown as Record<string, boolean>).isQuitting = true;
    deps.cleanupService.dispose();
    deps.hotkeyManager.unregisterAll();
    deps.agentWatchdog.dispose();
    deps.qaTrigger.dispose();
    deps.terminalService.dispose();
    deps.agentOrchestrator.dispose();
    deps.jsonlProgressWatcher.stop();
    deps.alertService.stopChecking();
    deps.hubConnectionManager.dispose();
    deps.notificationManager.dispose();
    deps.briefingService.stopScheduler();
    deps.watchEvaluator.stop();

    const heartbeatId = deps.getHeartbeatIntervalId();
    if (heartbeatId !== null) {
      clearInterval(heartbeatId);
    }

    // Dispose bus + sessions
    deps.busSessionManager.dispose();
    deps.commandBus.dispose();

    // Dispose health + error last (may log during shutdown)
    deps.healthRegistry.dispose();
    deps.errorCollector.dispose();

    // Close database last
    closeDatabase();
  });
}
