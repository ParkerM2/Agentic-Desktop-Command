/**
 * Misc IPC -- Barrel Export
 *
 * Small domain contracts that don't warrant their own top-level folder.
 * Each domain has a single <name>.contract.ts file.
 */

// ── Alerts ──
export {
  AlertLinkedToSchema,
  AlertSchema,
  alertsEvents,
  alertsInvoke,
  AlertTypeSchema,
  RecurringConfigSchema,
} from './alerts.contract';

// ── Calendar ──
export { calendarInvoke } from './calendar.contract';

// ── Changelog ──
export {
  ChangeCategorySchema,
  changelogInvoke,
  ChangelogEntrySchema,
  ChangeTypeSchema,
} from './changelog.contract';

// ── Devices ──
export {
  DeviceCapabilitiesSchema,
  DeviceSchema,
  devicesInvoke,
  DeviceTypeSchema,
} from './devices.contract';

// ── Hotkeys ──
export { hotkeysInvoke } from './hotkeys.contract';

// ── Ideas ──
export {
  IdeaCategorySchema,
  IdeaSchema,
  ideasEvents,
  ideasInvoke,
  IdeaStatusSchema,
} from './ideas.contract';

// ── Insights ──
export {
  insightsInvoke,
  InsightMetricsSchema,
  InsightTimeSeriesSchema,
  ProjectInsightsSchema,
  TaskDistributionSchema,
} from './insights.contract';

// ── MCP ──
export { mcpInvoke } from './mcp.contract';

// ── Merge ──
export {
  MergeDiffFileSchema,
  MergeDiffSummarySchema,
  mergeInvoke,
  MergeResultSchema,
} from './merge.contract';

// ── Milestones ──
export {
  milestonesEvents,
  milestonesInvoke,
  MilestoneSchema,
  MilestoneStatusSchema,
  MilestoneTaskSchema,
} from './milestones.contract';

// ── Notes ──
export { NoteSchema, notesEvents, notesInvoke } from './notes.contract';

// ── Screen ──
export {
  screenInvoke,
  ScreenPermissionStatusSchema,
  ScreenSourceSchema,
  ScreenshotSchema,
} from './screen.contract';

// ── Time ──
export { timeInvoke } from './time.contract';

// ── Voice ──
export {
  voiceEvents,
  voiceInvoke,
  VoiceConfigSchema,
  VoiceInputModeSchema,
} from './voice.contract';

// ── Webhook ──
export { webhookEvents, webhookInvoke } from './webhook.contract';

// ── Workspaces ──
export {
  workspacesInvoke,
  WorkspaceSchema,
  WorkspaceSettingsSchema,
} from './workspaces.contract';
