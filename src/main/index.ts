/**
 * Main Process Entry Point
 *
 * Creates the window, initializes services, registers IPC handlers.
 * This file stays small — logic lives in services.
 */

import { hostname } from 'node:os';
import { join } from 'node:path';

import { app, BrowserWindow, dialog, shell } from 'electron';

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
import { createAgentOrchestrator } from './services/agent-orchestrator/agent-orchestrator';
import { createAgentWatchdog } from './services/agent-orchestrator/agent-watchdog';
import { createJsonlProgressWatcher } from './services/agent-orchestrator/jsonl-progress-watcher';
import { createAlertService } from './services/alerts/alert-service';
import { createAppUpdateService } from './services/app/app-update-service';
import { createAssistantService } from './services/assistant/assistant-service';
import { createCrossDeviceQuery } from './services/assistant/cross-device-query';
import { createWatchEvaluator } from './services/assistant/watch-evaluator';
import { createWatchStore } from './services/assistant/watch-store';
import { createBriefingService } from './services/briefing/briefing-service';
import { createSuggestionEngine } from './services/briefing/suggestion-engine';
import { createCalendarService } from './services/calendar/calendar-service';
import { createChangelogService } from './services/changelog/changelog-service';
import { createClaudeClient } from './services/claude';
import { createDeviceService } from './services/device/device-service';
import { createEmailService } from './services/email/email-service';
import { createFitnessService } from './services/fitness/fitness-service';
import { createGitService } from './services/git/git-service';
import { createPolyrepoService } from './services/git/polyrepo-service';
import { createWorktreeService } from './services/git/worktree-service';
import { createGitHubService } from './services/github/github-service';
import { createErrorCollector } from './services/health/error-collector';
import { createHealthRegistry } from './services/health/health-registry';
import { createHubApiClient } from './services/hub/hub-api-client';
import { createHubAuthService } from './services/hub/hub-auth-service';
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
import { createQaRunner } from './services/qa/qa-runner';
import { createQaTrigger } from './services/qa/qa-trigger';
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
import type { ErrorCollector } from './services/health/error-collector';
import type { HealthRegistry } from './services/health/health-registry';
import type { HubApiClient } from './services/hub/hub-api-client';
import type { SettingsService } from './services/settings/settings-service';
import type { HotkeyManager } from './tray/hotkey-manager';

let mainWindow: BrowserWindow | null = null;
let errorCollectorRef: ErrorCollector | null = null;
let healthRegistryRef: HealthRegistry | null = null;
let terminalServiceRef: ReturnType<typeof createTerminalService> | null = null;
let agentServiceRef: ReturnType<typeof createAgentService> | null = null;
let agentOrchestratorRef: ReturnType<typeof createAgentOrchestrator> | null = null;
let jsonlProgressWatcherRef: ReturnType<typeof createJsonlProgressWatcher> | null = null;
let agentWatchdogRef: ReturnType<typeof createAgentWatchdog> | null = null;
let alertServiceRef: ReturnType<typeof createAlertService> | null = null;
let hubConnectionManagerRef: ReturnType<typeof createHubConnectionManager> | null = null;
let notificationManagerRef: ReturnType<typeof createNotificationManager> | null = null;
let briefingServiceRef: BriefingService | null = null;
let watchEvaluatorRef: ReturnType<typeof createWatchEvaluator> | null = null;
let qaTriggerRef: ReturnType<typeof createQaTrigger> | null = null;
let hotkeyManagerRef: HotkeyManager | null = null;
let settingsServiceRef: SettingsService | null = null;
let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
let registeredDeviceId: string | null = null;

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

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Initialize a non-critical service with error handling.
 * Returns the service instance or null if initialization fails.
 */
function initNonCritical<T>(
  name: string,
  factory: () => T,
  errorCollector: ReturnType<typeof createErrorCollector>,
): T | null {
  try {
    return factory();
  } catch (error: unknown) {
    console.error(`Non-critical service failed to initialize: ${name}`, error);
    errorCollector.report({
      severity: 'warning',
      tier: 'app',
      category: 'service',
      message: `Service initialization failed: ${name} - ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

// ─── Initialize Services & IPC ────────────────────────────────

function initializeApp(): void {
  const router = new IpcRouter(getMainWindow);

  // Data directory — used by many services
  const dataDir = app.getPath('userData');

  // Error collector + health registry — created early so services can report errors
  const errorCollector = createErrorCollector(dataDir, {
    onError: (entry) => {
      router.emit('event:app.error', entry);
    },
    onCapacityAlert: (count, message) => {
      router.emit('event:app.capacityAlert', { count, message });
    },
  });
  errorCollectorRef = errorCollector;

  const healthRegistry = createHealthRegistry({
    onUnhealthy: (serviceName, missedCount) => {
      router.emit('event:app.serviceUnhealthy', { serviceName, missedCount });
    },
  });
  healthRegistryRef = healthRegistry;

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

  // Hub services — connection manager + sync queue + auth
  const hubConnectionManager = createHubConnectionManager(router);
  hubConnectionManagerRef = hubConnectionManager;
  const hubSyncService = createHubSyncService(hubConnectionManager);

  // Hub auth service — user authentication against the Hub server
  const hubAuthService = createHubAuthService({
    tokenStore,
    getHubUrl: () => hubConnectionManager.getConnection()?.hubUrl ?? null,
  });

  // Hub API client — typed HTTP helpers for Hub API calls
  const hubApiClient = createHubApiClient(
    () => hubConnectionManager.getConnection()?.hubUrl ?? null,
    () => hubAuthService.getAccessToken(),
  );

  // Create project service — other services depend on it (Hub API proxy with local cache)
  const projectService = createProjectService({ hubApiClient });

  // Terminal service needs the router to emit output events
  const terminalService = createTerminalService(router);
  terminalServiceRef = terminalService;

  // Task service resolves project IDs via projectService
  const taskService = createTaskService(
    (id) => projectService.getProjectPath(id),
    () => projectService.listProjectsSync().map((p) => ({ id: p.id, path: p.path })),
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
  const notesService = createNotesService({ dataDir, router });

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

  // Milestones, Ideas, Changelog — persisted to user data (non-critical)
  const milestonesService = initNonCritical('milestones', () =>
    createMilestonesService({ dataDir, router }), errorCollector);
  const ideasService = initNonCritical('ideas', () =>
    createIdeasService({ dataDir, router }), errorCollector);
  const changelogService = initNonCritical('changelog', () =>
    createChangelogService({ dataDir }), errorCollector);

  // Fitness service — workouts, measurements, goals (non-critical)
  const fitnessService = initNonCritical('fitness', () =>
    createFitnessService({ dataDir, router }), errorCollector);

  // Email service — SMTP-based email sending with queue support
  const emailService = createEmailService({ router });

  // Device service — manages device registration and status via Hub API
  const deviceService = createDeviceService({ hubApiClient });

  // Device registration and heartbeat interval (30 seconds)
  const HEARTBEAT_INTERVAL_MS = 30_000;

  async function registerDeviceAndStartHeartbeat(client: HubApiClient): Promise<void> {
    const machineId = hostname();
    const deviceName = `${hostname()} (Desktop)`;

    try {
      const result = await client.registerDevice({
        machineId,
        deviceType: 'desktop',
        deviceName,
        capabilities: { canExecute: true, repos: [] },
        appVersion: app.getVersion(),
      });

      if (result.ok && result.data) {
        registeredDeviceId = result.data.id;
        console.log(`[Hub] Device registered: ${result.data.id}`);

        // Start heartbeat interval
        if (heartbeatIntervalId !== null) {
          clearInterval(heartbeatIntervalId);
        }

        heartbeatIntervalId = setInterval(() => {
          if (registeredDeviceId) {
            healthRegistry.pulse('hubHeartbeat');
            void client.heartbeat(registeredDeviceId).then((res) => {
              if (!res.ok) {
                console.warn('[Hub] Heartbeat failed:', res.error);
              }
              return res;
            });
          }
        }, HEARTBEAT_INTERVAL_MS);

        console.log('[Hub] Heartbeat interval started (30s)');
      } else {
        console.warn('[Hub] Device registration failed:', result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Hub] Device registration error:', message);
    }
  }

  // Register device when Hub connection is established and user is authenticated
  // This is triggered when the connection status changes to 'connected'
  hubConnectionManager.onWebSocketMessage(() => {
    healthRegistry.pulse('hubWebSocket');
    // Only register if not already registered and user is authenticated
    if (registeredDeviceId === null && hubAuthService.isAuthenticated()) {
      void registerDeviceAndStartHeartbeat(hubApiClient);
    }
  });

  // GitHub service — wraps GitHub REST API with OAuth tokens
  const githubService = createGitHubService({ oauthManager, router });

  // Spotify service — wraps Spotify Web API with OAuth tokens (non-critical)
  const spotifyService = initNonCritical('spotify', () =>
    createSpotifyService({ oauthManager }), errorCollector);

  // Calendar service — wraps Google Calendar API with OAuth tokens (non-critical)
  const calendarService = initNonCritical('calendar', () =>
    createCalendarService({ oauthManager }), errorCollector);

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

  // Voice service — manages voice configuration (non-critical)
  const voiceService = initNonCritical('voice', () =>
    createVoiceService(), errorCollector);

  // Screen capture service — uses Electron desktopCapturer (non-critical)
  const screenCaptureService = initNonCritical('screenCapture', () =>
    createScreenCaptureService(), errorCollector);

  // Suggestion engine — for briefings
  const suggestionEngine = createSuggestionEngine({
    projectService,
    taskService,
    agentService,
  });

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

  // Agent orchestrator — headless Claude agent lifecycle management
  const agentOrchestrator = createAgentOrchestrator(dataDir, milestonesService ?? undefined);
  agentOrchestratorRef = agentOrchestrator;

  // Agent watchdog — monitors active sessions for dead/stale processes
  const agentWatchdog = createAgentWatchdog(agentOrchestrator, {}, notificationManager);
  agentWatchdogRef = agentWatchdog;

  // Wire watchdog alerts to IPC events for the renderer
  agentWatchdog.onAlert((alert) => {
    router.emit('event:agent.orchestrator.watchdogAlert', {
      type: alert.type,
      sessionId: alert.sessionId,
      taskId: alert.taskId,
      message: alert.message,
      suggestedAction: alert.suggestedAction,
      timestamp: alert.timestamp,
    });
  });
  agentWatchdog.start();

  // QA runner — two-tier automated QA system
  const qaRunner = createQaRunner(agentOrchestrator, dataDir, notificationManager);

  // QA auto-trigger — starts quiet QA when an execution agent completes
  const qaTrigger = createQaTrigger({ qaRunner, orchestrator: agentOrchestrator, hubApiClient, router });
  qaTriggerRef = qaTrigger;

  // Insights — aggregates data from tasks, agents, projects, orchestrator, QA
  const insightsService = createInsightsService({
    taskService,
    agentService,
    projectService,
    agentOrchestrator,
    qaRunner,
  });

  // Briefing service — daily briefings with suggestions (needs orchestrator)
  const briefingService = createBriefingService({
    router,
    projectService,
    taskService,
    agentService,
    claudeClient,
    notificationManager,
    suggestionEngine,
    agentOrchestrator,
  });
  briefingServiceRef = briefingService;
  // Start the briefing scheduler
  briefingService.startScheduler();

  // Watch store + evaluator — persistent assistant watches that trigger proactive notifications
  const watchStore = createWatchStore();
  const watchEvaluator = createWatchEvaluator(watchStore);
  watchEvaluatorRef = watchEvaluator;

  // Cross-device query — query other ADC instances via Hub API
  const crossDeviceQuery = createCrossDeviceQuery(hubApiClient);

  // Assistant service — intent classification + direct service routing
  const assistantService = createAssistantService({
    router,
    mcpManager,
    notesService,
    alertService,
    spotifyService: spotifyService ?? undefined,
    taskService,
    plannerService,
    watchStore,
    crossDeviceQuery,
    fitnessService: fitnessService ?? undefined,
    calendarService: calendarService ?? undefined,
    briefingService,
    insightsService,
    ideasService: ideasService ?? undefined,
    milestonesService: milestonesService ?? undefined,
    emailService,
    githubService,
    changelogService: changelogService ?? undefined,
  });

  // Wire watch evaluator to emit proactive notifications when watches trigger
  watchEvaluator.onTrigger((watch) => {
    const description = watch.followUp ?? `${watch.type} watch on ${watch.targetId}`;
    router.emit('event:assistant.proactive', {
      content: `Watch triggered: ${description}`,
      source: 'watch',
      taskId: watch.targetId === '*' ? undefined : watch.targetId,
      followUp: watch.followUp,
    });
  });
  watchEvaluator.start();

  // Webhook relay — forward Hub WebSocket messages to assistant service
  const webhookRelay = createWebhookRelay({ assistantService, router });
  hubConnectionManager.onWebSocketMessage((data) => {
    webhookRelay.handleHubMessage(data);
  });

  // Wire orchestrator session events to IPC events for renderer updates
  const HEARTBEAT_EVENT = 'event:agent.orchestrator.heartbeat' as const;
  agentOrchestrator.onSessionEvent((event) => {
    switch (event.type) {
      case 'spawned':
      case 'active':
        router.emit(HEARTBEAT_EVENT, {
          taskId: event.session.taskId,
          timestamp: event.timestamp,
        });
        break;
      case 'completed':
        router.emit('event:agent.orchestrator.stopped', {
          taskId: event.session.taskId,
          reason: 'completed',
          exitCode: event.exitCode ?? 0,
        });
        break;
      case 'error':
        router.emit('event:agent.orchestrator.error', {
          taskId: event.session.taskId,
          error: event.error ?? `Agent exited with code ${String(event.exitCode ?? -1)}`,
        });
        break;
      case 'killed':
        router.emit('event:agent.orchestrator.stopped', {
          taskId: event.session.taskId,
          reason: 'killed',
          exitCode: event.exitCode ?? -1,
        });
        break;
      case 'heartbeat':
        router.emit(HEARTBEAT_EVENT, {
          taskId: event.session.taskId,
          timestamp: event.timestamp,
        });
        break;
    }
  });

  // JSONL progress watcher — watches per-task progress files for real-time UI updates
  const progressDir = join(dataDir, 'progress');
  const jsonlProgressWatcher = createJsonlProgressWatcher(progressDir);
  jsonlProgressWatcherRef = jsonlProgressWatcher;

  jsonlProgressWatcher.onProgress(({ taskId, entries }) => {
    for (const entry of entries) {
      // Emit granular typed events based on entry type
      switch (entry.type) {
        case 'tool_use':
          router.emit('event:agent.orchestrator.progress', {
            taskId,
            type: 'tool_use',
            data: { tool: entry.tool },
            timestamp: entry.timestamp,
          });
          // Also emit heartbeat on any activity
          router.emit(HEARTBEAT_EVENT, {
            taskId,
            timestamp: entry.timestamp,
          });
          break;
        case 'phase_change':
          router.emit('event:agent.orchestrator.progress', {
            taskId,
            type: 'phase_change',
            data: {
              phase: entry.phase,
              phaseIndex: String(entry.phaseIndex),
              totalPhases: String(entry.totalPhases),
            },
            timestamp: entry.timestamp,
          });
          break;
        case 'plan_ready':
          router.emit('event:agent.orchestrator.planReady', {
            taskId,
            planSummary: entry.planSummary,
            planFilePath: entry.planFilePath,
          });
          break;
        case 'agent_stopped':
          router.emit('event:agent.orchestrator.stopped', {
            taskId,
            reason: entry.reason,
            exitCode: 0,
          });
          break;
        case 'error':
          router.emit('event:agent.orchestrator.error', {
            taskId,
            error: entry.error,
          });
          break;
        case 'heartbeat':
          router.emit(HEARTBEAT_EVENT, {
            taskId,
            timestamp: entry.timestamp,
          });
          break;
      }
    }
  });

  jsonlProgressWatcher.start();

  // Health registry enrollment — register background services for monitoring
  healthRegistry.register('hubHeartbeat', 60_000);
  healthRegistry.register('hubWebSocket', 30_000);

  const services = {
    agentOrchestrator,
    projectService,
    taskService,
    terminalService,
    settingsService,
    agentService,
    agentQueue,
    claudeClient,
    deviceService,
    alertService,
    assistantService,
    calendarService,
    changelogService,
    emailService,
    errorCollector,
    fitnessService,
    healthRegistry,
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
    hubApiClient,
    hubAuthService,
    qaRunner,
    taskLauncher,
    dataDir,
    providers,
    tokenStore,
  };

  registerAllHandlers(router, services);
}

// ─── App Lifecycle ────────────────────────────────────────────

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
    // Report to ErrorCollector if initialized
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
  agentOrchestratorRef?.dispose();
  agentWatchdogRef?.dispose();
  jsonlProgressWatcherRef?.stop();
  alertServiceRef?.stopChecking();
  hubConnectionManagerRef?.dispose();
  notificationManagerRef?.dispose();
  briefingServiceRef?.stopScheduler();
  watchEvaluatorRef?.stop();
  qaTriggerRef?.dispose();
  // Clear device heartbeat interval
  if (heartbeatIntervalId !== null) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
  // Dispose error collector and health registry last (they may log during shutdown)
  healthRegistryRef?.dispose();
  errorCollectorRef?.dispose();
});
