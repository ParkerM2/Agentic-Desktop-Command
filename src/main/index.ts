/**
 * Main Process Entry Point
 *
 * Creates the window, initializes services, registers IPC handlers.
 * This file stays small — logic lives in services.
 */

import { join } from 'node:path';

import { app, BrowserWindow, shell } from 'electron';

import { registerAllHandlers } from './ipc';
import { IpcRouter } from './ipc/router';
import { createAgentService } from './services/agent/agent-service';
import { createProjectService } from './services/project/project-service';
import { createTaskService } from './services/project/task-service';
import { createSettingsService } from './services/settings/settings-service';
import { createTerminalService } from './services/terminal/terminal-service';

let mainWindow: BrowserWindow | null = null;
let terminalServiceRef: ReturnType<typeof createTerminalService> | null = null;
let agentServiceRef: ReturnType<typeof createAgentService> | null = null;

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
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ─── Initialize Services & IPC ────────────────────────────────

function initializeApp(): void {
  const router = new IpcRouter(getMainWindow);

  // Create project service first — other services depend on it
  const projectService = createProjectService();

  // Terminal service needs the router to emit output events
  const terminalService = createTerminalService(router);
  terminalServiceRef = terminalService;

  // Task service resolves project IDs via projectService
  const taskService = createTaskService((id) => projectService.getProjectPath(id));

  // Agent service needs router for events and project resolver
  const agentService = createAgentService(router, (id) => projectService.getProjectPath(id));
  agentServiceRef = agentService;

  const services = {
    projectService,
    taskService,
    terminalService,
    settingsService: createSettingsService(),
    agentService,
  };

  registerAllHandlers(router, services);
}

// ─── App Lifecycle ────────────────────────────────────────────

void (async () => {
  await app.whenReady();
  initializeApp();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
})();

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  terminalServiceRef?.dispose();
  agentServiceRef?.dispose();
});
