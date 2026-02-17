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

import type { SettingsService } from './services/settings/settings-service';

let mainWindow: BrowserWindow | null = null;
let settingsServiceRef: SettingsService | null = null;

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
    console.error('[Main] Renderer process gone:', details.reason);

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

  // Store ref for createWindow() settings checks
  settingsServiceRef = registry.settingsService;

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
  });

  // Register app lifecycle handlers (quit, activate, cleanup)
  setupLifecycle({
    createWindow,
    terminalService: registry.terminalService,
    agentService: registry.agentService,
    agentOrchestrator: registry.agentOrchestrator,
    jsonlProgressWatcher: registry.jsonlProgressWatcher,
    alertService: registry.alertService,
    hubConnectionManager: registry.hubConnectionManager,
    notificationManager: registry.notificationManager,
    briefingService: registry.briefingService,
    watchEvaluator: registry.watchEvaluator,
    hotkeyManager: registry.hotkeyManager,
    getHeartbeatIntervalId: () => registry.heartbeatIntervalId,
  });
}

void (async () => {
  // Global exception handlers — registered before app.whenReady() for maximum coverage
  process.on('uncaughtException', (error) => {
    console.error('[Main] Uncaught exception:', error);
    dialog.showErrorBox(
      'ADC Error',
      `An unexpected error occurred:\n\n${error.message}`,
    );
    // Trigger graceful cleanup via before-quit handler
    app.quit();
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error('[Main] Unhandled rejection:', message);
    // TODO: Report to ErrorCollector once health monitoring is added to bootstrap
    // Do NOT quit — unhandled rejections are recoverable
  });

  await app.whenReady();
  initializeApp();
  createWindow();
})();
