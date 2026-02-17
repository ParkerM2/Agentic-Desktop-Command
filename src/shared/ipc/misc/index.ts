/**
 * Misc IPC — Barrel Export
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
export { calendarEvents, calendarInvoke } from './calendar.contract';

// ── Changelog ──
export {
  ChangeCategorySchema,
  changelogEvents,
  changelogInvoke,
  ChangelogEntrySchema,
  ChangeTypeSchema,
} from './changelog.contract';

// ── Devices ──
export {
  DeviceCapabilitiesSchema,
  DeviceSchema,
  devicesEvents,
  devicesInvoke,
  DeviceTypeSchema,
} from './devices.contract';

// ── Hotkeys ──
export { hotkeysEvents, hotkeysInvoke } from './hotkeys.contract';

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
  insightsEvents,
  insightsInvoke,
  InsightMetricsSchema,
  InsightTimeSeriesSchema,
  ProjectInsightsSchema,
  TaskDistributionSchema,
} from './insights.contract';

// ── MCP ──
export { mcpEvents, mcpInvoke } from './mcp.contract';

// ── Merge ──
export {
  MergeDiffFileSchema,
  MergeDiffSummarySchema,
  mergeEvents,
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

// ── Rate Limit ──
export { rateLimitEvents, rateLimitInvoke } from './rate-limit.contract';

// ── Screen ──
export {
  screenEvents,
  screenInvoke,
  ScreenPermissionStatusSchema,
  ScreenSourceSchema,
  ScreenshotSchema,
} from './screen.contract';

// ── Time ──
export { timeEvents, timeInvoke } from './time.contract';

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
  workspacesEvents,
  workspacesInvoke,
  WorkspaceSchema,
  WorkspaceSettingsSchema,
} from './workspaces.contract';
