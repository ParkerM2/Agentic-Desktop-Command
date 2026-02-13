/**
 * Main Process Entry Point
 *
 * Creates the window, initializes services, registers IPC handlers.
 * This file stays small — logic lives in services.
 */

import { join } from 'node:path';

import { app, BrowserWindow, shell } from 'electron';

import { createOAuthManager } from './auth/oauth-manager';
import { GITHUB_OAUTH_CONFIG } from './auth/providers/github';
import { GOOGLE_OAUTH_CONFIG } from './auth/providers/google';
import { loadOAuthCredentials } from './auth/providers/provider-config';
import { SLACK_OAUTH_CONFIG } from './auth/providers/slack';
import { SPOTIFY_OAUTH_CONFIG } from './auth/providers/spotify';
import { WITHINGS_OAUTH_CONFIG } from './auth/providers/withings';
import { createTokenStore } from './auth/token-store';
import { registerAllHandlers } from './ipc';
import { IpcRouter } from './ipc/router';
import { createMcpManager } from './mcp/mcp-manager';
import { createMcpRegistry } from './mcp/mcp-registry';
import { createAgentService } from './services/agent/agent-service';
import { createAlertService } from './services/alerts/alert-service';
import { createAssistantService } from './services/assistant/assistant-service';
import { createCalendarService } from './services/calendar/calendar-service';
import { createChangelogService } from './services/changelog/changelog-service';
import { createFitnessService } from './services/fitness/fitness-service';
import { createGitService } from './services/git/git-service';
import { createPolyrepoService } from './services/git/polyrepo-service';
import { createWorktreeService } from './services/git/worktree-service';
import { createGitHubService } from './services/github/github-service';
import { createHubConnectionManager } from './services/hub/hub-connection';
import { createHubSyncService } from './services/hub/hub-sync';
import { createWebhookRelay } from './services/hub/webhook-relay';
import { createIdeasService } from './services/ideas/ideas-service';
import { createInsightsService } from './services/insights/insights-service';
import { createMergeService } from './services/merge/merge-service';
import { createMilestonesService } from './services/milestones/milestones-service';
import { createNotesService } from './services/notes/notes-service';
import { createPlannerService } from './services/planner/planner-service';
import { createProjectService } from './services/project/project-service';
import { createTaskService } from './services/project/task-service';
import { createSettingsService } from './services/settings/settings-service';
import { createSpotifyService } from './services/spotify/spotify-service';
import { createTerminalService } from './services/terminal/terminal-service';

import type { OAuthConfig } from './auth/types';

let mainWindow: BrowserWindow | null = null;
let terminalServiceRef: ReturnType<typeof createTerminalService> | null = null;
let agentServiceRef: ReturnType<typeof createAgentService> | null = null;
let alertServiceRef: ReturnType<typeof createAlertService> | null = null;
let hubConnectionManagerRef: ReturnType<typeof createHubConnectionManager> | null = null;

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
  const taskService = createTaskService(
    (id) => projectService.getProjectPath(id),
    () => projectService.listProjects().map((p) => ({ id: p.id, path: p.path })),
  );

  // Agent service needs router for events and project resolver
  const agentService = createAgentService(router, (id) => projectService.getProjectPath(id));
  agentServiceRef = agentService;

  // Notes service persists to user data directory
  const notesService = createNotesService({ dataDir: app.getPath('userData'), router });

  // Planner service persists daily plans to user data directory
  const plannerService = createPlannerService(router);

  // Alert service — checks for due alerts on interval
  const alertService = createAlertService(router);
  alertService.startChecking();
  alertServiceRef = alertService;

  // Git services — polyrepo detects structure, git wraps simple-git, worktree tracks metadata
  const polyrepoService = createPolyrepoService();
  const gitService = createGitService(polyrepoService);
  const worktreeService = createWorktreeService((id) => projectService.getProjectPath(id));
  const mergeService = createMergeService();

  // Milestones, Ideas, Changelog — persisted to user data
  const dataDir = app.getPath('userData');
  const milestonesService = createMilestonesService({ dataDir, router });
  const ideasService = createIdeasService({ dataDir, router });
  const changelogService = createChangelogService({ dataDir });

  // Fitness service — workouts, measurements, goals
  const fitnessService = createFitnessService({ dataDir, router });

  // Insights — aggregates data from tasks, agents, projects
  const insightsService = createInsightsService({
    taskService,
    agentService,
    projectService,
  });

  // OAuth + MCP infrastructure — shared by GitHub, Spotify, Calendar
  const tokenStore = createTokenStore({ dataDir });
  const savedCreds = loadOAuthCredentials(dataDir);
  const providers = new Map<string, OAuthConfig>([
    ['github', { ...GITHUB_OAUTH_CONFIG, ...savedCreds.get('github') }],
    ['google', { ...GOOGLE_OAUTH_CONFIG, ...savedCreds.get('google') }],
    ['slack', { ...SLACK_OAUTH_CONFIG, ...savedCreds.get('slack') }],
    ['spotify', { ...SPOTIFY_OAUTH_CONFIG, ...savedCreds.get('spotify') }],
    ['withings', { ...WITHINGS_OAUTH_CONFIG, ...savedCreds.get('withings') }],
  ]);
  const oauthManager = createOAuthManager({ tokenStore, providers });
  const mcpRegistry = createMcpRegistry();
  const mcpManager = createMcpManager({ registry: mcpRegistry });

  // Hub services — connection manager + sync queue
  const hubConnectionManager = createHubConnectionManager(router);
  hubConnectionManagerRef = hubConnectionManager;
  const hubSyncService = createHubSyncService(hubConnectionManager);

  // GitHub service — wraps GitHub REST API with OAuth tokens
  const githubService = createGitHubService({ oauthManager, router });

  // Spotify service — wraps Spotify Web API with OAuth tokens
  const spotifyService = createSpotifyService({ oauthManager });

  // Calendar service — wraps Google Calendar API with OAuth tokens
  const calendarService = createCalendarService({ oauthManager });

  // Assistant service — intent classification + direct service routing
  const assistantService = createAssistantService({
    router,
    mcpManager,
    notesService,
    alertService,
    spotifyService,
    taskService,
    plannerService,
  });

  // Webhook relay — forward Hub WebSocket messages to assistant service
  const webhookRelay = createWebhookRelay({ assistantService, router });
  hubConnectionManager.onWebSocketMessage((data) => {
    webhookRelay.handleHubMessage(data);
  });

  const services = {
    projectService,
    taskService,
    terminalService,
    settingsService: createSettingsService(),
    agentService,
    alertService,
    assistantService,
    calendarService,
    changelogService,
    fitnessService,
    hubConnectionManager,
    hubSyncService,
    ideasService,
    insightsService,
    mcpManager,
    milestonesService,
    notesService,
    plannerService,
    spotifyService,
    gitService,
    githubService,
    worktreeService,
    mergeService,
    dataDir,
    providers,
    tokenStore,
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
  alertServiceRef?.stopChecking();
  hubConnectionManagerRef?.dispose();
});
