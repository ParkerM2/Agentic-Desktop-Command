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
import type { createAlertService } from '../features/alerts/alert-service';
import type { AppUpdateService } from '../features/app/app-update-service';
import type { createWatchEvaluator } from '../features/assistant/watch-evaluator';
import type { createBriefingService } from '../features/briefing/briefing-service';
import type { CleanupService } from '../features/settings/data-management';
import type { ErrorCollector } from '../features/app/health';
import type { HealthRegistry } from '../features/app/health';
import type { HealthService } from '../features/app/health';
import type { createHubConnectionManager } from '../features/hub/hub-connection';
import type { createNotificationManager } from '../features/integrations/notifications';
import type { QaTrigger } from '../features/qa/qa-trigger';
import type { createTerminalService } from '../features/terminal/terminal-service';
import type { HotkeyManager } from '../tray/hotkey-manager';

export interface LifecycleDeps {
  createWindow: () => void;
  terminalService: ReturnType<typeof createTerminalService>;
  errorCollector: ErrorCollector;
  healthRegistry: HealthRegistry;
  healthService: HealthService;
  qaTrigger: QaTrigger;
  alertService: ReturnType<typeof createAlertService>;
  hubConnectionManager: ReturnType<typeof createHubConnectionManager>;
  notificationManager: ReturnType<typeof createNotificationManager>;
  briefingService: ReturnType<typeof createBriefingService>;
  watchEvaluator: ReturnType<typeof createWatchEvaluator>;
  cleanupService: CleanupService;
  hotkeyManager: HotkeyManager;
  appUpdateService: AppUpdateService;
  commandBus: CommandBus;
  busSessionManager: BusSessionManager;
  getHeartbeatIntervalId: () => ReturnType<typeof setInterval> | null;
}

/** Registers Electron app lifecycle event handlers. */
export function setupLifecycle(deps: LifecycleDeps): void {
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
    deps.qaTrigger.dispose();
    deps.terminalService.dispose();
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
    deps.healthService.dispose();
    deps.healthRegistry.dispose();
    deps.errorCollector.dispose();

    // Close database last
    closeDatabase();
  });
}
