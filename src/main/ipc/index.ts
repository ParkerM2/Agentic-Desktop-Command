/**
 * IPC Handler Registry
 *
 * Wires all domain handlers to the IPC router.
 * Each handler file is thin — it maps channels to service calls.
 */

import { AGENT_DASHBOARD } from '@shared/ipc/agent-dashboard/channels';
import { FITNESS } from '@shared/ipc/fitness/channels';
import { CHANGELOG } from '@shared/ipc/misc/changelog.channels';
import { IDEAS } from '@shared/ipc/misc/ideas.channels';
import { MILESTONES } from '@shared/ipc/misc/milestones.channels';
import { SCREEN } from '@shared/ipc/misc/screen.channels';
import { VOICE } from '@shared/ipc/misc/voice.channels';
import { WORKSPACES } from '@shared/ipc/misc/workspaces.channels';

import { registerAgentDashboardHandlers } from '../features/agent-dashboard/agent-dashboard-handlers';
import { registerAlertHandlers } from '../features/alerts/alert-handlers';
import { registerAppHandlers } from '../features/app/app-handlers';
import { registerAppUpdateHandlers } from '../features/app/app-update-handlers';
import { registerDockerHandlers } from '../features/app/docker';
import { registerErrorHandlers } from '../features/app/health';
import { registerWindowHandlers } from '../features/app/window-handlers';
import { registerAssistantHandlers } from '../features/assistant/assistant-handlers';
import { registerAuthHandlers } from '../features/auth/auth-handlers';
import { registerBriefingHandlers } from '../features/briefing/briefing-handlers';
import { registerBusHandlers } from '../features/bus/bus-handlers';
import { registerChangelogHandlers } from '../features/changelog/changelog-handlers';
import { registerClaudeHandlers } from '../features/claude/claude-handlers';
import { registerDashboardHandlers } from '../features/dashboard/dashboard-handlers';
import { registerFilesHandlers } from '../features/file-tree/files-handlers';
import { registerFitnessHandlers } from '../features/fitness/fitness-handlers';
import { registerGitHandlers } from '../features/git/git-handlers';
import { registerDeviceHandlers } from '../features/hub/device';
import { registerHubHandlers } from '../features/hub/hub-handlers';
import { registerIdeasHandlers } from '../features/ideas/ideas-handlers';
import { registerInsightsHandlers } from '../features/insights/insights-handlers';
import { registerIntegrationsHandlers } from '../features/integrations/integrations-handlers';
import { registerMcpHandlers } from '../features/mcp/mcp-handlers';
import { registerMergeHandlers } from '../features/merge/merge-handlers';
import { registerMilestonesHandlers } from '../features/milestones/milestones-handlers';
import { registerNotesHandlers } from '../features/notes/notes-handlers';
import { registerOAuthHandlers } from '../features/oauth/oauth-handlers';
import { registerPlannerHandlers } from '../features/planner/planner-handlers';
import { registerProgressHandlers } from '../features/progress/progress-handlers';
import { registerProjectHandlers } from '../features/project/project-handlers';
import { registerQaHandlers } from '../features/qa/qa-handlers';
import { registerQaRecorderHandlers } from '../features/qa/recorder/recorder-handlers';
import { registerDataDirHandlers, registerDataManagementHandlers } from '../features/settings/data-management';
import { registerHotkeyHandlers } from '../features/settings/hotkeys';
import { registerScreenHandlers } from '../features/settings/screen';
import { registerSecurityHandlers } from '../features/settings/security-handlers';
import { registerSettingsHandlers } from '../features/settings/settings-handlers';
import { registerVoiceHandlers } from '../features/settings/voice';
import { registerWebhookSettingsHandlers } from '../features/settings/webhook-settings-handlers';
import { registerTerminalHandlers } from '../features/terminal/terminal-handlers';
import { registerTimeHandlers } from '../features/time-parser/time-handlers';
import { registerTrackerHandlers } from '../features/tracker/tracker-handlers';
import { registerVisualizationHandlers } from '../features/visualization/visualization-handlers';
import { registerWorkflowHandlers } from '../features/workflow/workflow-handlers';
import { registerWorkspaceHandlers } from '../features/workspace/workspace-handlers';



import type { IpcRouter } from './router';
import type { AgentManager } from '../agent-host/agent-host-client';
import type { OAuthManager } from '../auth/oauth-manager';
import type { TokenStore } from '../auth/token-store';
import type { OAuthConfig } from '../auth/types';
import type { CommandBus } from '../bus';
import type { BusSessionManager } from '../bus/session-manager';
import type { TeamWatcherService } from '../features/agent-dashboard/agent-dashboard-handlers';
import type { AlertService } from '../features/alerts/alert-service';
import type { AppUpdateService } from '../features/app/app-update-service';
import type { DockerService } from '../features/app/docker';
import type { ErrorCollectorHandler, HealthRegistryHandler } from '../features/app/health';
import type { AssistantService } from '../features/assistant/assistant-service';
import type { UserSessionManager } from '../features/auth';
import type { BriefingService } from '../features/briefing/briefing-service';
import type { ChangelogService } from '../features/changelog/changelog-service';
import type { ClaudeClient } from '../features/claude';
import type { DashboardService } from '../features/dashboard/dashboard-service';
import type { FileTreeService } from '../features/file-tree/file-tree-service';
import type { FitnessService } from '../features/fitness/fitness-service';
import type { GitService } from '../features/git/git-service';
import type { WorktreeService } from '../features/git/worktree-service';
import type { DeviceService } from '../features/hub/device';
import type { HubApiClient } from '../features/hub/hub-api-client';
import type { HubAuthService } from '../features/hub/hub-auth-service';
import type { HubConnectionManager } from '../features/hub/hub-connection';
import type { HubSyncService } from '../features/hub/hub-sync';
import type { IdeasService } from '../features/ideas/ideas-service';
import type { InsightsService } from '../features/insights/insights-service';
import type { CalendarService } from '../features/integrations/calendar';
import type { EmailService } from '../features/integrations/email/email-service';
import type { GitHubService } from '../features/integrations/github-integration';
import type { NotificationManager } from '../features/integrations/notifications';
import type { SpotifyService } from '../features/integrations/spotify';
import type { MergeService } from '../features/merge/merge-service';
import type { MilestonesService } from '../features/milestones/milestones-service';
import type { NotesService } from '../features/notes/notes-service';
import type { PlannerService } from '../features/planner/planner-service';
import type { ProgressService } from '../features/progress/progress-service';
import type { CodebaseAnalyzerService } from '../features/project/codebase-analyzer';
import type { ProjectService } from '../features/project/project-service';
import type { SetupPipelineService } from '../features/project/setup-pipeline';
import type { QaRunner } from '../features/qa/qa-types';
import type { QaRecorderService } from '../features/qa/recorder';
import type { StorageInspector, DataMigrator , ConfigReader , CleanupService  } from '../features/settings/data-management';
import type { ScreenCaptureService } from '../features/settings/screen';
import type { SettingsService } from '../features/settings/settings-service';
import type { VoiceService } from '../features/settings/voice';
import type { TerminalService } from '../features/terminal/terminal-service';
import type { TimeParserService } from '../features/time-parser/time-parser-service';
import type { TrackerService } from '../features/tracker/tracker-service';
import type { VisualizationService } from '../features/visualization';
import type { WorkflowEngineService } from '../features/workflow/engine';
import type { WorkflowTemplateService } from '../features/workflow/templates';
import type { WorkspaceSessionManager } from '../features/workspace/workspace-session-manager';
import type { McpManager } from '../mcp/mcp-manager';
import type { HotkeyManager } from '../tray/hotkey-manager';

export interface Services {
  commandBus: CommandBus;
  busSessionManager: BusSessionManager;
  agentManagerService: AgentManager;
  projectService: ProjectService;
  terminalService: TerminalService;
  settingsService: SettingsService;
  claudeClient: ClaudeClient;
  deviceService: DeviceService;
  alertService: AlertService;
  assistantService: AssistantService;
  calendarService: CalendarService;
  changelogService: ChangelogService | null;
  emailService: EmailService;
  errorCollector: ErrorCollectorHandler;
  fitnessService: FitnessService | null;
  healthRegistry: HealthRegistryHandler;
  hubConnectionManager: HubConnectionManager;
  hubSyncService: HubSyncService;
  ideasService: IdeasService | null;
  insightsService: InsightsService;
  mcpManager: McpManager;
  milestonesService: MilestonesService | null;
  notesService: NotesService;
  notificationManager: NotificationManager;
  plannerService: PlannerService;
  spotifyService: SpotifyService;
  gitService: GitService;
  githubService: GitHubService;
  worktreeService: WorktreeService;
  mergeService: MergeService;
  timeParserService: TimeParserService;
  voiceService: VoiceService | null;
  screenCaptureService: ScreenCaptureService | null;
  briefingService: BriefingService;
  hotkeyManager: HotkeyManager;
  appUpdateService: AppUpdateService;
  hubApiClient: HubApiClient;
  hubAuthService: HubAuthService;
  qaRunner: QaRunner;
  qaRecorderService: QaRecorderService;
  workflowTemplateService: WorkflowTemplateService;
  dashboardService: DashboardService;
  dockerService: DockerService;
  oauthManager: OAuthManager;
  configReader: ConfigReader;
  dataMigrator: DataMigrator;
  cleanupService: CleanupService;
  storageInspector: StorageInspector;
  codebaseAnalyzer: CodebaseAnalyzerService;
  setupPipeline: SetupPipelineService;
  trackerService: TrackerService;
  visualizationService: VisualizationService;
  userSessionManager: UserSessionManager;
  workspaceSessionManager: WorkspaceSessionManager;
  progressService: ProgressService;
  teamWatcherService: TeamWatcherService | null;
  fileTreeService: FileTreeService;
  workflowEngineService: WorkflowEngineService;
  dataDir: string;
  providers: Map<string, OAuthConfig>;
  tokenStore: TokenStore;
}

/** Creates a handler that throws a "service unavailable" error for mutation channels. */
function unavailable(service: string) {
  return () => { throw new Error(`${service} service unavailable`); };
}

/** Returns an empty array wrapped in a resolved promise (typed loosely for fallback stubs). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function emptyList(): Promise<any[]> { return Promise.resolve([]); }

/** Returns a fallback value wrapped in a resolved promise (typed loosely for fallback stubs). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fallback(value: unknown): () => Promise<any> { return () => Promise.resolve(value); }

export function registerAllHandlers(router: IpcRouter, services: Services): void {
  registerProjectHandlers(
    router,
    services.projectService,
    services.codebaseAnalyzer,
    services.setupPipeline,
  );
  registerTerminalHandlers(router, services.terminalService);
  registerSettingsHandlers(router, services.settingsService, {
    dataDir: services.dataDir,
    providers: services.providers,
  });
  registerAlertHandlers(router, services.alertService);
  registerAuthHandlers(router, {
    hubAuthService: services.hubAuthService,
    userSessionManager: services.userSessionManager,
  });
  registerAppHandlers(router, {
    tokenStore: services.tokenStore,
    providers: services.providers,
  });
  registerAssistantHandlers(router, services.assistantService);
  registerIntegrationsHandlers(router, {
    email: services.emailService,
    notifications: services.notificationManager,
    spotify: services.spotifyService,
    github: services.githubService,
    calendar: services.calendarService,
  });
  registerClaudeHandlers(router, services.claudeClient);
  if (services.changelogService) {
    registerChangelogHandlers(router, services.changelogService);
  } else {
    router.handle(CHANGELOG.LIST.ENTRIES, emptyList);
    router.handle(CHANGELOG.ADD.ENTRY, unavailable('Changelog'));
    router.handle(CHANGELOG.GENERATE.ENTRY, unavailable('Changelog'));
  }
  registerErrorHandlers(router, services.errorCollector, services.healthRegistry);
  registerFilesHandlers(router, services.fileTreeService);
  if (services.fitnessService) {
    registerFitnessHandlers(router, services.fitnessService);
  } else {
    router.handle(FITNESS.LOG.WORKOUT, unavailable('Fitness'));
    router.handle(FITNESS.LIST.WORKOUTS, emptyList);
    router.handle(FITNESS.DELETE.WORKOUT, unavailable('Fitness'));
    router.handle(FITNESS.LOG.MEASUREMENT, unavailable('Fitness'));
    router.handle(FITNESS.GET.MEASUREMENTS, emptyList);
    router.handle(FITNESS.GET.STATS, fallback({ totalWorkouts: 0, workoutsThisWeek: 0, totalVolume: 0, currentStreak: 0, longestStreak: 0, averageWorkoutDuration: 0 }));
    router.handle(FITNESS.SET.GOAL, unavailable('Fitness'));
    router.handle(FITNESS.LIST.GOALS, emptyList);
    router.handle(FITNESS.UPDATE['GOAL-PROGRESS'], unavailable('Fitness'));
    router.handle(FITNESS.DELETE.GOAL, unavailable('Fitness'));
  }
  if (services.ideasService) {
    registerIdeasHandlers(router, services.ideasService);
  } else {
    router.handle(IDEAS.LIST.ALL, emptyList);
    router.handle(IDEAS.CREATE.IDEA, unavailable('Ideas'));
    router.handle(IDEAS.UPDATE.IDEA, unavailable('Ideas'));
    router.handle(IDEAS.DELETE.IDEA, unavailable('Ideas'));
    router.handle(IDEAS.VOTE.IDEA, unavailable('Ideas'));
  }
  registerInsightsHandlers(router, services.insightsService);
  if (services.milestonesService) {
    registerMilestonesHandlers(router, services.milestonesService);
  } else {
    router.handle(MILESTONES.LIST.ALL, emptyList);
    router.handle(MILESTONES.CREATE.MILESTONE, unavailable('Milestones'));
    router.handle(MILESTONES.UPDATE.MILESTONE, unavailable('Milestones'));
    router.handle(MILESTONES.DELETE.MILESTONE, unavailable('Milestones'));
    router.handle(MILESTONES.ADD.TASK, unavailable('Milestones'));
    router.handle(MILESTONES.TOGGLE.TASK, unavailable('Milestones'));
  }
  registerNotesHandlers(router, services.notesService);
  registerPlannerHandlers(router, services.plannerService);
  registerGitHandlers(router, services.gitService, services.worktreeService);
  registerHubHandlers(
    router,
    services.hubConnectionManager,
    services.hubSyncService,
    services.hubApiClient,
  );
  registerMcpHandlers(router, services.mcpManager);
  registerMergeHandlers(router, services.mergeService);
  registerOAuthHandlers(router, services.oauthManager);
  registerTimeHandlers(router, services.timeParserService);
  if (services.voiceService) {
    registerVoiceHandlers(router, services.voiceService);
  } else {
    router.handle(VOICE.GET.CONFIG, fallback({ enabled: false, language: 'en', inputMode: 'push_to_talk' as const }));
    router.handle(VOICE.UPDATE.CONFIG, unavailable('Voice'));
    router.handle(VOICE.CHECK.PERMISSION, fallback({ granted: false, canRequest: false }));
  }
  registerWebhookSettingsHandlers(router, services.settingsService);
  if (services.screenCaptureService) {
    registerScreenHandlers(router, services.screenCaptureService);
  } else {
    router.handle(SCREEN.LIST.SOURCES, emptyList);
    router.handle(SCREEN.CAPTURE.SCREEN, unavailable('Screen capture'));
    router.handle(SCREEN.CHECK.PERMISSION, fallback({ status: 'denied' as const, platform: process.platform }));
  }
  registerBriefingHandlers(router, services.briefingService);
  registerHotkeyHandlers(router, services.settingsService, services.hotkeyManager);
  registerAppUpdateHandlers(router, services.appUpdateService);
  registerWorkflowHandlers(
    router,
    services.hubApiClient,
    services.workflowEngineService,
    services.workflowTemplateService,
  );
  registerWorkspaceHandlers(router, services.workspaceSessionManager);
  registerDeviceHandlers(router, services.deviceService);
  registerQaHandlers(
    router,
    services.qaRunner,
    services.busSessionManager,
    services.progressService,
  );
  registerQaRecorderHandlers(router, services.qaRecorderService);
  registerDashboardHandlers(router, services.dashboardService);
  registerDockerHandlers(router, services.dockerService);
  registerSecurityHandlers(router, services.settingsService);
  registerDataManagementHandlers(
    router,
    services.cleanupService,
    services.storageInspector,
    services.settingsService,
    services.dataDir,
  );
  registerDataDirHandlers(router, services.configReader, services.dataMigrator);
  registerWindowHandlers(router);
  registerTrackerHandlers(router, services.trackerService);
  registerVisualizationHandlers(router, services.visualizationService, services.projectService);
  registerProgressHandlers(router, services.progressService);
  registerBusHandlers(router, services.commandBus, services.busSessionManager);

  // Workspaces CRUD — Hub-backed, no local service yet.
  // Returns empty list for reads; throws descriptive error for mutations
  // since the typed contract requires a full workspace object on success.
  router.handle(WORKSPACES.LIST.ALL, () => Promise.resolve([]));
  router.handle(WORKSPACES.CREATE.WORKSPACE, () => {
    throw new Error('Cannot create workspace: Hub connection required. Connect to a Hub first.');
  });
  router.handle(WORKSPACES.UPDATE.WORKSPACE, () => {
    throw new Error('Cannot update workspace: Hub connection required. Connect to a Hub first.');
  });
  router.handle(WORKSPACES.DELETE.WORKSPACE, () => {
    throw new Error('Cannot delete workspace: Hub connection required. Connect to a Hub first.');
  });

  if (services.teamWatcherService) {
    registerAgentDashboardHandlers(
      router,
      services.agentManagerService,
      services.teamWatcherService,
      services.qaRunner,
      services.gitService,
      services.busSessionManager,
    );
  } else {
    router.handle(AGENT_DASHBOARD.SPAWN['PROJECT-OWNER'], unavailable('Agent dashboard'));
    router.handle(AGENT_DASHBOARD.SPAWN['TEAM-LEAD'], unavailable('Agent dashboard'));
    router.handle(AGENT_DASHBOARD.LIST.SESSIONS, emptyList);
    router.handle(AGENT_DASHBOARD.GET.SESSION, fallback(null));
    router.handle(AGENT_DASHBOARD.SEND.MESSAGE, fallback({ success: false }));
    router.handle(AGENT_DASHBOARD.STOP.SESSION, fallback({ success: false }));
    router.handle(AGENT_DASHBOARD.GET['FILES-CHANGED'], emptyList);
    router.handle(AGENT_DASHBOARD.GET['TASKS-FOR-FEATURE'], emptyList);
    router.handle(AGENT_DASHBOARD.GET.TASK, fallback(null));
    router.handle(AGENT_DASHBOARD.GET['QA-SESSION'], fallback(null));
    router.handle(AGENT_DASHBOARD.LIST['QA-SESSIONS'], emptyList);
    router.handle(AGENT_DASHBOARD.LIST['SESSIONS-FOR-TASK'], emptyList);
    router.handle(AGENT_DASHBOARD.GET['SESSION-LOG'], emptyList);
    router.handle(AGENT_DASHBOARD.GET['GIT-DIFF'], fallback({ diff: '' }));
  }
}
