/**
 * Shared dependency interface for all command executors.
 *
 * Every domain executor receives this bag of optional services
 * via dependency injection rather than importing singletons.
 */

import type { McpManager } from '@main/mcp/mcp-manager';

import type { AlertService } from '../../alerts/alert-service';
import type { BriefingService } from '../../briefing/briefing-service';
import type { CalendarService } from '../../calendar/calendar-service';
import type { ChangelogService } from '../../changelog/changelog-service';
import type { EmailService } from '../../email/email-service';
import type { FitnessService } from '../../fitness/fitness-service';
import type { GitHubService } from '../../github/github-service';
import type { IdeasService } from '../../ideas/ideas-service';
import type { InsightsService } from '../../insights/insights-service';
import type { MilestonesService } from '../../milestones/milestones-service';
import type { NotesService } from '../../notes/notes-service';
import type { PlannerService } from '../../planner/planner-service';
import type { TaskService } from '../../project/task-service';
import type { SpotifyService } from '../../spotify/spotify-service';
import type { CrossDeviceQuery } from '../cross-device-query';
import type { WatchStore } from '../watch-store';

export interface CommandExecutorDeps {
  mcpManager: McpManager;
  notesService?: NotesService;
  alertService?: AlertService;
  spotifyService?: SpotifyService;
  taskService?: TaskService;
  plannerService?: PlannerService;
  watchStore?: WatchStore;
  crossDeviceQuery?: CrossDeviceQuery;
  fitnessService?: FitnessService;
  calendarService?: CalendarService;
  briefingService?: BriefingService;
  insightsService?: InsightsService;
  ideasService?: IdeasService;
  milestonesService?: MilestonesService;
  emailService?: EmailService;
  githubService?: GitHubService;
  changelogService?: ChangelogService;
}
