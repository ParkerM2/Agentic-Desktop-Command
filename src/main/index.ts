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
import { createTokenStore } from './auth/token-store';
import { registerAllHandlers } from './ipc';
import { IpcRouter } from './ipc/router';
import { createMcpManager } from './mcp/mcp-manager';
import { createMcpRegistry } from './mcp/mcp-registry';
import { createAgentQueue } from './services/agent/agent-queue';
import { createAgentService } from './services/agent/agent-service';
import { createAlertService } from './services/alerts/alert-service';
import { createAppUpdateService } from './services/app/app-update-service';
import { createAssistantService } from './services/assistant/assistant-service';
import { createBriefingService } from './services/briefing/briefing-service';
import { createSuggestionEngine } from './services/briefing/suggestion-engine';
import { createCalendarService } from './services/calendar/calendar-service';
import { createChangelogService } from './services/changelog/changelog-service';
import { createClaudeClient } from './services/claude';
import { createEmailService } from './services/email/email-service';
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
import {
  createGitHubWatcher,
  createNotificationManager,
  createSlackWatcher,
} from './services/notifications';
import { createPlannerService } from './services/planner/planner-service';
import { createProjectService } from './services/project/project-service';
import { createTaskService } from './services/project/task-service';
import { createScreenCaptureService } from './services/screen/screen-capture-service';
import { createSettingsService } from './services/settings/settings-service';
import { createSpotifyService } from './services/spotify/spotify-service';
import { createGithubImporter, createTaskDecomposer } from './services/tasks';
import { createTerminalService } from './services/terminal/terminal-service';
import { createTimeParserService } from './services/time-parser/time-parser-service';
import { createVoiceService } from './services/voice/voice-service';
import { createTaskLauncher } from './services/workflow/task-launcher';
import { createHotkeyManager } from './tray/hotkey-manager';
import { createQuickInputWindow } from './tray/quick-input';

import type { OAuthConfig } from './auth/types';
import type { BriefingService } from './services/briefing/briefing-service';
import type { SettingsService } from './services/settings/settings-service';
import type { HotkeyManager } from './tray/hotkey-manager';

let mainWindow: BrowserWindow | null = null;
let terminalServiceRef: ReturnType<typeof createTerminalService> | null = null;
let agentServiceRef: ReturnType<typeof createAgentService> | null = null;
let alertServiceRef: ReturnType<typeof createAlertService> | null = null;
let hubConnectionManagerRef: ReturnType<typeof createHubConnectionManager> | null = null;
let notificationManagerRef: ReturnType<typeof createNotificationManager> | null = null;
let briefingServiceRef: BriefingService | null = null;
let hotkeyManagerRef: HotkeyManager | null = null;
let settingsServiceRef: SettingsService | null = null;

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

  // Settings service provides configuration including agent settings
  const settingsService = createSettingsService();
  settingsServiceRef = settingsService;

  // Agent queue manages concurrency limits for agent execution
  const agentSettings = settingsService.getAgentSettings();
  const agentQueue = createAgentQueue(router, agentSettings.maxConcurrentAgents);

  // Agent service needs router for events, project resolver, and queue
  const agentService = createAgentService(
    router,
    (id) => projectService.getProjectPath(id),
    agentQueue,
  );
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

  // Email service — SMTP-based email sending with queue support
  const emailService = createEmailService({ router });

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

  // Claude client — wraps Anthropic SDK with conversation management
  const claudeClient = createClaudeClient({
    router,
    getApiKey: () => settingsService.getSettings().anthropicApiKey,
  });

  // Notification watchers — background polling for Slack and GitHub
  const notificationManager = createNotificationManager(router);
  notificationManagerRef = notificationManager;

  // Create and register Slack watcher
  const slackWatcher = createSlackWatcher({
    oauthManager,
    router,
    notificationManager,
    getConfig: () => notificationManager.getConfig().slack,
  });
  notificationManager.registerWatcher(slackWatcher);

  // Create and register GitHub watcher
  const githubWatcher = createGitHubWatcher({
    oauthManager,
    router,
    notificationManager,
    getConfig: () => notificationManager.getConfig().github,
  });
  notificationManager.registerWatcher(githubWatcher);

  // Start watchers if previously enabled
  const notifConfig = notificationManager.getConfig();
  if (notifConfig.enabled) {
    notificationManager.startWatching();
  }

  // Smart task creation services — decomposition + GitHub import
  const taskDecomposer = createTaskDecomposer({ claudeClient });
  const githubImporter = createGithubImporter({ githubService, taskService });

  // Voice service — manages voice configuration
  const voiceService = createVoiceService();

  // Screen capture service — uses Electron desktopCapturer
  const screenCaptureService = createScreenCaptureService();

  // Briefing service — daily briefings with suggestions
  const suggestionEngine = createSuggestionEngine({
    projectService,
    taskService,
    agentService,
  });
  const briefingService = createBriefingService({
    router,
    projectService,
    taskService,
    agentService,
    claudeClient,
    notificationManager,
    suggestionEngine,
  });
  briefingServiceRef = briefingService;
  // Start the briefing scheduler
  briefingService.startScheduler();

  // App update service — wraps electron-updater
  const appUpdateService = createAppUpdateService(router);

  // Hotkey manager and quick input — uses getMainWindow getter so hotkeys
  // can reference the main window even though it's created after initializeApp()
  const quickInput = createQuickInputWindow({
    onCommand: (command) => {
      console.log('[Main] Quick command received:', command);
      void assistantService.sendCommand(command);
    },
  });

  const hotkeyManager = createHotkeyManager({
    quickInput,
    getMainWindow,
  });
  hotkeyManagerRef = hotkeyManager;

  // Register hotkeys from config or defaults
  const customHotkeys = settingsService.getSettings().hotkeys;
  if (customHotkeys) {
    hotkeyManager.registerFromConfig(customHotkeys);
  } else {
    hotkeyManager.registerDefaults();
  }

  // Workflow task launcher — spawns Claude CLI sessions
  const taskLauncher = createTaskLauncher();

  const services = {
    projectService,
    taskService,
    terminalService,
    settingsService,
    agentService,
    agentQueue,
    claudeClient,
    alertService,
    assistantService,
    calendarService,
    changelogService,
    emailService,
    fitnessService,
    hubConnectionManager,
    hubSyncService,
    ideasService,
    insightsService,
    mcpManager,
    milestonesService,
    notesService,
    notificationManager,
    plannerService,
    spotifyService,
    gitService,
    githubService,
    worktreeService,
    mergeService,
    timeParserService: createTimeParserService(),
    taskDecomposer,
    githubImporter,
    voiceService,
    screenCaptureService,
    briefingService,
    hotkeyManager,
    appUpdateService,
    hubApiClient: null,
    taskLauncher,
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
  (app as unknown as Record<string, boolean>).isQuitting = true;
  hotkeyManagerRef?.unregisterAll();
  terminalServiceRef?.dispose();
  agentServiceRef?.dispose();
  alertServiceRef?.stopChecking();
  hubConnectionManagerRef?.dispose();
  notificationManagerRef?.dispose();
  briefingServiceRef?.stopScheduler();
});
