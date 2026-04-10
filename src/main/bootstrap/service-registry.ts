/**
 * Service Registry — instantiates all services and their dependencies.
 *
 * Extracted from main/index.ts to keep the entry point small.
 * Every service factory call lives here.
 */

import { hostname } from 'node:os';

import { app } from 'electron';

import { APP_EVENTS } from '@shared/ipc/app/channels';
import { WORKFLOW_ENGINE_EVENTS } from '@shared/ipc/workflow-engine/channels';

import { createOAuthManager } from '../auth/oauth-manager';
import { GITHUB_OAUTH_CONFIG } from '../auth/providers/github';
import { GOOGLE_OAUTH_CONFIG } from '../auth/providers/google';
import { loadOAuthCredentials } from '../auth/providers/provider-config';
import { SLACK_OAUTH_CONFIG } from '../auth/providers/slack';
import { SPOTIFY_OAUTH_CONFIG } from '../auth/providers/spotify';
import { createTokenStore } from '../auth/token-store';
import { createCommandBus } from '../bus';
import { createBusSessionManager } from '../bus/session-manager';
import { initDatabase } from '../db';
import { createAlertService } from '../features/alerts/alert-service';
import { createAppUpdateService } from '../features/app/app-update-service';
import { createAssistantService } from '../features/assistant/assistant-service';
import { createToolExecutor } from '../features/assistant/tool-executor';
import { createWatchEvaluator } from '../features/assistant/watch-evaluator';
import { createWatchStore } from '../features/assistant/watch-store';
import { createUserSessionManager } from '../features/auth';
import { createBriefingService } from '../features/briefing/briefing-service';
import { createSuggestionEngine } from '../features/briefing/suggestion-engine';
import { createCalendarService } from '../features/calendar/calendar-service';
import { createChangelogService } from '../features/changelog/changelog-service';
import { createClaudeClient } from '../features/claude';
import { createDashboardService } from '../features/dashboard/dashboard-service';
import {
  createConfigReader,
  createDataMigrator,
  createUserDataMigrator,
  createUserDataResolver,
} from '../features/data-management';
import { createCleanupService } from '../features/data-management/cleanup-service';
import { createStorageInspector } from '../features/data-management/storage-inspector';
import { createDeviceService } from '../features/device/device-service';
import { createDockerService } from '../features/docker/docker-service';
import { createEmailService } from '../features/email/email-service';
import { createFileTreeService } from '../features/file-tree/file-tree-service';
import { createFitnessService } from '../features/fitness/fitness-service';
import { createGitService } from '../features/git/git-service';
import { createPolyrepoService } from '../features/git/polyrepo-service';
import { createWorktreeService } from '../features/git/worktree-service';
import { createGitHubService } from '../features/github/github-service';
import { createErrorCollector } from '../features/health/error-collector';
import { createHealthRegistry } from '../features/health/health-registry';
import { createHubApiClient } from '../features/hub/hub-api-client';
import { createHubAuthService } from '../features/hub/hub-auth-service';
import { createHubConnectionManager } from '../features/hub/hub-connection';
import { createHubSyncService } from '../features/hub/hub-sync';
import { createWebhookRelay } from '../features/hub/webhook-relay';
import { createIdeasService } from '../features/ideas/ideas-service';
import { createInsightsService } from '../features/insights/insights-service';
import { createMergeService } from '../features/merge/merge-service';
import { createMilestonesService } from '../features/milestones/milestones-service';
import { createNotesService } from '../features/notes/notes-service';
import {
  createGitHubWatcher,
  createNotificationManager,
  createSlackWatcher,
} from '../features/notifications';
import { createPlannerService } from '../features/planner/planner-service';
import { createProgressService } from '../features/progress';
import { createClaudeMdGenerator } from '../features/project/claudemd-generator';
import { createCodebaseAnalyzer } from '../features/project/codebase-analyzer';
import { createDocGenerator } from '../features/project/doc-generator';
import { createGitHubRepoCreator } from '../features/project/github-repo-creator';
import { createProjectService } from '../features/project/project-service';
import { createSetupPipeline } from '../features/project/setup-pipeline';
import { createSkillsResolver } from '../features/project/skills-resolver';
import { createTaskService } from '../features/project/task-service';
import { createQaRunner } from '../features/qa/qa-runner';
import { createQaTrigger } from '../features/qa/qa-trigger';
import { createScreenCaptureService } from '../features/screen/screen-capture-service';
import { createSettingsService } from '../features/settings/settings-service';
import { createSpotifyService } from '../features/spotify/spotify-service';
import {
  createGithubImporter,
  createTaskDecomposer,
  createTaskRepository,
} from '../features/tasks';
import { createTerminalService } from '../features/terminal/terminal-service';
import { createTimeParserService } from '../features/time-parser/time-parser-service';
import { createTrackerService } from '../features/tracker/tracker-service';
import { createVisualizationService } from '../features/visualization';
import { createVoiceService } from '../features/voice/voice-service';
import { createWorkflowEngineService } from '../features/workflow-engine';
import { createWorkflowTemplateService } from '../features/workflow-templates';
import { createWorkspaceSessionManager } from '../features/workspace/workspace-session-manager';
import { IpcRouter } from '../ipc/router';
import { appLogger } from '../lib/logger';
import { createMcpManager } from '../mcp/mcp-manager';
import { createMcpRegistry } from '../mcp/mcp-registry';
import { createGitHubCliClient } from '../mcp-servers/github/github-client';
import { createAgentManagerService } from '../services/agent-manager';
import { createSessionJSONLReaderService } from '../services/session-jsonl/session-jsonl-reader';
import { createTeamWatcherService } from '../services/team-watcher/team-watcher-service';
import { createWorktreeProvisioner } from '../services/worktree-provisioner';
import { createHotkeyManager } from '../tray/hotkey-manager';
import { createQuickInputWindow } from '../tray/quick-input';

import type { OAuthConfig } from '../auth/types';
import type { CommandBus } from '../bus';
import type { BusSessionManager } from '../bus/session-manager';
import type { AdcDatabase } from '../db';
import type { UserSessionManager } from '../features/auth';
import type { HubApiClient } from '../features/hub/hub-api-client';
import type { TaskRepository } from '../features/tasks/types';
import type { WorkspaceSessionManager } from '../features/workspace/workspace-session-manager';
import type { Services } from '../ipc';
import type { AgentManagerService } from '../services/agent-manager';
import type { SessionJSONLReaderService } from '../services/session-jsonl/session-jsonl-reader';
import type { TeamWatcherService } from '../services/team-watcher/team-watcher-service';

/** Everything createServiceRegistry produces — services + extras needed for lifecycle/event wiring. */
export interface ServiceRegistryResult {
  router: IpcRouter;
  services: Services;
  db: AdcDatabase;
  commandBus: CommandBus;
  busSessionManager: BusSessionManager;
  agentManagerService: AgentManagerService;
  workspaceSessionManager: WorkspaceSessionManager;
  assistantService: ReturnType<typeof createAssistantService>;
  errorCollector: ReturnType<typeof createErrorCollector>;
  healthRegistry: ReturnType<typeof createHealthRegistry>;
  qaTrigger: ReturnType<typeof createQaTrigger>;
  watchEvaluator: ReturnType<typeof createWatchEvaluator>;
  webhookRelay: ReturnType<typeof createWebhookRelay>;
  hubConnectionManager: ReturnType<typeof createHubConnectionManager>;
  terminalService: ReturnType<typeof createTerminalService>;
  alertService: ReturnType<typeof createAlertService>;
  notificationManager: ReturnType<typeof createNotificationManager>;
  briefingService: ReturnType<typeof createBriefingService>;
  hotkeyManager: ReturnType<typeof createHotkeyManager>;
  quickInput: ReturnType<typeof createQuickInputWindow>;
  settingsService: ReturnType<typeof createSettingsService>;
  cleanupService: ReturnType<typeof createCleanupService>;
  teamWatcherService: TeamWatcherService;
  sessionJsonlReaderService: SessionJSONLReaderService;
  hubApiClient: HubApiClient;
  taskRepository: TaskRepository;
  heartbeatIntervalId: ReturnType<typeof setInterval> | null;
  registeredDeviceId: string | null;
  userSessionManager: UserSessionManager;
}

/**
 * Instantiates every service in the app, wires cross-service dependencies,
 * and returns the full registry for IPC/event/lifecycle wiring.
 */
export function createServiceRegistry(
  getMainWindow: () => Electron.BrowserWindow | null,
): ServiceRegistryResult {
  const router = new IpcRouter(getMainWindow);

  // ─── Resolve data directory (may be user-configured) ─────────
  const defaultDataDir = app.getPath('userData');
  const configReader = createConfigReader(defaultDataDir);
  const dataMigrator = createDataMigrator(configReader);

  // Run pending migration before opening database
  const migrationResult = dataMigrator.runPendingMigration();
  if (migrationResult.error) {
    appLogger.error(`[Bootstrap] Data migration failed: ${migrationResult.error}`);
  }

  const dataDir = configReader.resolveDataDir();

  // ─── Database (created early — many services depend on it) ──
  const db = initDatabase(dataDir);

  // ─── User session management ─────────────────────────────────
  const userDataResolver = createUserDataResolver(dataDir);
  const userDataMigrator = createUserDataMigrator();
  const userSessionManager = createUserSessionManager(router);

  // ─── Error collector + health registry (created early) ──────
  const errorCollector = createErrorCollector(dataDir, {
    onError: (entry) => {
      router.emit(APP_EVENTS.ERROR.OCCURRED, entry);
    },
    onCapacityAlert: (count, message) => {
      router.emit(APP_EVENTS.CAPACITY.ALERT, { count, message });
    },
    onDataRecovery: (store, message) => {
      router.emit(APP_EVENTS.DATA.RECOVERY, { store, message });
    },
  });
  const healthRegistry = createHealthRegistry({
    onUnhealthy: (serviceName, missedCount) => {
      router.emit(APP_EVENTS.SERVICE.UNHEALTHY, { serviceName, missedCount });
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
        severity: 'warning',
        tier: 'app',
        category: 'service',
        message: `Service initialization failed: ${name} - ${msg}`,
      });
      return null;
    }
  }

  // ─── OAuth + MCP infrastructure ──────────────────────────────
  const tokenStore = createTokenStore({ db, dataDir });
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
  const hubConnectionManager = createHubConnectionManager({ router, db, dataDir });

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
  const settingsService = createSettingsService({ db, dataDir });

  // ─── Task repository (local-first + Hub mirror) ──────────────
  const taskRepository = createTaskRepository({
    taskService,
    hubApiClient,
    hubConnectionManager,
    projectService,
  });

  // ─── Persistence services ────────────────────────────────────
  const notesService = createNotesService({ db, dataDir, router });
  const dashboardService = createDashboardService({ db, dataDir, router });
  const dockerService = createDockerService();
  const plannerService = createPlannerService({ db, dataDir, router });
  const alertService = createAlertService({ db, router, dataDir });
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
    createMilestonesService({ db, dataDir, router }),
  );
  const ideasService = initNonCritical('ideas', () => createIdeasService({ db, dataDir, router }));
  const changelogService = initNonCritical('changelog', () =>
    createChangelogService({ db, router, dataDir }),
  );
  const fitnessService = initNonCritical('fitness', () =>
    createFitnessService({ db, dataDir, router }),
  );
  const emailService = createEmailService({ db, dataDir, router });

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
  const spotifyService = initNonCritical('spotify', () => createSpotifyService({ oauthManager }));
  const calendarService = initNonCritical('calendar', () =>
    createCalendarService({ oauthManager }),
  );
  const claudeClient = createClaudeClient({
    router,
    getApiKey: () => settingsService.getSettings().anthropicApiKey,
  });

  // ─── Notifications ───────────────────────────────────────────
  const notificationManager = createNotificationManager(router, db, dataDir);

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
  const screenCaptureService = initNonCritical('screenCapture', () => createScreenCaptureService());
  const appUpdateService = createAppUpdateService(router);

  // ─── Hotkey + quick input ────────────────────────────────────
  // assistantService is created below — quick input references it via closure
  let assistantServiceRef: ReturnType<typeof createAssistantService> | null = null;
  const quickInput = createQuickInputWindow({
    onCommand: (command) => {
      appLogger.info('[Main] Quick command received:', command);
      if (assistantServiceRef) {
        assistantServiceRef.sendCommand(command);
      }
      // Bring main window to foreground so user can see the assistant response
      const win = getMainWindow();
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
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
  // ─── Workflow + templates ─────────────────────────────────────
  const workflowTemplateService = createWorkflowTemplateService({ dataDir });

  // ─── Agent Manager (v2 — headless stream-json) ──────────────
  const agentManagerService = createAgentManagerService({ router });

  // ─── Command Bus + Session Manager ─────────────────────────
  const commandBus = createCommandBus(db);
  const busSessionManager = createBusSessionManager(db, agentManagerService);
  busSessionManager.recoverInterrupted();

  // ─── WorkflowEngine service ──────────────────────────────────
  const workflowEngineService = createWorkflowEngineService({
    db,
    busSessionManager,
    gitService,
    templateService: workflowTemplateService,
    progressBaseDir: dataDir,
    onStateChanged: (event) => {
      router.emit(WORKFLOW_ENGINE_EVENTS.STATE.CHANGED, event);
    },
    onCompleted: (event) => {
      router.emit(WORKFLOW_ENGINE_EVENTS.RUN.COMPLETED, event);
    },
    onError: (event) => {
      router.emit(WORKFLOW_ENGINE_EVENTS.RUN.ERROR, event);
    },
  });

  // ─── Worktree provisioner (isolates team-lead sessions) ──────
  const worktreeProvisioner = createWorktreeProvisioner();

  // ─── Workspace session manager ───────────────────────────────
  const workspaceSessionManager = createWorkspaceSessionManager(
    agentManagerService,
    worktreeProvisioner,
    getMainWindow,
    busSessionManager,
  );

  const qaRunner = createQaRunner(busSessionManager, dataDir, notificationManager);

  // QA auto-trigger — starts QA when tasks enter review
  const qaTrigger = createQaTrigger({
    qaRunner,
    busSessionManager,
    taskRepository,
    router,
  });

  // Health registry enrollment — register background services for monitoring
  healthRegistry.register('hubHeartbeat', 60_000);
  healthRegistry.register('hubWebSocket', 30_000);

  const suggestionEngine = createSuggestionEngine({
    projectService,
    taskService,
    busSessionManager,
  });

  const insightsService = createInsightsService({
    taskService,
    projectService,
    busSessionManager,
    qaRunner,
  });

  // ─── Briefing service ────────────────────────────────────────
  const briefingService = createBriefingService({
    db,
    dataDir,
    router,
    projectService,
    taskService,
    claudeClient,
    notificationManager,
    suggestionEngine,
    busSessionManager,
  });
  briefingService.startScheduler();

  // ─── Watch system ────────────────────────────────────────────
  const watchStore = createWatchStore();
  const watchEvaluator = createWatchEvaluator(watchStore);

  // ─── Assistant service ───────────────────────────────────────
  const toolExecutor = createToolExecutor({
    notesService,
    milestonesService: milestonesService ?? null,
    ideasService: ideasService ?? null,
    plannerService,
    projectService,
    taskRepository,
    briefingService,
    changelogService: changelogService ?? null,
    gitToolDeps: {
      projectService,
      gitService,
      githubService,
    },
    workspaceSessionManager,
    sendEvent: (channel, payload) => {
      getMainWindow()?.webContents.send(channel, payload);
    },
  });
  const assistantService = createAssistantService({
    getWindow: getMainWindow,
    agentManager: agentManagerService,
    toolExecutor,
  });
  // Fill closure ref for quick input
  assistantServiceRef = assistantService;

  // ─── Webhook relay ───────────────────────────────────────────
  const webhookRelay = createWebhookRelay({ assistantService, router });

  // ─── Agent dashboard services (Layer 1: Agent Visibility) ────
  const teamWatcherService = createTeamWatcherService();
  const sessionJsonlReaderService = createSessionJSONLReaderService();
  const fileTreeService = createFileTreeService();

  // ─── Tracker service (reads/writes docs/tracker.json) ────────
  const trackerService = createTrackerService(process.cwd());

  // ─── Visualization service (stateless — reads from disk on each call) ───
  const visualizationService = createVisualizationService(agentManagerService);

  // ─── Progress service (task pipeline — reads/writes progress/ dir) ──────
  const progressService = createProgressService(process.cwd(), agentManagerService, db);

  // ─── Build the Services bag for IPC handler registration ─────
  const services: Services = {
    commandBus,
    busSessionManager,
    agentManagerService,
    progressService,
    teamWatcherService: null,
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
    fileTreeService,
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
    workflowTemplateService,
    cleanupService,
    storageInspector,
    oauthManager,
    codebaseAnalyzer,
    setupPipeline,
    trackerService,
    visualizationService,
    userSessionManager,
    workspaceSessionManager,
    workflowEngineService,
    configReader,
    dataMigrator,
    dataDir,
    providers,
    tokenStore,
  };

  // ─── User session change handling ────────────────────────────
  // All domain services now use SQLite (shared db), so no per-user
  // directory reinitialization is needed. Session changes only trigger
  // data migration for any remaining file-based stores.
  userSessionManager.onSessionChange((session) => {
    if (session) {
      const userDataDir = userDataResolver.getUserDataDir(session.userId);
      userDataMigrator.migrateIfNeeded(dataDir, userDataDir);
    }
  });

  return {
    router,
    services,
    db,
    commandBus,
    busSessionManager,
    agentManagerService,
    workspaceSessionManager,
    assistantService,
    errorCollector,
    healthRegistry,
    qaTrigger,
    watchEvaluator,
    webhookRelay,
    hubConnectionManager,
    terminalService,
    alertService,
    notificationManager,
    briefingService,
    hotkeyManager,
    quickInput,
    settingsService,
    hubApiClient,
    taskRepository,
    cleanupService,
    teamWatcherService,
    sessionJsonlReaderService,
    heartbeatIntervalId,
    registeredDeviceId,
    userSessionManager,
  };
}
