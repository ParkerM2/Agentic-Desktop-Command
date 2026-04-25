/**
 * Service Registry — instantiates all services and their dependencies.
 *
 * Extracted from main/index.ts to keep the entry point small.
 *
 * Tier 0 (7 eager): SQLite DB, IPC Router, Command Bus, Auth, Settings,
 *                   Error collector, Project service
 * Tier 1 (~60 lazy): All other services via lazyService() — initialized
 *                    on first property access (first IPC call).
 */

import { existsSync } from 'node:fs';

import { app } from 'electron';

import { APP_EVENTS } from '@shared/ipc/app/channels';
import { WORKFLOW_ENGINE_EVENTS } from '@shared/ipc/workflow-engine/channels';
import { computeSchemaHash } from '@shared/replication/schema-hash';
import type { AppChannel } from '@shared/types/channel';

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
import { LEGACY_HUB_ID, LOCAL_HUB_ID, migrateLegacyDb, resolveActiveDbPath } from '../db/legacy-migrator';
import { createAlertService } from '../features/alerts/alert-service';
import { createAppUpdateService } from '../features/app/app-update-service';
import {
  createErrorCollector,
  createHealthRegistry,
  createHealthService,
} from '../features/app/health';
import { createAssistantService } from '../features/assistant/assistant-service';
import { createToolExecutor } from '../features/assistant/tool-executor';
import { createWatchEvaluator } from '../features/assistant/watch-evaluator';
import { createWatchStore } from '../features/assistant/watch-store';
import { createUserSessionManager } from '../features/auth';
import { createBriefingService } from '../features/briefing/briefing-service';
import { createSuggestionEngine } from '../features/briefing/suggestion-engine';
import { createChangelogService } from '../features/changelog/changelog-service';
import { createClaudeClient } from '../features/claude';
import { createDashboardService } from '../features/dashboard/dashboard-service';
import {
  createCleanupService,
  createConfigReader,
  createDataMigrator,
  createStorageInspector,
  createUserDataMigrator,
  createUserDataResolver,
} from '../features/data-management';
import { createDockerService } from '../features/docker';
import { createFileTreeService } from '../features/files/files-service';
import { createFitnessService } from '../features/fitness/fitness-service';
import { createGitService } from '../features/git/git-service';
import { createPolyrepoService } from '../features/git/polyrepo-service';
import { createWorktreeService } from '../features/git/worktree-service';
import { createGitHubService } from '../features/github';
import { createIdeasService } from '../features/ideas/ideas-service';
import { createInsightsService } from '../features/insights/insights-service';
import { createIntegrationsService } from '../features/integrations/integrations-service';
import { createMergeService } from '../features/merge/merge-service';
import { createNotesService } from '../features/notes/notes-service';
import { loadMigrationTags } from '../features/peers/migration-tags';
import { loadPeerConfig } from '../features/peers/peer-config';
import { createPeersService, type PeersService } from '../features/peers/peers-service';
import { createReplicationEngine } from '../features/peers/replication-engine';
import { createPlannerService } from '../features/planner/planner-service';
import { createProgressService } from '../features/progress';
import { createClaudeMdGenerator } from '../features/projects/claudemd-generator';
import { createCodebaseAnalyzer } from '../features/projects/codebase-analyzer';
import { createDocGenerator } from '../features/projects/doc-generator';
import { createGitHubRepoCreator } from '../features/projects/github-repo-creator';
import { createProjectService } from '../features/projects/project-service';
import { createSetupPipeline } from '../features/projects/setup-pipeline';
import { createSkillsResolver } from '../features/projects/skills-resolver';
import { createQaRunner } from '../features/qa/qa-runner';
import { createQaTrigger } from '../features/qa/qa-trigger';
import { createRunnersService } from '../features/runners';
import { createScreenCaptureService } from '../features/settings/screen';
import { createSettingsService } from '../features/settings/settings-service';
import { createVoiceService } from '../features/settings/voice';
import { createSpotifyService } from '../features/spotify';
import { createTerminalService } from '../features/terminals/terminals-service';
import { createTestSuiteService } from '../features/test-suite';
import { createVisualizationService } from '../features/visualization';
import { createWorkflowService } from '../features/workflow/workflow-service';
import { createWorkspaceSessionManager } from '../features/workspace/workspace-session-manager';
import { createWorkspacesService } from '../features/workspace/workspaces-service';
import { IpcRouter } from '../ipc/router';
import { lazyService } from '../lib/lazy-service';
import { appLogger } from '../lib/logger';
import { createMcpManager } from '../mcp/mcp-manager';
import { createMcpRegistry } from '../mcp/mcp-registry';
import { createGitHubCliClient } from '../mcp-servers/github/github-client';
import { createSessionJSONLReaderService } from '../services/session-jsonl/session-jsonl-reader';
import { createTeamWatcherService } from '../services/team-watcher/team-watcher-service';
import { createWorktreeProvisioner } from '../services/worktree-provisioner';
import { createHotkeyManager } from '../tray/hotkey-manager';
import { createQuickInputWindow } from '../tray/quick-input';

import type { AgentHostClient } from '../agent-host/agent-host-client';
import type { OAuthConfig } from '../auth/types';
import type { CommandBus } from '../bus';
import type { BusSessionManager } from '../bus/session-manager';
import type { AdcDatabase } from '../db';
import type { UserSessionManager } from '../features/auth';
import type { NotificationManager } from '../features/notifications';
import type { WorkspaceSessionManager } from '../features/workspace/workspace-session-manager';
import type { Services } from '../ipc';
import type { SessionJSONLReaderService } from '../services/session-jsonl/session-jsonl-reader';
import type { TeamWatcherService } from '../services/team-watcher/team-watcher-service';

/** Everything createServiceRegistry produces — services + extras needed for lifecycle/event wiring. */
export interface ServiceRegistryResult {
  router: IpcRouter;
  services: Services;
  db: AdcDatabase;
  commandBus: CommandBus;
  busSessionManager: BusSessionManager;
  agentHostClient: AgentHostClient;
  workspaceSessionManager: WorkspaceSessionManager;
  assistantService: ReturnType<typeof createAssistantService>;
  errorCollector: ReturnType<typeof createErrorCollector>;
  healthRegistry: ReturnType<typeof createHealthRegistry>;
  healthService: ReturnType<typeof createHealthService>;
  qaTrigger: ReturnType<typeof createQaTrigger>;
  watchEvaluator: ReturnType<typeof createWatchEvaluator>;
  terminalService: ReturnType<typeof createTerminalService>;
  alertService: ReturnType<typeof createAlertService>;
  notificationManager: NotificationManager;
  briefingService: ReturnType<typeof createBriefingService>;
  hotkeyManager: ReturnType<typeof createHotkeyManager>;
  quickInput: ReturnType<typeof createQuickInputWindow>;
  settingsService: ReturnType<typeof createSettingsService>;
  cleanupService: ReturnType<typeof createCleanupService>;
  teamWatcherService: TeamWatcherService;
  sessionJsonlReaderService: SessionJSONLReaderService;
  workspacesService: ReturnType<typeof createWorkspacesService>;
  userSessionManager: UserSessionManager;
  disposePeerTransport: () => Promise<void>;
}

/**
 * Instantiates every service in the app, wires cross-service dependencies,
 * and returns the full registry for IPC/event/lifecycle wiring.
 *
 * Tier 0 services are eagerly created at boot. All other services are wrapped
 * in lazyService() and initialize on first property access (first IPC call).
 */
export function createServiceRegistry(
  getMainWindow: () => Electron.BrowserWindow | null,
  agentHostClient: AgentHostClient,
  channel: AppChannel,
): ServiceRegistryResult {
  // ─── Tier 0: Eager — Router, DB, Auth, Settings, Error/Health, Project ───

  const router = new IpcRouter(getMainWindow);

  const defaultDataDir = app.getPath('userData');
  const configReader = createConfigReader(defaultDataDir);
  const dataMigrator = createDataMigrator(configReader);

  const migrationResult = dataMigrator.runPendingMigration();
  if (migrationResult.error) {
    appLogger.error(`[Bootstrap] Data migration failed: ${migrationResult.error}`);
  }

  const dataDir = configReader.resolveDataDir();

  // Move any pre-existing top-level adc.db into hubs/legacy/adc.db before
  // the DB opens. Task 16's config-store migrator writes hubId='legacy'
  // into the v2 blob, so once the DB is open at the new location the
  // records line up.
  //
  // Boot-time hub selection: if a 'legacy' per-hub DB exists (either from
  // this boot's move or a prior boot), open there; otherwise fall back to
  // 'local' for fresh installs. activeHubId from the v2 config is only
  // readable once the DB is open, so a full multi-hub active-hub lookup
  // lives in Task 23.
  // TODO: Task 23 switch active hub — read activeHubId from hub-config
  // and reopen the DB at the selected hub's path on switch.
  migrateLegacyDb(dataDir);
  const legacyDbPath = resolveActiveDbPath(dataDir, LEGACY_HUB_ID);
  const bootHubId = existsSync(legacyDbPath) ? LEGACY_HUB_ID : LOCAL_HUB_ID;
  const db = initDatabase(dataDir, { activeHubId: bootHubId });

  const errorCollector = createErrorCollector(dataDir, {
    onError: (entry) => { router.emit(APP_EVENTS.ERROR.OCCURRED, entry); },
    onCapacityAlert: (count, message) => { router.emit(APP_EVENTS.CAPACITY.ALERT, { count, message }); },
    onDataRecovery: (store, message) => { router.emit(APP_EVENTS.DATA.RECOVERY, { store, message }); },
  });

  const healthRegistry = createHealthRegistry({
    onUnhealthy: (serviceName, missedCount) => {
      router.emit(APP_EVENTS.SERVICE.UNHEALTHY, { serviceName, missedCount });
    },
  });
  const healthService = createHealthService(healthRegistry);

  const settingsService = createSettingsService({ db, dataDir });
  const userSessionManager = createUserSessionManager();
  const projectService = createProjectService({ db });

  const commandBus = createCommandBus(db);
  const busSessionManager = createBusSessionManager(db, agentHostClient);
  busSessionManager.recoverInterrupted();

  const workspacesService = createWorkspacesService({ db });
  workspacesService.init();

  // ─── Tier 1: Infrastructure — deferred ───────────────────────

  const tokenStore = lazyService(() => createTokenStore({ db, dataDir }));

  const savedCreds = loadOAuthCredentials(dataDir);
  const providers = new Map<string, OAuthConfig>([
    ['github', { ...GITHUB_OAUTH_CONFIG, ...savedCreds.get('github') }],
    ['google', { ...GOOGLE_OAUTH_CONFIG, ...savedCreds.get('google') }],
    ['slack', { ...SLACK_OAUTH_CONFIG, ...savedCreds.get('slack') }],
    ['spotify', { ...SPOTIFY_OAUTH_CONFIG, ...savedCreds.get('spotify') }],
  ]);

  const oauthManager = lazyService(() => createOAuthManager({ tokenStore, providers }));
  const mcpRegistry = lazyService(() => createMcpRegistry());
  const mcpManager = lazyService(() => createMcpManager({ registry: mcpRegistry }));

  // ─── Tier 1: Workspace / Git domain ──────────────────────────

  const polyrepoService = lazyService(() => createPolyrepoService());
  const gitService = lazyService(() => createGitService(polyrepoService));
  const worktreeService = lazyService(() => createWorktreeService((id) => projectService.getProjectPath(id)));
  const mergeService = lazyService(() => createMergeService());
  const githubCliClient = lazyService(() => createGitHubCliClient());
  const worktreeProvisioner = lazyService(() => createWorktreeProvisioner());
  const workspaceSessionManager = lazyService(() =>
    createWorkspaceSessionManager(agentHostClient, worktreeProvisioner, getMainWindow, busSessionManager),
  );

  // ─── Tier 1: Project setup domain ────────────────────────────

  const codebaseAnalyzer = lazyService(() => createCodebaseAnalyzer());
  const claudeMdGenerator = lazyService(() => createClaudeMdGenerator());
  const skillsResolver = lazyService(() => createSkillsResolver());
  const docGenerator = lazyService(() => createDocGenerator());
  const githubRepoCreator = lazyService(() => createGitHubRepoCreator());
  const setupPipeline = lazyService(() =>
    createSetupPipeline({
      codebaseAnalyzer,
      claudeMdGenerator,
      skillsResolver,
      docGenerator,
      githubRepoCreator,
      projectService,
      gitService,
      router,
    }),
  );

  // ─── Tier 1: Personal data domain ────────────────────────────

  const notesService = lazyService(() => createNotesService({ db, dataDir, router }));
  const dashboardService = lazyService(() => createDashboardService({ db, dataDir, router }));
  const plannerService = lazyService(() => createPlannerService({ db, dataDir, router }));
  const ideasService = lazyService(() => createIdeasService({ db, dataDir, router }));
  const changelogService = lazyService(() => createChangelogService({ db, router, dataDir }));
  const fitnessService = lazyService(() => createFitnessService({ db, dataDir, router }));
  const dockerService = lazyService(() => createDockerService());
  const voiceService = lazyService(() => createVoiceService({ db }));
  const screenCaptureService = lazyService(() => createScreenCaptureService());

  // ─── Tier 1: External integrations (unified) ─────────────────

  const integrationsService = lazyService(() =>
    createIntegrationsService({ db, dataDir, router, oauthManager }),
  );

  // Convenience accessors — expose sub-services from the unified service
  const emailService = lazyService(() => integrationsService.email);
  const notificationManager = lazyService(() => integrationsService.notifications);
  const spotifyService = lazyService(() => createSpotifyService({ oauthManager }));
  const githubService = lazyService(() => createGitHubService({ client: githubCliClient, router }));
  const calendarService = lazyService(() => integrationsService.calendar);

  const claudeClient = lazyService(() =>
    createClaudeClient({
      router,
      getApiKey: () => settingsService.getSettings().anthropicApiKey,
    }),
  );
  const insightsService = lazyService(() =>
    createInsightsService({ progressService, projectService, busSessionManager, qaRunner }),
  );

  // ─── Tier 1: Alert + terminal ─────────────────────────────────

  const alertService = lazyService(() => {
    const svc = createAlertService({ db, router, dataDir });
    svc.startChecking();
    return svc;
  });

  const terminalService = lazyService(() => createTerminalService(router));

  // ─── Tier 1: Briefing + suggestions ──────────────────────────

  const suggestionEngine = lazyService(() =>
    createSuggestionEngine({ projectService, progressService, busSessionManager }),
  );

  const briefingService = lazyService(() => {
    const svc = createBriefingService({
      db,
      dataDir,
      router,
      projectService,
      progressService,
      claudeClient,
      notificationManager,
      suggestionEngine,
      busSessionManager,
    });
    svc.startScheduler();
    return svc;
  });

  // ─── Tier 1: Watch + Assistant ────────────────────────────────

  const watchStore = lazyService(() => createWatchStore({ db }));
  const watchEvaluator = lazyService(() => createWatchEvaluator(watchStore));

  const toolExecutor = lazyService(() =>
    createToolExecutor({
      notesService,
      ideasService,
      plannerService,
      projectService,
      progressService,
      briefingService,
      changelogService,
      gitToolDeps: { projectService, gitService, githubService },
      workspaceSessionManager,
      sendEvent: (channel, payload) => { getMainWindow()?.webContents.send(channel, payload); },
    }),
  );

  const assistantService = lazyService(() =>
    createAssistantService({
      getWindow: getMainWindow,
      agentManager: agentHostClient,
      toolExecutor,
      db,
    }),
  );

  // ─── Tier 1: QA ──────────────────────────────────────────────

  const qaRunner = lazyService(() => createQaRunner(busSessionManager, dataDir, notificationManager));
  const runnersService = createRunnersService({
    db,
    router,
    projectService: {
      getProjectPath: (id: string) => projectService.getProjectPath(id),
    },
  });
  const testSuiteService = lazyService(() =>
    createTestSuiteService(db, {
      getMainWindow,
      getProjectPath: (id) => projectService.getProjectPath(id),
    }),
  );
  const qaTrigger = lazyService(() =>
    createQaTrigger({ qaRunner, busSessionManager, progressService, router, testSuiteService }),
  );

  // ─── Tier 1: App update + hotkeys ────────────────────────────

  const appUpdateService = lazyService(() => createAppUpdateService({ router, channel }));

  const quickInput = lazyService(() =>
    createQuickInputWindow({
      onCommand: (command) => {
        appLogger.info('[Main] Quick command received:', command);
        assistantService.sendCommand(command);
        const win = getMainWindow();
        if (win) {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
        }
      },
    }),
  );

  const hotkeyManager = lazyService(() => {
    const mgr = createHotkeyManager({ quickInput, getMainWindow });
    const customHotkeys = settingsService.getSettings().hotkeys;
    if (customHotkeys) {
      mgr.registerFromConfig(customHotkeys);
    } else {
      mgr.registerDefaults();
    }
    return mgr;
  });

  // ─── Tier 1: Data management ──────────────────────────────────

  const storageInspector = lazyService(() => createStorageInspector({ dataDir }));
  const cleanupService = lazyService(() =>
    createCleanupService({
      dataDir,
      getRetentionSettings: () => settingsService.getSettings().dataRetention,
      router,
    }),
  );

  // ─── Tier 1: Workflow (unified: engine + templates) ──────────

  const workflowService = lazyService(() =>
    createWorkflowService({
      db,
      busSessionManager,
      gitService,
      dataDir,
      progressBaseDir: dataDir,
      replicationEngine,
      onStateChanged: (event: Parameters<typeof router.emit<typeof WORKFLOW_ENGINE_EVENTS.STATE.CHANGED>>[1]) => { router.emit(WORKFLOW_ENGINE_EVENTS.STATE.CHANGED, event); },
      onCompleted: (event: Parameters<typeof router.emit<typeof WORKFLOW_ENGINE_EVENTS.RUN.COMPLETED>>[1]) => { router.emit(WORKFLOW_ENGINE_EVENTS.RUN.COMPLETED, event); },
      onError: (event: Parameters<typeof router.emit<typeof WORKFLOW_ENGINE_EVENTS.RUN.ERROR>>[1]) => { router.emit(WORKFLOW_ENGINE_EVENTS.RUN.ERROR, event); },
    }),
  );

  const workflowEngineService = lazyService(() => workflowService.engine);
  const workflowTemplateService = lazyService(() => workflowService.templates);

  // ─── Tier 1: Agent dashboard + misc ──────────────────────────

  const teamWatcherService = lazyService(() => createTeamWatcherService());
  const sessionJsonlReaderService = lazyService(() => createSessionJSONLReaderService());
  const fileTreeService = lazyService(() => createFileTreeService());
  const visualizationService = lazyService(() => createVisualizationService(agentHostClient));
  // ─── Peer replication (Phase 3b) ─────────────────────────────
  //
  // PeersService owns peer-identity, TLS, peer-server (TLS https hosting both
  // /pair/* and wss://), mDNS advertise + browse, and the trust store. The
  // renderer drives pairing via IPC; ADC_PEER_REMOTE remains a dev override.
  const peerConfig = loadPeerConfig();

  let peersServiceHandle: PeersService | null = null;
  const replicationEngine = createReplicationEngine({
    db,
    peerIdShort: peerConfig.peerIdShort || 'aaaaaaaa',
    peerIdFull: peerConfig.peerIdFull || 'peer-a',
  });

  if (peerConfig.listenPort > 0) {
    void (async () => {
      try {
        const schemaHash = await computeSchemaHash(loadMigrationTags());
        peersServiceHandle = await createPeersService({
          db,
          dataDir,
          engine: replicationEngine,
          listenPort: peerConfig.listenPort,
          schemaHash,
          preferMdns: peerConfig.preferMdns,
          displayName: peerConfig.displayName ?? null,
        });
      } catch (err) {
        appLogger.error(`[Bootstrap] PeersService failed to start: ${String(err)}`);
      }
    })();
  }

  const peersServiceLazy = lazyService<PeersService>(() => {
    if (peersServiceHandle === null) {
      throw new Error('peers-service not yet initialized — wait for bootstrap to finish');
    }
    return peersServiceHandle;
  });

  const disposePeerTransport = async (): Promise<void> => {
    if (peersServiceHandle) {
      try { await peersServiceHandle.dispose(); }
      catch (err) { appLogger.warn(`[Bootstrap] PeersService dispose failed: ${String(err)}`); }
    }
  };

  const progressService = lazyService(() =>
    createProgressService(process.cwd(), agentHostClient, db, replicationEngine),
  );

  // ─── User session change handling ────────────────────────────

  const userDataResolver = createUserDataResolver(dataDir);
  const userDataMigrator = createUserDataMigrator();

  userSessionManager.onSessionChange((session) => {
    if (session) {
      const userDataDir = userDataResolver.getUserDataDir(session.userId);
      userDataMigrator.migrateIfNeeded(dataDir, userDataDir);
    }
  });

  // ─── Services bag for IPC handler registration ───────────────

  const services: Services = {
    commandBus,
    busSessionManager,
    workspacesService,
    agentManagerService: agentHostClient,
    progressService,
    teamWatcherService,
    projectService,
    terminalService,
    settingsService,
    claudeClient,
    alertService,
    assistantService,
    calendarService,
    changelogService,
    emailService,
    errorCollector,
    fileTreeService,
    fitnessService,
    healthRegistry,
    ideasService,
    insightsService,
    mcpManager,
    notesService,
    dashboardService,
    dockerService,
    notificationManager,
    peersService: peersServiceLazy,
    plannerService,
    spotifyService,
    gitService,
    githubService,
    worktreeService,
    mergeService,
    voiceService,
    screenCaptureService,
    briefingService,
    hotkeyManager,
    appUpdateService,
    qaRunner,
    runnersService,
    testSuiteService,
    workflowTemplateService,
    cleanupService,
    storageInspector,
    oauthManager,
    codebaseAnalyzer,
    setupPipeline,
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

  return {
    router,
    services,
    db,
    commandBus,
    busSessionManager,
    agentHostClient,
    workspaceSessionManager,
    workspacesService,
    assistantService,
    errorCollector,
    healthRegistry,
    healthService,
    qaTrigger,
    watchEvaluator,
    terminalService,
    alertService,
    notificationManager,
    briefingService,
    hotkeyManager,
    quickInput,
    settingsService,
    cleanupService,
    teamWatcherService,
    sessionJsonlReaderService,
    userSessionManager,
    disposePeerTransport,
  };
}
