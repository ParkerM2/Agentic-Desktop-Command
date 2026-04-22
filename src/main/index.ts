/**
 * Main Process Entry Point
 *
 * Creates the window, initializes services, registers IPC handlers.
 * Logic lives in bootstrap modules and services — this file orchestrates startup.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { app, BrowserWindow, dialog, MessageChannelMain, protocol, shell, session, utilityProcess } from 'electron';

import { ENV_VARS } from '@shared/constants/env';
import { ASSISTANT_EVENTS } from '@shared/ipc/assistant/channels';

import { createAgentHostClient } from './agent-host/agent-host-client';
import {
  createServiceRegistry,
  setupLifecycle,
  wireEventForwarding,
  wireIpcHandlers,
} from './bootstrap';
import { getChannelConfig, resolveChannel } from './lib/channel';
import { appLogger } from './lib/logger';
import { createTrayManager } from './tray/tray-manager';

import type { AgentHostClient } from './agent-host/agent-host-client';
import type { ErrorCollector } from './features/app/health';
import type { SettingsService } from './features/settings/settings-service';

// Resolve channel BEFORE any app.getPath() or app.whenReady() so Electron's
// path resolution picks up the renamed app. Channels isolate userData,
// cache, logs, crashDumps, the single-instance lock, and Claude CLI state.
const CHANNEL = resolveChannel({
  envChannel: process.env[ENV_VARS.ADC_CHANNEL],
  devMode: process.env[ENV_VARS.ADC_DEV_MODE] === 'true',
  isPackaged: app.isPackaged,
});
const CHANNEL_CFG = getChannelConfig(CHANNEL);

app.setName(CHANNEL_CFG.name);
app.setAppUserModelId(CHANNEL_CFG.aumid);

// Isolate Claude CLI state per channel. CLAUDE_CONFIG_DIR is honored by the
// Claude CLI for every ~/.claude/* path (sessions, MCP auth, hooks).
// process.env propagates to utilityProcess.fork and child_process.spawn
// automatically — see process-manager.ts buildCleanEnv.
process.env.CLAUDE_CONFIG_DIR ??= join(app.getPath('userData'), '.claude');

appLogger.info(`[Main] Starting ADC on channel=${CHANNEL} (name=${CHANNEL_CFG.name}, aumid=${CHANNEL_CFG.aumid})`);

// Enable remote debugging for DevTools MCP integration
app.commandLine.appendSwitch('remote-debugging-port', '9222');

// Register custom protocol scheme before app is ready (required by Electron)
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-file', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } },
]);

// Single-instance lock: second invocation exits immediately and focuses the first.
// Prevents duplicate Electron trees accumulating across `npm run dev` re-runs,
// stale Ctrl+C orphans, or concurrent agent-spawned dev servers.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

let mainWindow: BrowserWindow | null = null;
let settingsServiceRef: SettingsService | null = null;
let errorCollectorRef: ErrorCollector | null = null;
let registryRef: ReturnType<typeof createServiceRegistry> | null = null;
let agentHostClientRef: AgentHostClient | null = null;

// Renderer crash tracking
let rendererCrashCount = 0;
let lastRendererCrashTime = 0;

// Agent host crash recovery
const AGENT_HOST_MAX_RESTARTS = 5;
const AGENT_HOST_RESTART_WINDOW_MS = 60_000; // 1 minute
const AGENT_HOST_BASE_DELAY_MS = 1_000; // 1 second
let agentHostRestartTimestamps: number[] = [];

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
    title: CHANNEL_CFG.label,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  // Keep title pinned — renderer HTML setting <title> would overwrite it.
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('ready-to-show', () => {
    const isDev = !app.isPackaged;
    const startMin = !isDev && settingsServiceRef?.getSettings().startMinimized === true;
    if (!startMin) {
      mainWindow?.show();
    }
    if (isDev) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Forward agent host event port to the renderer
  mainWindow.webContents.once('did-finish-load', () => {
    if (agentHostClientRef && mainWindow) {
      const rendererEventChannel = new MessageChannelMain();
      mainWindow.webContents.postMessage('agent-host-events', null, [rendererEventChannel.port2]);
      agentHostClientRef.onEvent((event) => {
        rendererEventChannel.port1.postMessage(event);
      });
    }

    // Emit assistant autostart after renderer finishes loading
    if (settingsServiceRef?.getSettings().assistantAutoStart !== false) {
      setTimeout(() => {
        registryRef?.router.emit(ASSISTANT_EVENTS.SESSION.AUTOSTART, { autoStarted: true });
      }, 800);
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
        title: `${CHANNEL_CFG.label} — Renderer Crashed`,
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

/**
 * Fork the agent host utility process and wire up MessagePort channels.
 * Returns the child process and client. Installs an exit handler that
 * auto-restarts on crash with exponential backoff (up to MAX_RESTARTS
 * within a sliding window).
 */
function forkAgentHost(): { child: Electron.UtilityProcess; client: AgentHostClient } {
  const agentHostModule = join(__dirname, 'agent-host/index.cjs');
  const child = utilityProcess.fork(agentHostModule, [], { stdio: 'pipe' });

  const controlChannel = new MessageChannelMain();
  const eventChannel = new MessageChannelMain();

  child.postMessage({ type: 'init' }, [controlChannel.port2, eventChannel.port2]);
  const client = createAgentHostClient(controlChannel.port1, eventChannel.port1);

  child.on('exit', (code) => {
    if (code === 0) {
      appLogger.info('[AgentHost] Utility process exited gracefully');
      return; // Graceful shutdown — don't restart
    }

    appLogger.error(`[AgentHost] Utility process crashed with code ${code}`);

    // Sliding-window restart throttle
    const now = Date.now();
    agentHostRestartTimestamps = agentHostRestartTimestamps.filter(
      (t) => now - t < AGENT_HOST_RESTART_WINDOW_MS,
    );

    if (agentHostRestartTimestamps.length >= AGENT_HOST_MAX_RESTARTS) {
      appLogger.error(
        `[AgentHost] Crashed ${AGENT_HOST_MAX_RESTARTS} times within ${AGENT_HOST_RESTART_WINDOW_MS / 1000}s — giving up`,
      );
      return;
    }

    agentHostRestartTimestamps.push(now);
    const delay = AGENT_HOST_BASE_DELAY_MS * Math.pow(2, agentHostRestartTimestamps.length - 1);
    appLogger.warn(`[AgentHost] Restarting in ${delay}ms (attempt ${agentHostRestartTimestamps.length}/${AGENT_HOST_MAX_RESTARTS})...`);

    setTimeout(() => {
      const { child: newChild, client: newClient } = forkAgentHost();

      // Update module-level references so new IPC calls use the fresh client
      void newChild; // child ref kept alive by the exit handler closure
      agentHostClientRef = newClient;

      // Re-forward event port to renderer if the window is still alive
      if (mainWindow && !mainWindow.isDestroyed()) {
        const rendererEventChannel = new MessageChannelMain();
        newClient.onEvent((event) => {
          rendererEventChannel.port1.postMessage(event);
        });
        mainWindow.webContents.postMessage('agent-host-events', null, [rendererEventChannel.port2]);
      }
    }, delay);
  });

  return { child, client };
}

function initializeApp(): void {
  // ── Fork agent host utility process ───────────────────────
  const { client: agentHostClient } = forkAgentHost();
  agentHostClientRef = agentHostClient;

  // ── Initialize services ───────────────────────────────────
  const registry = createServiceRegistry(getMainWindow, agentHostClient, CHANNEL);

  // Store refs for createWindow() settings checks and global error reporting
  settingsServiceRef = registry.settingsService;
  errorCollectorRef = registry.errorCollector;
  registryRef = registry;

  // Wire IPC handlers (pass commandBus so all calls are tracked in SQLite)
  wireIpcHandlers(registry.router, registry.services, registry.commandBus);

  // Wire service events → renderer
  wireEventForwarding({
    router: registry.router,
    watchEvaluator: registry.watchEvaluator,
    webhookRelay: registry.webhookRelay,
    hubConnectionManager: registry.hubConnectionManager,
  });

  // Register app lifecycle handlers (quit, activate, cleanup)
  setupLifecycle({
    createWindow,
    terminalService: registry.terminalService,
    runnersService: registry.services.runnersService,
    errorCollector: registry.errorCollector,
    healthRegistry: registry.healthRegistry,
    healthService: registry.healthService,
    qaTrigger: registry.qaTrigger,
    alertService: registry.alertService,
    hubConnectionManager: registry.hubConnectionManager,
    notificationManager: registry.notificationManager,
    briefingService: registry.briefingService,
    watchEvaluator: registry.watchEvaluator,
    cleanupService: registry.cleanupService,
    hotkeyManager: registry.hotkeyManager,
    appUpdateService: registry.services.appUpdateService,
    commandBus: registry.commandBus,
    busSessionManager: registry.busSessionManager,
    getHeartbeatIntervalId: () => registry.heartbeatIntervalId,
  });
}

void (async () => {
  // Global exception handlers — registered before app.whenReady() for maximum coverage
  process.on('uncaughtException', (error) => {
    // EPIPE = broken pipe from a dropped connection (Hub, WebSocket, etc.)
    // Non-fatal — log and continue rather than crashing the app
    if ('code' in error && error.code === 'EPIPE') {
      appLogger.warn('[Main] EPIPE (broken pipe) — ignoring:', error.message);
      return;
    }

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

  // Register local-file:// protocol to serve local screenshots securely.
  // The renderer can't load file:// URLs when served from http://localhost (dev mode),
  // so we proxy through a custom scheme that Electron allows.
  protocol.handle('local-file', async (request) => {
    // URL format: local-file:///C:/Users/.../screenshot.png
    const filePath = decodeURIComponent(new URL(request.url).pathname);
    // On Windows the pathname starts with /C:/... — strip the leading slash
    const normalized = process.platform === 'win32' ? filePath.replace(/^\//, '') : filePath;
    try {
      const data = await readFile(normalized);
      const ext = normalized.split('.').pop()?.toLowerCase() ?? '';
      const MIME_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
      const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
      return new Response(data, { headers: { 'Content-Type': mime } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  // Bypass certificate errors for localhost webview content only
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    const { hostname } = request;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      callback(0); // 0 = success (bypass)
    } else {
      callback(-3); // -3 = use default verification
    }
  });

  initializeApp();
  createWindow();

  // Initialize system tray after window is available
  const mainWindow = getMainWindow();
  if (mainWindow) {
    const trayManager = createTrayManager({
      mainWindow,
      onQuickCommand: () => {
        // Show the quick input popup — its onCommand callback routes through the assistant service
        registryRef?.quickInput.show();
      },
      onShowWindow: () => {
        const win = getMainWindow();
        if (win) {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
        }
      },
      onQuit: () => {
        (app as unknown as Record<string, boolean>).isQuitting = true;
        app.quit();
      },
    });
    trayManager.initialize();
  }
})();
