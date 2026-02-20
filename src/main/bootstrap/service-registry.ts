/**
 * Service Registry — instantiates all services and their dependencies.
 *
 * Extracted from main/index.ts to keep the entry point small.
 * Every service factory call lives here.
 */

import { hostname } from 'node:os';
import { join } from 'node:path';

import { app } from 'electron';

import { createOAuthManager } from '../auth/oauth-manager';
import { GITHUB_OAUTH_CONFIG } from '../auth/providers/github';
import { GOOGLE_OAUTH_CONFIG } from '../auth/providers/google';
import { loadOAuthCredentials } from '../auth/providers/provider-config';
import { SLACK_OAUTH_CONFIG } from '../auth/providers/slack';
import { SPOTIFY_OAUTH_CONFIG } from '../auth/providers/spotify';
import { createTokenStore } from '../auth/token-store';
import { IpcRouter } from '../ipc/router';
import { appLogger } from '../lib/logger';
import { createMcpManager } from '../mcp/mcp-manager';
import { createMcpRegistry } from '../mcp/mcp-registry';
import { createGitHubCliClient } from '../mcp-servers/github/github-client';
import { createAgentOrchestrator } from '../services/agent-orchestrator/agent-orchestrator';
import { createAgentWatchdog } from '../services/agent-orchestrator/agent-watchdog';
import { createJsonlProgressWatcher } from '../services/agent-orchestrator/jsonl-progress-watcher';
import { createAlertService } from '../services/alerts/alert-service';
import { createAppUpdateService } from '../services/app/app-update-service';
import { createAssistantService } from '../services/assistant/assistant-service';
import { createCrossDeviceQuery } from '../services/assistant/cross-device-query';
import { createWatchEvaluator } from '../services/assistant/watch-evaluator';
import { createWatchStore } from '../services/assistant/watch-store';
import { createBriefingService } from '../services/briefing/briefing-service';
import { createSuggestionEngine } from '../services/briefing/suggestion-engine';
import { createCalendarService } from '../services/calendar/calendar-service';
import { createChangelogService } from '../services/changelog/changelog-service';
import { createClaudeClient } from '../services/claude';
import { createDashboardService } from '../services/dashboard/dashboard-service';
import { createCleanupService } from '../services/data-management/cleanup-service';
import { createCrashRecovery } from '../services/data-management/crash-recovery';
import { createStorageInspector } from '../services/data-management/storage-inspector';
import { createDeviceService } from '../services/device/device-service';
import { createDockerService } from '../services/docker/docker-service';
import { createEmailService } from '../services/email/email-service';
import { createFitnessService } from '../services/fitness/fitness-service';
import { createGitService } from '../services/git/git-service';
import { createPolyrepoService } from '../services/git/polyrepo-service';
import { createWorktreeService } from '../services/git/worktree-service';
import { createGitHubService } from '../services/github/github-service';
import { createErrorCollector } from '../services/health/error-collector';
import { createHealthRegistry } from '../services/health/health-registry';
import { createHubApiClient } from '../services/hub/hub-api-client';
import { createHubAuthService } from '../services/hub/hub-auth-service';
import { createHubConnectionManager } from '../services/hub/hub-connection';
import { createHubSyncService } from '../services/hub/hub-sync';
import { createWebhookRelay } from '../services/hub/webhook-relay';
import { createIdeasService } from '../services/ideas/ideas-service';
import { createInsightsService } from '../services/insights/insights-service';
import { createMergeService } from '../services/merge/merge-service';
import { createMilestonesService } from '../services/milestones/milestones-service';
import { createNotesService } from '../services/notes/notes-service';
import {
  createGitHubWatcher,
  createNotificationManager,
  createSlackWatcher,
} from '../services/notifications';
import { createPlannerService } from '../services/planner/planner-service';
import { createClaudeMdGenerator } from '../services/project/claudemd-generator';
import { createCodebaseAnalyzer } from '../services/project/codebase-analyzer';
import { createDocGenerator } from '../services/project/doc-generator';
import { createGitHubRepoCreator } from '../services/project/github-repo-creator';
import { createProjectService } from '../services/project/project-service';
import { createSetupPipeline } from '../services/project/setup-pipeline';
import { createSkillsResolver } from '../services/project/skills-resolver';
import { createTaskService } from '../services/project/task-service';
import { createQaRunner } from '../services/qa/qa-runner';
import { createQaTrigger } from '../services/qa/qa-trigger';
import { createScreenCaptureService } from '../services/screen/screen-capture-service';
import { createSettingsService } from '../services/settings/settings-service';
import { createSpotifyService } from '../services/spotify/spotify-service';
import { createGithubImporter, createTaskDecomposer, createTaskRepository } from '../services/tasks';
import { createTerminalService } from '../services/terminal/terminal-service';
import { createTimeParserService } from '../services/time-parser/time-parser-service';
import { createTrackerService } from '../services/tracker/tracker-service';
import { createVoiceService } from '../services/voice/voice-service';
import { createTaskLauncher } from '../services/workflow/task-launcher';
import { createHotkeyManager } from '../tray/hotkey-manager';
import { createQuickInputWindow } from '../tray/quick-input';

import type { OAuthConfig } from '../auth/types';
import type { Services } from '../ipc';
import type { HubApiClient } from '../services/hub/hub-api-client';
import type { TaskRepository } from '../services/tasks/types';

/** Everything createServiceRegistry produces — services + extras needed for lifecycle/event wiring. */
export interface ServiceRegistryResult {
  router: IpcRouter;
  services: Services;
  assistantService: ReturnType<typeof createAssistantService>;
  agentOrchestrator: ReturnType<typeof createAgentOrchestrator>;
  agentWatchdog: ReturnType<typeof createAgentWatchdog>;
  errorCollector: ReturnType<typeof createErrorCollector>;
  healthRegistry: ReturnType<typeof createHealthRegistry>;
  jsonlProgressWatcher: ReturnType<typeof createJsonlProgressWatcher>;
  qaTrigger: ReturnType<typeof createQaTrigger>;
  watchEvaluator: ReturnType<typeof createWatchEvaluator>;
  webhookRelay: ReturnType<typeof createWebhookRelay>;
  hubConnectionManager: ReturnType<typeof createHubConnectionManager>;
  terminalService: ReturnType<typeof createTerminalService>;
  alertService: ReturnType<typeof createAlertService>;
  notificationManager: ReturnType<typeof createNotificationManager>;
  briefingService: ReturnType<typeof createBriefingService>;
  hotkeyManager: ReturnType<typeof createHotkeyManager>;
  settingsService: ReturnType<typeof createSettingsService>;
  cleanupService: ReturnType<typeof createCleanupService>;
  crashRecovery: ReturnType<typeof createCrashRecovery>;
  hubApiClient: HubApiClient;
  taskRepository: TaskRepository;
  heartbeatIntervalId: ReturnType<typeof setInterval> | null;
  registeredDeviceId: string | null;
}

/**
 * Instantiates every service in the app, wires cross-service dependencies,
 * and returns the full registry for IPC/event/lifecycle wiring.
 */
export function createServiceRegistry(
  getMainWindow: () => Electron.BrowserWindow | null,
): ServiceRegistryResult {
  const router = new IpcRouter(getMainWindow);
  const dataDir = app.getPath('userData');

  // ─── Error collector + health registry (created early) ──────
  const errorCollector = createErrorCollector(dataDir, {
    onError: (entry) => { router.emit('event:app.error', entry); },
    onCapacityAlert: (count, message) => { router.emit('event:app.capacityAlert', { count, message }); },
    onDataRecovery: (store, message) => { router.emit('event:app.dataRecovery', { store, message }); },
  });
  const healthRegistry = createHealthRegistry({
    onUnhealthy: (serviceName, missedCount) => {
      router.emit('event:app.serviceUnhealthy', { serviceName, missedCount });
    },
  });

  /** Wrap non-critical service init — returns null on failure and reports to errorCollector. */
  function initNonCritical<T>(name: string, factory: () => T): T | null {
    try {
      return factory();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      appLogger.warn(`[Bootstrap] Non-critical service "${name}" failed to init: ${msg}`);
      errorCollector.report({
        severity: 'warning', tier: 'app', category: 'service',
        message: `Service initialization failed: ${name} - ${msg}`,
      });
      return null;
    }
  }

  // ─── OAuth + MCP infrastructure ──────────────────────────────
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

  // ─── Hub services ────────────────────────────────────────────
  const hubConnectionManager = createHubConnectionManager(router);

  // Auto-connect if Hub was previously configured and enabled
  const savedHubConfig = hubConnectionManager.getConnection();
  if (savedHubConfig?.enabled) {
    appLogger.info('[Hub] Auto-connecting to saved Hub:', savedHubConfig.hubUrl);
    void (async () => {
      const result = await hubConnectionManager.connect();
      if (result.success) {
        appLogger.info('[Hub] Auto-connect succeeded');
      } else {
        appLogger.warn('[Hub] Auto-connect failed:', result.error);
      }
    })();
  }

  const hubSyncService = createHubSyncService(hubConnectionManager);
  const hubAuthService = createHubAuthService({
    tokenStore,
    getHubUrl: () => hubConnectionManager.getConnection()?.hubUrl ?? null,
  });
  const hubApiClient = createHubApiClient(
    () => hubConnectionManager.getConnection()?.hubUrl ?? null,
    () => hubAuthService.getAccessToken(),
  );

  // ─── Core services ───────────────────────────────────────────
  const projectService = createProjectService({ hubApiClient });
  const terminalService = createTerminalService(router);
  const taskService = createTaskService(
    (id) => projectService.getProjectPath(id),
    () => projectService.listProjectsSync().map((p) => ({ id: p.id, path: p.path })),
    router,
  );
  const settingsService = createSettingsService();

  // ─── Task repository (local-first + Hub mirror) ──────────────
  const taskRepository = createTaskRepository({
    taskService,
    hubApiClient,
    hubConnectionManager,
    projectService,
  });

  // ─── Persistence services ────────────────────────────────────
  const notesService = createNotesService({ dataDir, router });
  const dashboardService = createDashboardService({ dataDir, router });
  const dockerService = createDockerService();
  const plannerService = createPlannerService(router);
  const alertService = createAlertService(router);
  alertService.startChecking();

  // ─── Git services ────────────────────────────────────────────
  const polyrepoService = createPolyrepoService();
  const gitService = createGitService(polyrepoService);
  const worktreeService = createWorktreeService((id) => projectService.getProjectPath(id));
  const mergeService = createMergeService();

  // ─── Project setup pipeline services ────────────────────────
  const codebaseAnalyzer = createCodebaseAnalyzer();
  const claudeMdGenerator = createClaudeMdGenerator();
  const skillsResolver = createSkillsResolver();
  const docGenerator = createDocGenerator();
  const githubRepoCreator = createGitHubRepoCreator();
  const setupPipeline = createSetupPipeline({
    codebaseAnalyzer,
    claudeMdGenerator,
    skillsResolver,
    docGenerator,
    githubRepoCreator,
    projectService,
    gitService,
    router,
  });

  // ─── Data services (non-critical wrapped) ────────────────────
  const milestonesService = initNonCritical('milestones', () =>
    createMilestonesService({ dataDir, router }),
  );
  const ideasService = initNonCritical('ideas', () =>
    createIdeasService({ dataDir, router }),
  );
  const changelogService = initNonCritical('changelog', () =>
    createChangelogService({ dataDir }),
  );
  const fitnessService = initNonCritical('fitness', () =>
    createFitnessService({ dataDir, router }),
  );
  const emailService = createEmailService({ router });

  // ─── Device + heartbeat ──────────────────────────────────────
  const deviceService = createDeviceService({ hubApiClient });

  let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  let registeredDeviceId: string | null = null;
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
        appLogger.info(`[Hub] Device registered: ${result.data.id}`);

        if (heartbeatIntervalId !== null) {
          clearInterval(heartbeatIntervalId);
        }

        heartbeatIntervalId = setInterval(() => {
          if (registeredDeviceId) {
            healthRegistry.pulse('hubHeartbeat');
            void client.heartbeat(registeredDeviceId).then((res) => {
              if (!res.ok) {
                appLogger.warn('[Hub] Heartbeat failed:', res.error);
              }
              return res;
            });
          }
        }, HEARTBEAT_INTERVAL_MS);

        appLogger.info('[Hub] Heartbeat interval started (30s)');
      } else {
        appLogger.warn('[Hub] Device registration failed:', result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      appLogger.error('[Hub] Device registration error:', message);
    }
  }

  hubConnectionManager.onWebSocketMessage(() => {
    healthRegistry.pulse('hubWebSocket');
    if (registeredDeviceId === null && hubAuthService.isAuthenticated()) {
      void registerDeviceAndStartHeartbeat(hubApiClient);
    }
  });

  // ─── External API services ───────────────────────────────────
  const githubCliClient = createGitHubCliClient();
  const githubService = createGitHubService({ client: githubCliClient, router });
  const spotifyService = initNonCritical('spotify', () =>
    createSpotifyService({ oauthManager }),
  );
  const calendarService = initNonCritical('calendar', () =>
    createCalendarService({ oauthManager }),
  );
  const claudeClient = createClaudeClient({
    router,
    getApiKey: () => settingsService.getSettings().anthropicApiKey,
  });

  // ─── Notifications ───────────────────────────────────────────
  const notificationManager = createNotificationManager(router);

  const slackWatcher = createSlackWatcher({
    oauthManager,
    router,
    notificationManager,
    getConfig: () => notificationManager.getConfig().slack,
  });
  notificationManager.registerWatcher(slackWatcher);

  const githubWatcher = createGitHubWatcher({
    router,
    notificationManager,
    getConfig: () => notificationManager.getConfig().github,
  });
  notificationManager.registerWatcher(githubWatcher);

  const notifConfig = notificationManager.getConfig();
  if (notifConfig.enabled) {
    notificationManager.startWatching();
  }

  // ─── Smart task services ─────────────────────────────────────
  const taskDecomposer = createTaskDecomposer({ claudeClient });
  const githubImporter = createGithubImporter({ githubService, taskService });

  // ─── Misc services ───────────────────────────────────────────
  const voiceService = initNonCritical('voice', () => createVoiceService());
  const screenCaptureService = initNonCritical('screenCapture', () =>
    createScreenCaptureService(),
  );
  const appUpdateService = createAppUpdateService(router);

  // ─── Hotkey + quick input ────────────────────────────────────
  // assistantService is created below — quick input references it via closure
  let assistantServiceRef: ReturnType<typeof createAssistantService> | null = null;
  const quickInput = createQuickInputWindow({
    onCommand: (command) => {
      appLogger.info('[Main] Quick command received:', command);
      if (assistantServiceRef) {
        void assistantServiceRef.sendCommand(command);
      }
    },
  });

  const hotkeyManager = createHotkeyManager({
    quickInput,
    getMainWindow,
  });

  const customHotkeys = settingsService.getSettings().hotkeys;
  if (customHotkeys) {
    hotkeyManager.registerFromConfig(customHotkeys);
  } else {
    hotkeyManager.registerDefaults();
  }

  // ─── Data management services ─────────────────────────────────
  const storageInspector = createStorageInspector({ dataDir });
  const cleanupService = createCleanupService({
    dataDir,
    getRetentionSettings: () => settingsService.getSettings().dataRetention,
    router,
  });
  const crashRecovery = createCrashRecovery({
    dataDir,
    listProjectPaths: () => projectService.listProjectsSync().map((p) => p.path),
    listActiveSessions: () => [],
  });

  // ─── Workflow + orchestrator ──────────────────────────────────
  const taskLauncher = createTaskLauncher();
  const agentOrchestrator = createAgentOrchestrator(dataDir, milestonesService ?? undefined);
  const qaRunner = createQaRunner(agentOrchestrator, dataDir, notificationManager);

  // Agent watchdog — monitors active sessions for dead/stale processes
  const agentWatchdog = createAgentWatchdog(agentOrchestrator, {}, notificationManager);
  agentWatchdog.onAlert((alert) => {
    router.emit('event:agent.orchestrator.watchdogAlert', alert);
  });
  agentWatchdog.start();

  // QA auto-trigger — starts QA when tasks enter review
  const qaTrigger = createQaTrigger({ qaRunner, orchestrator: agentOrchestrator, taskRepository, router });

  // Health registry enrollment — register background services for monitoring
  healthRegistry.register('hubHeartbeat', 60_000);
  healthRegistry.register('hubWebSocket', 30_000);

  const suggestionEngine = createSuggestionEngine({
    projectService,
    taskService,
    agentOrchestrator,
  });

  const insightsService = createInsightsService({
    taskService,
    projectService,
    agentOrchestrator,
    qaRunner,
  });

  // ─── Briefing service ────────────────────────────────────────
  const briefingService = createBriefingService({
    router,
    projectService,
    taskService,
    claudeClient,
    notificationManager,
    suggestionEngine,
    agentOrchestrator,
  });
  briefingService.startScheduler();

  // ─── Watch system ────────────────────────────────────────────
  const watchStore = createWatchStore();
  const watchEvaluator = createWatchEvaluator(watchStore);
  const crossDeviceQuery = createCrossDeviceQuery(hubApiClient);

  // ─── Assistant service ───────────────────────────────────────
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
    projectService,
  });
  // Fill closure ref for quick input
  assistantServiceRef = assistantService;

  // ─── Webhook relay ───────────────────────────────────────────
  const webhookRelay = createWebhookRelay({ assistantService, router });

  // ─── JSONL progress watcher ──────────────────────────────────
  const progressDir = join(dataDir, 'progress');
  const jsonlProgressWatcher = createJsonlProgressWatcher(progressDir);

  // ─── Tracker service (reads/writes docs/tracker.json) ────────
  const trackerService = createTrackerService(process.cwd());

  // ─── Build the Services bag for IPC handler registration ─────
  const services: Services = {
    agentOrchestrator,
    projectService,
    taskService,
    terminalService,
    settingsService,
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
    dashboardService,
    dockerService,
    notificationManager,
    plannerService,
    spotifyService,
    gitService,
    githubService,
    worktreeService,
    mergeService,
    timeParserService: createTimeParserService(),
    taskDecomposer,
    taskRepository,
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
    cleanupService,
    storageInspector,
    oauthManager,
    codebaseAnalyzer,
    setupPipeline,
    trackerService,
    dataDir,
    providers,
    tokenStore,
  };

  return {
    router,
    services,
    assistantService,
    agentOrchestrator,
    agentWatchdog,
    errorCollector,
    healthRegistry,
    jsonlProgressWatcher,
    qaTrigger,
    watchEvaluator,
    webhookRelay,
    hubConnectionManager,
    terminalService,
    alertService,
    notificationManager,
    briefingService,
    hotkeyManager,
    settingsService,
    hubApiClient,
    taskRepository,
    cleanupService,
    crashRecovery,
    heartbeatIntervalId,
    registeredDeviceId,
  };
}
