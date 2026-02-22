/**
 * IPC Handler Registry
 *
 * Wires all domain handlers to the IPC router.
 * Each handler file is thin — it maps channels to service calls.
 */

import { registerAgentOrchestratorHandlers } from './handlers/agent-orchestrator-handlers';
import { registerAlertHandlers } from './handlers/alert-handlers';
import { registerAppHandlers } from './handlers/app-handlers';
import { registerAppUpdateHandlers } from './handlers/app-update-handlers';
import { registerAssistantHandlers } from './handlers/assistant-handlers';
import { registerAuthHandlers } from './handlers/auth-handlers';
import { registerBriefingHandlers } from './handlers/briefing-handlers';
import { registerCalendarHandlers } from './handlers/calendar-handlers';
import { registerChangelogHandlers } from './handlers/changelog-handlers';
import { registerClaudeHandlers } from './handlers/claude-handlers';
import { registerDashboardHandlers } from './handlers/dashboard-handlers';
import { registerDataManagementHandlers } from './handlers/data-management-handlers';
import { registerDeviceHandlers } from './handlers/device-handlers';
import { registerDockerHandlers } from './handlers/docker-handlers';
import { registerEmailHandlers } from './handlers/email-handlers';
import { registerErrorHandlers } from './handlers/error-handlers';
import { registerFitnessHandlers } from './handlers/fitness-handlers';
import { registerGitHandlers } from './handlers/git-handlers';
import { registerGitHubHandlers } from './handlers/github-handlers';
import { registerHotkeyHandlers } from './handlers/hotkey-handlers';
import { registerHubHandlers } from './handlers/hub-handlers';
import { registerIdeasHandlers } from './handlers/ideas-handlers';
import { registerInsightsHandlers } from './handlers/insights-handlers';
import { registerMcpHandlers } from './handlers/mcp-handlers';
import { registerMergeHandlers } from './handlers/merge-handlers';
import { registerMilestonesHandlers } from './handlers/milestones-handlers';
import { registerNotesHandlers } from './handlers/notes-handlers';
import { registerNotificationHandlers } from './handlers/notification-handlers';
import { registerOAuthHandlers } from './handlers/oauth-handlers';
import { registerPlannerHandlers } from './handlers/planner-handlers';
import { registerProjectHandlers } from './handlers/project-handlers';
import { registerQaHandlers } from './handlers/qa-handlers';
import { registerScreenHandlers } from './handlers/screen-handlers';
import { registerSecurityHandlers } from './handlers/security-handlers';
import { registerSettingsHandlers } from './handlers/settings-handlers';
import { registerSpotifyHandlers } from './handlers/spotify-handlers';
import { registerTaskHandlers } from './handlers/task-handlers';
import { registerTerminalHandlers } from './handlers/terminal-handlers';
import { registerTimeHandlers } from './handlers/time-handlers';
import { registerTrackerHandlers } from './handlers/tracker-handlers';
import { registerVoiceHandlers } from './handlers/voice-handlers';
import { registerWebhookSettingsHandlers } from './handlers/webhook-settings-handlers';
import { registerWindowHandlers } from './handlers/window-handlers';
import { registerWorkflowHandlers } from './handlers/workflow-handlers';
import { registerWorkspaceHandlers } from './handlers/workspace-handlers';

import type { IpcRouter } from './router';
import type { OAuthManager } from '../auth/oauth-manager';
import type { TokenStore } from '../auth/token-store';
import type { OAuthConfig } from '../auth/types';
import type { McpManager } from '../mcp/mcp-manager';
import type { ErrorCollectorHandler, HealthRegistryHandler } from './handlers/error-handlers';
import type { AgentOrchestrator } from '../services/agent-orchestrator/types';
import type { AlertService } from '../services/alerts/alert-service';
import type { AppUpdateService } from '../services/app/app-update-service';
import type { AssistantService } from '../services/assistant/assistant-service';
import type { UserSessionManager } from '../services/auth';
import type { BriefingService } from '../services/briefing/briefing-service';
import type { CalendarService } from '../services/calendar/calendar-service';
import type { ChangelogService } from '../services/changelog/changelog-service';
import type { ClaudeClient } from '../services/claude';
import type { DashboardService } from '../services/dashboard/dashboard-service';
import type { CleanupService } from '../services/data-management/cleanup-service';
import type { StorageInspector } from '../services/data-management/storage-inspector';
import type { DeviceService } from '../services/device/device-service';
import type { DockerService } from '../services/docker/docker-service';
import type { EmailService } from '../services/email/email-service';
import type { FitnessService } from '../services/fitness/fitness-service';
import type { GitService } from '../services/git/git-service';
import type { WorktreeService } from '../services/git/worktree-service';
import type { GitHubService } from '../services/github/github-service';
import type { HubApiClient } from '../services/hub/hub-api-client';
import type { HubAuthService } from '../services/hub/hub-auth-service';
import type { HubConnectionManager } from '../services/hub/hub-connection';
import type { HubSyncService } from '../services/hub/hub-sync';
import type { IdeasService } from '../services/ideas/ideas-service';
import type { InsightsService } from '../services/insights/insights-service';
import type { MergeService } from '../services/merge/merge-service';
import type { MilestonesService } from '../services/milestones/milestones-service';
import type { NotesService } from '../services/notes/notes-service';
import type { NotificationManager } from '../services/notifications';
import type { PlannerService } from '../services/planner/planner-service';
import type { CodebaseAnalyzerService } from '../services/project/codebase-analyzer';
import type { ProjectService } from '../services/project/project-service';
import type { SetupPipelineService } from '../services/project/setup-pipeline';
import type { TaskService } from '../services/project/task-service';
import type { QaRunner } from '../services/qa/qa-types';
import type { ScreenCaptureService } from '../services/screen/screen-capture-service';
import type { SettingsService } from '../services/settings/settings-service';
import type { SpotifyService } from '../services/spotify/spotify-service';
import type { GithubTaskImporter } from '../services/tasks/github-importer';
import type { TaskDecomposer } from '../services/tasks/task-decomposer';
import type { TaskRepository } from '../services/tasks/types';
import type { TerminalService } from '../services/terminal/terminal-service';
import type { TimeParserService } from '../services/time-parser/time-parser-service';
import type { TrackerService } from '../services/tracker/tracker-service';
import type { VoiceService } from '../services/voice/voice-service';
import type { TaskLauncherService } from '../services/workflow/task-launcher';
import type { HotkeyManager } from '../tray/hotkey-manager';

export interface Services {
  agentOrchestrator: AgentOrchestrator;
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
  taskLauncher: TaskLauncherService;
  dashboardService: DashboardService;
  dockerService: DockerService;
  oauthManager: OAuthManager;
  cleanupService: CleanupService;
  storageInspector: StorageInspector;
  codebaseAnalyzer: CodebaseAnalyzerService;
  setupPipeline: SetupPipelineService;
  trackerService: TrackerService;
  userSessionManager: UserSessionManager;
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
  registerWorkflowHandlers(router, services.hubApiClient, services.taskLauncher);
  registerWorkspaceHandlers(router, services.hubApiClient);
  registerDeviceHandlers(router, services.deviceService);
  registerAgentOrchestratorHandlers(router, services.agentOrchestrator, services.taskRepository);
  registerQaHandlers(
    router,
    services.qaRunner,
    services.agentOrchestrator,
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
  registerWindowHandlers(router);
  registerTrackerHandlers(router, services.trackerService);
}
