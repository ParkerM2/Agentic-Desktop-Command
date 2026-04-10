/**
 * IPC Handler Registry
 *
 * Wires all domain handlers to the IPC router.
 * Each handler file is thin — it maps channels to service calls.
 */

import { WORKSPACES } from '@shared/ipc/misc/workspaces.channels';

import { registerAgentDashboardHandlers } from '../features/agent-dashboard/agent-dashboard-handlers';
import { registerAlertHandlers } from '../features/alerts/alert-handlers';
import { registerAppHandlers } from '../features/app/app-handlers';
import { registerAppUpdateHandlers } from '../features/app/app-update-handlers';
import { registerAssistantHandlers } from '../features/assistant/assistant-handlers';
import { registerAuthHandlers } from '../features/auth/auth-handlers';
import { registerBriefingHandlers } from '../features/briefing/briefing-handlers';
import { registerBusHandlers } from '../features/bus/bus-handlers';
import { registerCalendarHandlers } from '../features/calendar/calendar-handlers';
import { registerChangelogHandlers } from '../features/changelog/changelog-handlers';
import { registerClaudeHandlers } from '../features/claude/claude-handlers';
import { registerDashboardHandlers } from '../features/dashboard/dashboard-handlers';
import { registerDataDirHandlers } from '../features/data-management/data-dir-handlers';
import { registerDataManagementHandlers } from '../features/data-management/data-management-handlers';
import { registerDeviceHandlers } from '../features/device/device-handlers';
import { registerDockerHandlers } from '../features/docker/docker-handlers';
import { registerEmailHandlers } from '../features/email/email-handlers';
import { registerFilesHandlers } from '../features/file-tree/files-handlers';
import { registerFitnessHandlers } from '../features/fitness/fitness-handlers';
import { registerGitHandlers } from '../features/git/git-handlers';
import { registerGitHubHandlers } from '../features/github/github-handlers';
import { registerErrorHandlers } from '../features/health/error-handlers';
import { registerHotkeyHandlers } from '../features/hotkeys/hotkey-handlers';
import { registerHubHandlers } from '../features/hub/hub-handlers';
import { registerIdeasHandlers } from '../features/ideas/ideas-handlers';
import { registerInsightsHandlers } from '../features/insights/insights-handlers';
import { registerMcpHandlers } from '../features/mcp/mcp-handlers';
import { registerMergeHandlers } from '../features/merge/merge-handlers';
import { registerMilestonesHandlers } from '../features/milestones/milestones-handlers';
import { registerNotesHandlers } from '../features/notes/notes-handlers';
import { registerNotificationHandlers } from '../features/notifications/notification-handlers';
import { registerOAuthHandlers } from '../features/oauth/oauth-handlers';
import { registerPlannerHandlers } from '../features/planner/planner-handlers';
import { registerProgressHandlers } from '../features/progress/progress-handlers';
import { registerProjectHandlers } from '../features/project/project-handlers';
import { registerQaHandlers } from '../features/qa/qa-handlers';
import { registerScreenHandlers } from '../features/screen/screen-handlers';
import { registerSecurityHandlers } from '../features/security/security-handlers';
import { registerSettingsHandlers } from '../features/settings/settings-handlers';
import { registerSpotifyHandlers } from '../features/spotify/spotify-handlers';
import { registerTaskHandlers } from '../features/tasks/task-handlers';
import { registerTerminalHandlers } from '../features/terminal/terminal-handlers';
import { registerTimeHandlers } from '../features/time-parser/time-handlers';
import { registerTrackerHandlers } from '../features/tracker/tracker-handlers';
import { registerVisualizationHandlers } from '../features/visualization/visualization-handlers';
import { registerVoiceHandlers } from '../features/voice/voice-handlers';
import { registerWebhookSettingsHandlers } from '../features/webhook-settings/webhook-settings-handlers';
import { registerWindowHandlers } from '../features/window/window-handlers';
import { registerWorkflowHandlers } from '../features/workflow/workflow-handlers';
import { registerWorkflowEngineHandlers } from '../features/workflow-engine/workflow-engine-handlers';
import { registerWorkflowTemplateHandlers } from '../features/workflow-templates/workflow-template-handlers';
import { registerWorkspaceHandlers } from '../features/workspace/workspace-handlers';



import type { IpcRouter } from './router';
import type { OAuthManager } from '../auth/oauth-manager';
import type { TokenStore } from '../auth/token-store';
import type { OAuthConfig } from '../auth/types';
import type { CommandBus } from '../bus';
import type { BusSessionManager } from '../bus/session-manager';
import type { TeamWatcherService } from '../features/agent-dashboard/agent-dashboard-handlers';
import type { AlertService } from '../features/alerts/alert-service';
import type { AppUpdateService } from '../features/app/app-update-service';
import type { AssistantService } from '../features/assistant/assistant-service';
import type { UserSessionManager } from '../features/auth';
import type { BriefingService } from '../features/briefing/briefing-service';
import type { CalendarService } from '../features/calendar/calendar-service';
import type { ChangelogService } from '../features/changelog/changelog-service';
import type { ClaudeClient } from '../features/claude';
import type { DashboardService } from '../features/dashboard/dashboard-service';
import type { CleanupService } from '../features/data-management/cleanup-service';
import type { ConfigReader } from '../features/data-management/config-reader';
import type { DataMigrator } from '../features/data-management/data-migrator';
import type { StorageInspector } from '../features/data-management/storage-inspector';
import type { DeviceService } from '../features/device/device-service';
import type { DockerService } from '../features/docker/docker-service';
import type { EmailService } from '../features/email/email-service';
import type { FileTreeService } from '../features/file-tree/file-tree-service';
import type { FitnessService } from '../features/fitness/fitness-service';
import type { GitService } from '../features/git/git-service';
import type { WorktreeService } from '../features/git/worktree-service';
import type { GitHubService } from '../features/github/github-service';
import type { ErrorCollectorHandler, HealthRegistryHandler } from '../features/health/error-handlers';
import type { HubApiClient } from '../features/hub/hub-api-client';
import type { HubAuthService } from '../features/hub/hub-auth-service';
import type { HubConnectionManager } from '../features/hub/hub-connection';
import type { HubSyncService } from '../features/hub/hub-sync';
import type { IdeasService } from '../features/ideas/ideas-service';
import type { InsightsService } from '../features/insights/insights-service';
import type { MergeService } from '../features/merge/merge-service';
import type { MilestonesService } from '../features/milestones/milestones-service';
import type { NotesService } from '../features/notes/notes-service';
import type { NotificationManager } from '../features/notifications';
import type { PlannerService } from '../features/planner/planner-service';
import type { ProgressService } from '../features/progress/progress-service';
import type { CodebaseAnalyzerService } from '../features/project/codebase-analyzer';
import type { ProjectService } from '../features/project/project-service';
import type { SetupPipelineService } from '../features/project/setup-pipeline';
import type { TaskService } from '../features/project/task-service';
import type { QaRunner } from '../features/qa/qa-types';
import type { ScreenCaptureService } from '../features/screen/screen-capture-service';
import type { SettingsService } from '../features/settings/settings-service';
import type { SpotifyService } from '../features/spotify/spotify-service';
import type { GithubTaskImporter } from '../features/tasks/github-importer';
import type { TaskDecomposer } from '../features/tasks/task-decomposer';
import type { TaskRepository } from '../features/tasks/types';
import type { TerminalService } from '../features/terminal/terminal-service';
import type { TimeParserService } from '../features/time-parser/time-parser-service';
import type { TrackerService } from '../features/tracker/tracker-service';
import type { VisualizationService } from '../features/visualization';
import type { VoiceService } from '../features/voice/voice-service';
import type { WorkflowEngineService } from '../features/workflow-engine';
import type { WorkflowTemplateService } from '../features/workflow-templates';
import type { WorkspaceSessionManager } from '../features/workspace/workspace-session-manager';
import type { McpManager } from '../mcp/mcp-manager';
import type { AgentManagerService } from '../services/agent-manager';
import type { HotkeyManager } from '../tray/hotkey-manager';

export interface Services {
  commandBus: CommandBus;
  busSessionManager: BusSessionManager;
  agentManagerService: AgentManagerService;
  projectService: ProjectService;
  taskService: TaskService;
  terminalService: TerminalService;
  settingsService: SettingsService;
  claudeClient: ClaudeClient;
  deviceService: DeviceService;
  alertService: AlertService;
  assistantService: AssistantService;
  calendarService: CalendarService | null;
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
  spotifyService: SpotifyService | null;
  gitService: GitService;
  githubService: GitHubService;
  worktreeService: WorktreeService;
  mergeService: MergeService;
  timeParserService: TimeParserService;
  taskRepository: TaskRepository;
  taskDecomposer: TaskDecomposer;
  githubImporter: GithubTaskImporter;
  voiceService: VoiceService | null;
  screenCaptureService: ScreenCaptureService | null;
  briefingService: BriefingService;
  hotkeyManager: HotkeyManager;
  appUpdateService: AppUpdateService;
  hubApiClient: HubApiClient;
  hubAuthService: HubAuthService;
  qaRunner: QaRunner;
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

export function registerAllHandlers(router: IpcRouter, services: Services): void {
  registerProjectHandlers(
    router,
    services.projectService,
    services.codebaseAnalyzer,
    services.setupPipeline,
  );
  registerTaskHandlers(
    router,
    services.taskRepository,
    services.taskDecomposer,
    services.githubImporter,
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
  if (services.calendarService) {
    registerCalendarHandlers(router, services.calendarService);
  }
  registerClaudeHandlers(router, services.claudeClient);
  if (services.changelogService) {
    registerChangelogHandlers(router, services.changelogService);
  }
  registerEmailHandlers(router, services.emailService);
  registerErrorHandlers(router, services.errorCollector, services.healthRegistry);
  registerFilesHandlers(router, services.fileTreeService);
  if (services.fitnessService) {
    registerFitnessHandlers(router, services.fitnessService);
  }
  if (services.ideasService) {
    registerIdeasHandlers(router, services.ideasService);
  }
  registerInsightsHandlers(router, services.insightsService);
  if (services.milestonesService) {
    registerMilestonesHandlers(router, services.milestonesService);
  }
  registerNotesHandlers(router, services.notesService);
  registerPlannerHandlers(router, services.plannerService);
  if (services.spotifyService) {
    registerSpotifyHandlers(router, services.spotifyService);
  }
  registerGitHandlers(router, services.gitService, services.worktreeService);
  registerGitHubHandlers(router, services.githubService);
  registerHubHandlers(
    router,
    services.hubConnectionManager,
    services.hubSyncService,
    services.hubApiClient,
  );
  registerMcpHandlers(router, services.mcpManager);
  registerMergeHandlers(router, services.mergeService);
  registerOAuthHandlers(router, services.oauthManager);
  registerNotificationHandlers(router, services.notificationManager);
  registerTimeHandlers(router, services.timeParserService);
  if (services.voiceService) {
    registerVoiceHandlers(router, services.voiceService);
  }
  registerWebhookSettingsHandlers(router, services.settingsService);
  if (services.screenCaptureService) {
    registerScreenHandlers(router, services.screenCaptureService);
  }
  registerBriefingHandlers(router, services.briefingService);
  registerHotkeyHandlers(router, services.settingsService, services.hotkeyManager);
  registerAppUpdateHandlers(router, services.appUpdateService);
  registerWorkflowHandlers(router, services.hubApiClient);
  registerWorkflowTemplateHandlers(router, services.workflowTemplateService);
  registerWorkspaceHandlers(router, services.workspaceSessionManager);
  registerDeviceHandlers(router, services.deviceService);
  registerQaHandlers(
    router,
    services.qaRunner,
    services.busSessionManager,
    services.taskRepository,
  );
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
  registerWorkflowEngineHandlers(router, services.workflowEngineService);
  registerTrackerHandlers(router, services.trackerService);
  registerVisualizationHandlers(router, services.visualizationService, services.projectService);
  registerProgressHandlers(router, services.progressService);
  registerBusHandlers(router, services.commandBus, services.busSessionManager);

  // Stub: workspaces CRUD (Hub-backed, no local service yet)
  router.handle(WORKSPACES.LIST.ALL, () => Promise.resolve([]));
  router.handle(WORKSPACES.CREATE.WORKSPACE, () => { throw new Error('Hub not configured'); });
  router.handle(WORKSPACES.UPDATE.WORKSPACE, () => { throw new Error('Hub not configured'); });
  router.handle(WORKSPACES.DELETE.WORKSPACE, () => { throw new Error('Hub not configured'); });

  if (services.teamWatcherService) {
    registerAgentDashboardHandlers(
      router,
      services.agentManagerService,
      services.teamWatcherService,
      services.qaRunner,
      services.gitService,
    );
  }
}
