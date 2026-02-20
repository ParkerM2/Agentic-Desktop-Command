/**
 * Main Process Entry Point
 *
 * Creates the window, initializes services, registers IPC handlers.
 * Logic lives in bootstrap modules and services — this file orchestrates startup.
 */

import { join } from 'node:path';

import { app, BrowserWindow, dialog, shell } from 'electron';

import {
  createServiceRegistry,
  setupLifecycle,
  wireEventForwarding,
  wireIpcHandlers,
} from './bootstrap';
import { appLogger } from './lib/logger';

import type { ErrorCollector } from './services/health/error-collector';
import type { SettingsService } from './services/settings/settings-service';

let mainWindow: BrowserWindow | null = null;
let settingsServiceRef: SettingsService | null = null;
let errorCollectorRef: ErrorCollector | null = null;

// Renderer crash tracking
let rendererCrashCount = 0;
let lastRendererCrashTime = 0;

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('ready-to-show', () => {
    const startMin = settingsServiceRef?.getSettings().startMinimized;
    if (!startMin) {
      mainWindow?.show();
    }
  });

  mainWindow.on('close', (event) => {
    const minToTray = settingsServiceRef?.getSettings().minimizeToTray;
    if (minToTray && mainWindow && !(app as unknown as Record<string, boolean>).isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Renderer crash recovery — auto-recreate up to 3 times within 60s
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    appLogger.error('[Main] Renderer process gone:', details.reason);

    const now = Date.now();
    if (now - lastRendererCrashTime > 60_000) {
      rendererCrashCount = 0;
    }
    rendererCrashCount += 1;
    lastRendererCrashTime = now;

    const MAX_CONSECUTIVE_CRASHES = 3;
    if (rendererCrashCount >= MAX_CONSECUTIVE_CRASHES) {
      const choice = dialog.showMessageBoxSync({
        type: 'error',
        title: 'ADC — Renderer Crashed',
        message: 'The app keeps crashing. Would you like to restart or quit?',
        buttons: ['Restart', 'Quit'],
        defaultId: 0,
        cancelId: 1,
      });
      if (choice === 0) {
        rendererCrashCount = 0;
        createWindow();
      } else {
        app.quit();
      }
    } else {
      setTimeout(() => {
        createWindow();
      }, 1000);
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ─── Initialize & Start ──────────────────────────────────────────

function initializeApp(): void {
  const registry = createServiceRegistry(getMainWindow);

  // Store refs for createWindow() settings checks and global error reporting
  settingsServiceRef = registry.settingsService;
  errorCollectorRef = registry.errorCollector;

  // Wire IPC handlers
  wireIpcHandlers(registry.router, registry.services);

  // Wire service events → renderer
  wireEventForwarding({
    router: registry.router,
    agentOrchestrator: registry.agentOrchestrator,
    jsonlProgressWatcher: registry.jsonlProgressWatcher,
    watchEvaluator: registry.watchEvaluator,
    webhookRelay: registry.webhookRelay,
    hubConnectionManager: registry.hubConnectionManager,
    taskRepository: registry.taskRepository,
  });

  // Register app lifecycle handlers (quit, activate, cleanup)
  setupLifecycle({
    createWindow,
    terminalService: registry.terminalService,
    agentOrchestrator: registry.agentOrchestrator,
    agentWatchdog: registry.agentWatchdog,
    errorCollector: registry.errorCollector,
    healthRegistry: registry.healthRegistry,
    jsonlProgressWatcher: registry.jsonlProgressWatcher,
    qaTrigger: registry.qaTrigger,
    alertService: registry.alertService,
    hubConnectionManager: registry.hubConnectionManager,
    notificationManager: registry.notificationManager,
    briefingService: registry.briefingService,
    watchEvaluator: registry.watchEvaluator,
    cleanupService: registry.cleanupService,
    crashRecovery: registry.crashRecovery,
    hotkeyManager: registry.hotkeyManager,
    appUpdateService: registry.services.appUpdateService,
    getHeartbeatIntervalId: () => registry.heartbeatIntervalId,
  });
}

void (async () => {
  // Global exception handlers — registered before app.whenReady() for maximum coverage
  process.on('uncaughtException', (error) => {
    appLogger.error('[Main] Uncaught exception:', error);
    dialog.showErrorBox(
      'ADC Error',
      `An unexpected error occurred:\n\n${error.message}`,
    );
    // Trigger graceful cleanup via before-quit handler
    app.quit();
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    appLogger.error('[Main] Unhandled rejection:', message);
    errorCollectorRef?.report({
      severity: 'error',
      tier: 'app',
      category: 'general',
      message: `Unhandled rejection: ${message}`,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    // Do NOT quit — unhandled rejections are recoverable
  });

  await app.whenReady();
  initializeApp();
  createWindow();
})();
