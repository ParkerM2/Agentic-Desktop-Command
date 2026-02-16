/**
 * IPC Contract — Single Source of Truth
 *
 * Every IPC channel is defined here once. Types flow to:
 * - Main process handlers (validated with Zod at the boundary)
 * - Preload bridge (typed invoke/on)
 * - Renderer hooks (fully typed React Query functions)
 *
 * Adding a new IPC operation = add one entry here. That's it.
 */

import { z } from 'zod';

// ─── Zod Schemas ───────────────────────────────────────────────

const TaskStatusSchema = z.enum([
  'backlog',
  'queue',
  'in_progress',
  'ai_review',
  'human_review',
  'done',
  'pr_created',
  'error',
]);

const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  files: z.array(z.string()),
});

const ExecutionPhaseSchema = z.enum([
  'idle',
  'planning',
  'coding',
  'testing',
  'reviewing',
  'complete',
  'error',
]);

const ExecutionProgressSchema = z.object({
  phase: ExecutionPhaseSchema,
  phaseProgress: z.number(),
  overallProgress: z.number(),
  currentSubtask: z.string().optional(),
  message: z.string().optional(),
  startedAt: z.string().optional(),
  sequenceNumber: z.number().optional(),
  completedPhases: z.array(ExecutionPhaseSchema).optional(),
});

const TaskSchema = z.object({
  id: z.string(),
  specId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  status: TaskStatusSchema,
  subtasks: z.array(SubtaskSchema),
  executionProgress: ExecutionProgressSchema.optional(),
  reviewReason: z.enum(['completed', 'errors', 'qa_rejected', 'plan_review']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  logs: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const TaskDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  projectId: z.string(),
  complexity: z.enum(['simple', 'standard', 'complex']).optional(),
});

// ── Smart Task Creation Schemas ───────────────────────────────

const EstimatedEffortSchema = z.enum(['small', 'medium', 'large']);
const SuggestedPrioritySchema = z.enum(['low', 'medium', 'high']);

const TaskSuggestionSchema = z.object({
  title: z.string(),
  description: z.string(),
  estimatedEffort: EstimatedEffortSchema,
  suggestedPriority: SuggestedPrioritySchema,
});

const TaskDecompositionResultSchema = z.object({
  originalDescription: z.string(),
  suggestions: z.array(TaskSuggestionSchema),
});

const GithubIssueImportSchema = z.object({
  issueNumber: z.number(),
  issueUrl: z.string(),
  title: z.string(),
  body: z.string(),
  labels: z.array(z.string()),
  assignees: z.array(z.string()),
});

// ── Hub Task Schemas (Hub API shape — distinct from legacy TaskSchema) ──

const HubTaskStatusSchema = z.enum(['backlog', 'planning', 'plan_ready', 'queued', 'running', 'paused', 'review', 'done', 'error']);

const HubTaskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

const HubTaskProgressSchema = z
  .object({
    phase: z.string(),
    phaseIndex: z.number(),
    totalPhases: z.number(),
    currentAgent: z.string().nullable(),
    filesChanged: z.number(),
    lastActivity: z.string(),
    logs: z.array(z.string()),
  })
  .optional();

const HubTaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  workspaceId: z.string().optional(),
  subProjectId: z.string().optional(),
  title: z.string(),
  description: z.string(),
  status: HubTaskStatusSchema,
  priority: HubTaskPrioritySchema,
  assignedDeviceId: z.string().optional(),
  createdByDeviceId: z.string().optional(),
  executionSessionId: z.string().optional(),
  progress: HubTaskProgressSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  subtasks: z.array(z.unknown()).optional(),
  agentName: z.string().optional(),
  activityHistory: z.array(z.unknown()).optional(),
  costTokens: z.number().optional(),
  costUsd: z.number().optional(),
  prNumber: z.number().optional(),
  prState: z.string().optional(),
  prCiStatus: z.string().optional(),
  prUrl: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const RepoTypeSchema = z.enum(['single', 'monorepo', 'multi-repo', 'none']);

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  autoBuildPath: z.string().optional(),
  workspaceId: z.string().optional(),
  gitUrl: z.string().optional(),
  repoStructure: RepoTypeSchema.optional(),
  defaultBranch: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const SubProjectSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  relativePath: z.string(),
  gitUrl: z.string().optional(),
  defaultBranch: z.string(),
  createdAt: z.string(),
});

const TerminalSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  cwd: z.string(),
  projectPath: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

const AppSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  colorTheme: z.string(),
  language: z.string(),
  uiScale: z.number(),
  onboardingCompleted: z.boolean(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  anthropicApiKey: z.string().optional(),
  hotkeys: z.record(z.string(), z.string()).optional(),
  openAtLogin: z.boolean().optional(),
  minimizeToTray: z.boolean().optional(),
  startMinimized: z.boolean().optional(),
  keepRunning: z.boolean().optional(),
});

const ProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  configDir: z.string().optional(),
  oauthToken: z.string().optional(),
  isDefault: z.boolean(),
});

const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pinned: z.boolean(),
});

const TimeBlockTypeSchema = z.enum(['focus', 'meeting', 'break', 'other']);

const TimeBlockSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  label: z.string(),
  type: TimeBlockTypeSchema,
  color: z.string().optional(),
});

const ScheduledTaskSchema = z.object({
  taskId: z.string(),
  scheduledTime: z.string().optional(),
  estimatedDuration: z.number().optional(),
  completed: z.boolean(),
});

const DailyPlanSchema = z.object({
  date: z.string(),
  goals: z.array(z.string()),
  scheduledTasks: z.array(ScheduledTaskSchema),
  timeBlocks: z.array(TimeBlockSchema),
  reflection: z.string().optional(),
});

const WeeklyReviewSummarySchema = z.object({
  totalGoalsSet: z.number(),
  totalGoalsCompleted: z.number(),
  totalTimeBlocks: z.number(),
  totalHoursPlanned: z.number(),
  categoryBreakdown: z.record(z.string(), z.number()),
});

const WeeklyReviewSchema = z.object({
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  days: z.array(DailyPlanSchema),
  summary: WeeklyReviewSummarySchema,
  reflection: z.string().optional(),
});

const GitStatusSchema = z.object({
  branch: z.string(),
  isClean: z.boolean(),
  ahead: z.number(),
  behind: z.number(),
  staged: z.array(z.string()),
  modified: z.array(z.string()),
  untracked: z.array(z.string()),
});

const GitBranchSchema = z.object({
  name: z.string(),
  current: z.boolean(),
  remote: z.string().optional(),
  lastCommit: z.string().optional(),
});

const WorktreeSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  subprojectId: z.string().optional(),
  path: z.string(),
  branch: z.string(),
  taskId: z.string().optional(),
  createdAt: z.string(),
});

const RepoStructureSchema = z.enum(['single', 'monorepo', 'polyrepo']);

const ChildRepoSchema = z.object({
  name: z.string(),
  path: z.string(),
  relativePath: z.string(),
  gitUrl: z.string().optional(),
});

const RepoDetectionResultSchema = z.object({
  isGitRepo: z.boolean(),
  repoType: RepoTypeSchema,
  gitUrl: z.string().optional(),
  defaultBranch: z.string().optional(),
  childRepos: z.array(ChildRepoSchema),
});

const MergeResultSchema = z.object({
  success: z.boolean(),
  conflicts: z.array(z.string()).optional(),
  message: z.string(),
});

const MergeDiffFileSchema = z.object({
  file: z.string(),
  insertions: z.number(),
  deletions: z.number(),
  binary: z.boolean(),
});

const MergeDiffSummarySchema = z.object({
  files: z.array(MergeDiffFileSchema),
  insertions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
});

const AlertTypeSchema = z.enum(['reminder', 'deadline', 'notification', 'recurring']);

const RecurringConfigSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  time: z.string(),
  daysOfWeek: z.array(z.number()).optional(),
});

const AlertLinkedToSchema = z.object({
  type: z.enum(['task', 'event', 'note']),
  id: z.string(),
});

const AlertSchema = z.object({
  id: z.string(),
  type: AlertTypeSchema,
  message: z.string(),
  triggerAt: z.string(),
  recurring: RecurringConfigSchema.optional(),
  linkedTo: AlertLinkedToSchema.optional(),
  dismissed: z.boolean(),
  createdAt: z.string(),
});

const MilestoneStatusSchema = z.enum(['planned', 'in-progress', 'completed']);

const MilestoneTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetDate: z.string(),
  status: MilestoneStatusSchema,
  tasks: z.array(MilestoneTaskSchema),
  projectId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const IdeaStatusSchema = z.enum(['new', 'exploring', 'accepted', 'rejected', 'implemented']);
const IdeaCategorySchema = z.enum(['feature', 'improvement', 'bug', 'performance']);

const IdeaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: IdeaStatusSchema,
  category: IdeaCategorySchema,
  tags: z.array(z.string()),
  projectId: z.string().optional(),
  votes: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ChangeTypeSchema = z.enum(['added', 'changed', 'fixed', 'removed', 'security', 'deprecated']);

const ChangeCategorySchema = z.object({
  type: ChangeTypeSchema,
  items: z.array(z.string()),
});

const ChangelogEntrySchema = z.object({
  version: z.string(),
  date: z.string(),
  categories: z.array(ChangeCategorySchema),
});

const InsightMetricsSchema = z.object({
  totalTasks: z.number(),
  completedTasks: z.number(),
  completionRate: z.number(),
  agentRunCount: z.number(),
  agentSuccessRate: z.number(),
  activeAgents: z.number(),
});

const InsightTimeSeriesSchema = z.object({
  date: z.string(),
  tasksCompleted: z.number(),
  agentRuns: z.number(),
});

const TaskDistributionSchema = z.object({
  status: z.string(),
  count: z.number(),
  percentage: z.number(),
});

const ProjectInsightsSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  taskCount: z.number(),
  completedCount: z.number(),
  completionRate: z.number(),
});

const WorkoutTypeSchema = z.enum(['strength', 'cardio', 'flexibility', 'sport']);
const WeightUnitSchema = z.enum(['lbs', 'kg']);
const MeasurementSourceSchema = z.enum(['manual']);
const FitnessGoalTypeSchema = z.enum([
  'weight',
  'workout_frequency',
  'lift_target',
  'cardio_target',
]);

const ExerciseSetSchema = z.object({
  reps: z.number().optional(),
  weight: z.number().optional(),
  unit: WeightUnitSchema.optional(),
  duration: z.number().optional(),
  distance: z.number().optional(),
});

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.array(ExerciseSetSchema),
  muscleGroup: z.string().optional(),
});

const WorkoutSchema = z.object({
  id: z.string(),
  date: z.string(),
  type: WorkoutTypeSchema,
  duration: z.number(),
  exercises: z.array(ExerciseSchema),
  notes: z.string().optional(),
  createdAt: z.string(),
});

const BodyMeasurementSchema = z.object({
  id: z.string(),
  date: z.string(),
  weight: z.number().optional(),
  bodyFat: z.number().optional(),
  muscleMass: z.number().optional(),
  boneMass: z.number().optional(),
  waterPercentage: z.number().optional(),
  visceralFat: z.number().optional(),
  source: MeasurementSourceSchema,
  createdAt: z.string(),
});

const FitnessGoalSchema = z.object({
  id: z.string(),
  type: FitnessGoalTypeSchema,
  target: z.number(),
  current: z.number(),
  unit: z.string(),
  deadline: z.string().optional(),
  createdAt: z.string(),
});

const FitnessStatsSchema = z.object({
  totalWorkouts: z.number(),
  workoutsThisWeek: z.number(),
  totalVolume: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  favoriteExercise: z.string().optional(),
  averageWorkoutDuration: z.number(),
});

const TokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  estimatedCostUsd: z.number(),
  lastUpdated: z.string(),
});

const AggregatedTokenUsageSchema = z.object({
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  totalTokens: z.number(),
  totalCostUsd: z.number(),
  byAgent: z.array(
    z.object({
      agentId: z.string(),
      taskId: z.string(),
      projectId: z.string(),
      usage: TokenUsageSchema,
    }),
  ),
});

const AgentSessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  projectId: z.string(),
  status: z.enum(['idle', 'running', 'paused', 'error', 'completed']),
  worktreePath: z.string().optional(),
  terminalId: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  tokenUsage: TokenUsageSchema.optional(),
});

const GitHubLabelSchema = z.object({
  name: z.string(),
  color: z.string(),
});

const GitHubPullRequestSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string(),
  state: z.enum(['open', 'closed']),
  merged: z.boolean(),
  draft: z.boolean(),
  author: z.string(),
  authorAvatar: z.string(),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  headBranch: z.string(),
  baseBranch: z.string(),
  labels: z.array(GitHubLabelSchema),
  reviewers: z.array(z.string()),
  comments: z.number(),
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
});

const GitHubIssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string(),
  state: z.enum(['open', 'closed']),
  author: z.string(),
  authorAvatar: z.string(),
  url: z.string(),
  labels: z.array(GitHubLabelSchema),
  assignees: z.array(z.string()),
  comments: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const GitHubNotificationSchema = z.object({
  id: z.string(),
  unread: z.boolean(),
  reason: z.string(),
  title: z.string(),
  type: z.string(),
  repoName: z.string(),
  updatedAt: z.string(),
});

// ─── Assistant Schemas ────────────────────────────────────────

const IntentTypeSchema = z.enum([
  'quick_command',
  'task_creation',
  'conversation',
  'watch',
  'device_query',
  'fitness',
  'calendar',
  'briefing',
  'insights',
  'ideation',
  'milestones',
  'email',
  'github',
  'planner',
  'notes',
  'changelog',
]);

const AssistantActionSchema = z.enum([
  'create_task',
  'create_time_block',
  'create_note',
  'create_reminder',
  'search',
  'spotify_control',
  'open_url',
  'conversation',
  'watch_create',
  'watch_remove',
  'watch_list',
  'device_query',
  'fitness_log',
  'fitness_query',
  'fitness_measurements',
  'calendar_query',
  'calendar_create',
  'briefing_get',
  'insights_query',
  'ideation_create',
  'ideation_query',
  'milestones_query',
  'email_send',
  'email_queue',
  'github_prs',
  'github_issues',
  'github_notifications',
  'planner_today',
  'planner_weekly',
  'notes_search',
  'notes_list',
  'changelog_generate',
]);

const AssistantContextSchema = z.object({
  activeProjectId: z.string().nullable(),
  activeProjectName: z.string().nullable(),
  currentPage: z.string(),
  todayDate: z.string(),
});

const AssistantResponseSchema = z.object({
  type: z.enum(['text', 'action', 'error']),
  content: z.string(),
  intent: IntentTypeSchema.optional(),
  action: AssistantActionSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const CommandHistoryEntrySchema = z.object({
  id: z.string(),
  input: z.string(),
  source: z.enum(['commandbar', 'slack', 'github']),
  intent: IntentTypeSchema,
  action: AssistantActionSchema.optional(),
  responseSummary: z.string(),
  timestamp: z.string(),
});

const WebhookCommandSourceContextSchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  channelId: z.string().optional(),
  channelName: z.string().optional(),
  threadTs: z.string().optional(),
  permalink: z.string().optional(),
  repo: z.string().optional(),
  prNumber: z.number().optional(),
  prTitle: z.string().optional(),
  prUrl: z.string().optional(),
  commentAuthor: z.string().optional(),
});

const WebhookCommandSchema = z.object({
  source: z.enum(['slack', 'github']),
  commandText: z.string(),
  sourceContext: WebhookCommandSourceContextSchema,
});

const WebhookConfigSchema = z.object({
  slack: z.object({
    botToken: z.string(),
    signingSecret: z.string(),
    configured: z.boolean(),
  }),
  github: z.object({
    webhookSecret: z.string(),
    configured: z.boolean(),
  }),
});

// ─── Claude SDK Schemas ───────────────────────────────────────

const ClaudeMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const ClaudeConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number(),
});

const ClaudeTokenUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
});

const ClaudeSendMessageResponseSchema = z.object({
  conversationId: z.string(),
  message: z.string(),
  usage: ClaudeTokenUsageSchema,
});

const ClaudeStreamChunkSchema = z.object({
  conversationId: z.string(),
  type: z.enum(['content_delta', 'message_start', 'message_stop', 'error']),
  content: z.string().optional(),
  usage: ClaudeTokenUsageSchema.optional(),
  error: z.string().optional(),
});

// ─── Email Schemas ─────────────────────────────────────────────

const EmailAttachmentSchema = z.object({
  filename: z.string(),
  content: z.union([z.string(), z.instanceof(Buffer)]),
  contentType: z.string().optional(),
  path: z.string().optional(),
});

const EmailSchema = z.object({
  to: z.array(z.string()),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string(),
  body: z.string(),
  html: z.string().optional(),
  attachments: z.array(EmailAttachmentSchema).optional(),
  replyTo: z.string().optional(),
});

const SmtpProviderSchema = z.enum(['gmail', 'outlook', 'yahoo', 'custom']);

const SmtpConfigSchema = z.object({
  host: z.string(),
  port: z.number(),
  secure: z.boolean(),
  auth: z.object({
    user: z.string(),
    pass: z.string(),
  }),
  from: z.string(),
  provider: SmtpProviderSchema.optional(),
});

const EmailSendResultSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
  error: z.string().optional(),
});

const EmailStatusSchema = z.enum(['pending', 'sent', 'failed', 'queued']);

const QueuedEmailSchema = z.object({
  id: z.string(),
  email: EmailSchema,
  status: EmailStatusSchema,
  attempts: z.number(),
  lastAttempt: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
});

// ─── Notification Schemas ──────────────────────────────────────

const NotificationSourceSchema = z.enum(['slack', 'github']);

const SlackNotificationTypeSchema = z.enum(['mention', 'dm', 'channel', 'thread_reply']);

const GitHubNotificationTypeSchema = z.enum([
  'pr_review',
  'pr_comment',
  'issue_mention',
  'ci_status',
  'pr_merged',
  'pr_closed',
  'issue_assigned',
]);

const NotificationTypeSchema = z.union([SlackNotificationTypeSchema, GitHubNotificationTypeSchema]);

const NotificationMetadataSchema = z.object({
  channelId: z.string().optional(),
  channelName: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  threadTs: z.string().optional(),
  owner: z.string().optional(),
  repo: z.string().optional(),
  prNumber: z.number().optional(),
  issueNumber: z.number().optional(),
  ciStatus: z.enum(['pending', 'success', 'failure']).optional(),
});

const NotificationSchema = z.object({
  id: z.string(),
  source: NotificationSourceSchema,
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string(),
  url: z.string(),
  timestamp: z.string(),
  read: z.boolean(),
  metadata: NotificationMetadataSchema.optional(),
});

const NotificationFilterSchema = z.object({
  sources: z.array(NotificationSourceSchema).optional(),
  types: z.array(NotificationTypeSchema).optional(),
  keywords: z.array(z.string()).optional(),
  unreadOnly: z.boolean().optional(),
});

const SlackWatcherConfigSchema = z.object({
  enabled: z.boolean(),
  pollIntervalSeconds: z.number(),
  channels: z.array(z.string()),
  keywords: z.array(z.string()),
  watchMentions: z.boolean(),
  watchDms: z.boolean(),
  watchThreads: z.boolean(),
});

const GitHubWatcherConfigSchema = z.object({
  enabled: z.boolean(),
  pollIntervalSeconds: z.number(),
  repos: z.array(z.string()),
  watchPrReviews: z.boolean(),
  watchPrComments: z.boolean(),
  watchIssueMentions: z.boolean(),
  watchCiStatus: z.boolean(),
});

const NotificationWatcherConfigSchema = z.object({
  enabled: z.boolean(),
  slack: SlackWatcherConfigSchema,
  github: GitHubWatcherConfigSchema,
});

// ─── Agent Orchestrator Schemas ─────────────────────────────────

const AgentPhaseSchema = z.enum(['planning', 'executing', 'qa']);

const AgentSessionStatusSchema = z.enum(['spawning', 'active', 'completed', 'error', 'killed']);

const OrchestratorSessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  pid: z.number(),
  status: AgentSessionStatusSchema,
  phase: AgentPhaseSchema,
  spawnedAt: z.string(),
  lastHeartbeat: z.string(),
  progressFile: z.string(),
  logFile: z.string(),
  hooksConfigPath: z.string(),
  exitCode: z.number().nullable(),
  projectPath: z.string(),
  command: z.string(),
});

// ─── QA System Schemas ──────────────────────────────────────────

const QaModeSchema = z.enum(['quiet', 'full']);

const QaSessionStatusSchema = z.enum(['building', 'launching', 'testing', 'completed', 'error']);

const QaVerificationResultSchema = z.enum(['pass', 'fail']);

const QaVerificationSuiteSchema = z.object({
  lint: QaVerificationResultSchema,
  typecheck: QaVerificationResultSchema,
  test: QaVerificationResultSchema,
  build: QaVerificationResultSchema,
  docs: QaVerificationResultSchema,
});

const QaIssueSeveritySchema = z.enum(['critical', 'major', 'minor', 'cosmetic']);

const QaIssueSchema = z.object({
  severity: QaIssueSeveritySchema,
  category: z.string(),
  description: z.string(),
  screenshot: z.string().optional(),
  location: z.string().optional(),
});

const QaScreenshotSchema = z.object({
  label: z.string(),
  path: z.string(),
  timestamp: z.string(),
  annotated: z.boolean(),
});

const QaResultSchema = z.enum(['pass', 'fail', 'warnings']);

const QaReportSchema = z.object({
  result: QaResultSchema,
  checksRun: z.number(),
  checksPassed: z.number(),
  issues: z.array(QaIssueSchema),
  verificationSuite: QaVerificationSuiteSchema,
  screenshots: z.array(QaScreenshotSchema),
  duration: z.number(),
});

const QaSessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  mode: QaModeSchema,
  status: QaSessionStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  report: QaReportSchema.optional(),
  screenshots: z.array(z.string()),
  agentSessionId: z.string().optional(),
});

// ─── Voice Schemas ─────────────────────────────────────────────

const VoiceInputModeSchema = z.enum(['push_to_talk', 'continuous']);

const VoiceConfigSchema = z.object({
  enabled: z.boolean(),
  language: z.string(),
  inputMode: VoiceInputModeSchema,
});

// ─── Screen Capture Schemas ───────────────────────────────────

const ScreenSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail: z.string(),
  display_id: z.string().optional(),
  appIcon: z.string().optional(),
});

const ScreenshotSchema = z.object({
  data: z.string(),
  timestamp: z.string(),
  source: ScreenSourceSchema,
  width: z.number(),
  height: z.number(),
});

const ScreenPermissionStatusSchema = z.enum(['granted', 'denied', 'not-determined', 'restricted']);

// ─── Briefing Schemas ──────────────────────────────────────────

const SuggestionTypeSchema = z.enum(['stale_project', 'parallel_tasks', 'blocked_task']);

const SuggestionActionSchema = z.object({
  label: z.string(),
  targetId: z.string().optional(),
  targetType: z.enum(['project', 'task']).optional(),
});

const SuggestionSchema = z.object({
  type: SuggestionTypeSchema,
  title: z.string(),
  description: z.string(),
  action: SuggestionActionSchema.optional(),
});

const TaskSummarySchema = z.object({
  dueToday: z.number(),
  completedYesterday: z.number(),
  overdue: z.number(),
  inProgress: z.number(),
});

const AgentActivitySummarySchema = z.object({
  runningCount: z.number(),
  completedToday: z.number(),
  errorCount: z.number(),
});

const DailyBriefingSchema = z.object({
  id: z.string(),
  date: z.string(),
  summary: z.string(),
  taskSummary: TaskSummarySchema,
  agentActivity: AgentActivitySummarySchema,
  suggestions: z.array(SuggestionSchema),
  githubNotifications: z.number().optional(),
  generatedAt: z.string(),
});

const BriefingConfigSchema = z.object({
  enabled: z.boolean(),
  scheduledTime: z.string(),
  includeGitHub: z.boolean(),
  includeAgentActivity: z.boolean(),
});

// ─── Auth Schemas ─────────────────────────────────────────────

const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
});

const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

const LoginInputSchema = z.object({
  email: z.string(),
  password: z.string(),
});

const LoginOutputSchema = z.object({
  user: UserSchema,
  tokens: AuthTokensSchema,
});

const RegisterInputSchema = z.object({
  email: z.string(),
  password: z.string(),
  displayName: z.string(),
});

const RegisterOutputSchema = z.object({
  user: UserSchema,
  tokens: AuthTokensSchema,
});

const RefreshInputSchema = z.object({
  refreshToken: z.string(),
});

const RefreshOutputSchema = z.object({
  tokens: AuthTokensSchema,
});

// ─── Workspace Schemas ────────────────────────────────────────

const WorkspaceSettingsSchema = z.object({
  autoStart: z.boolean(),
  maxConcurrent: z.number(),
  defaultBranch: z.string(),
});

const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  hostDeviceId: z.string().optional(),
  settings: WorkspaceSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const DeviceCapabilitiesSchema = z.object({
  canExecute: z.boolean(),
  repos: z.array(z.string()),
});

const DeviceTypeSchema = z.enum(['desktop', 'mobile', 'web']);

const DeviceSchema = z.object({
  id: z.string(),
  machineId: z.string().optional(),
  userId: z.string(),
  deviceType: DeviceTypeSchema,
  deviceName: z.string(),
  nickname: z.string().optional(),
  capabilities: DeviceCapabilitiesSchema,
  isOnline: z.boolean(),
  lastSeen: z.string().optional(),
  appVersion: z.string().optional(),
  createdAt: z.string(),
});

// ─── IPC Contract Definition ──────────────────────────────────

/**
 * Every invoke-style IPC channel (renderer → main → response)
 */
export const ipcInvokeContract = {
  // ── Projects ──
  'projects.list': {
    input: z.object({}),
    output: z.array(ProjectSchema),
  },
  'projects.add': {
    input: z.object({ path: z.string() }),
    output: ProjectSchema,
  },
  'projects.remove': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'projects.initialize': {
    input: z.object({ projectId: z.string() }),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  'projects.selectDirectory': {
    input: z.object({}),
    output: z.object({ path: z.string().nullable() }),
  },
  'projects.detectRepo': {
    input: z.object({ path: z.string() }),
    output: RepoDetectionResultSchema,
  },
  'projects.update': {
    input: z.object({
      projectId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      gitUrl: z.string().optional(),
      defaultBranch: z.string().optional(),
    }),
    output: ProjectSchema,
  },
  'projects.getSubProjects': {
    input: z.object({ projectId: z.string() }),
    output: z.array(SubProjectSchema),
  },
  'projects.createSubProject': {
    input: z.object({
      projectId: z.string(),
      name: z.string(),
      relativePath: z.string(),
      gitUrl: z.string().optional(),
      defaultBranch: z.string().optional(),
    }),
    output: SubProjectSchema,
  },
  'projects.deleteSubProject': {
    input: z.object({ projectId: z.string(), subProjectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Tasks ──
  'tasks.list': {
    input: z.object({ projectId: z.string() }),
    output: z.array(TaskSchema),
  },
  'tasks.get': {
    input: z.object({ projectId: z.string(), taskId: z.string() }),
    output: TaskSchema,
  },
  'tasks.create': {
    input: TaskDraftSchema,
    output: TaskSchema,
  },
  'tasks.update': {
    input: z.object({ taskId: z.string(), updates: z.record(z.string(), z.unknown()) }),
    output: TaskSchema,
  },
  'tasks.updateStatus': {
    input: z.object({ taskId: z.string(), status: TaskStatusSchema }),
    output: TaskSchema,
  },
  'tasks.delete': {
    input: z.object({ taskId: z.string(), projectId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'tasks.execute': {
    input: z.object({ taskId: z.string(), projectId: z.string() }),
    output: z.object({ agentId: z.string() }),
  },
  'tasks.listAll': {
    input: z.object({}),
    output: z.array(TaskSchema),
  },
  'tasks.decompose': {
    input: z.object({ description: z.string().min(1) }),
    output: TaskDecompositionResultSchema,
  },
  'tasks.importFromGithub': {
    input: z.object({ url: z.string(), projectId: z.string() }),
    output: TaskSchema,
  },
  'tasks.listGithubIssues': {
    input: z.object({ owner: z.string(), repo: z.string() }),
    output: z.array(GithubIssueImportSchema),
  },

  // ── Terminals ──
  'terminals.list': {
    input: z.object({ projectPath: z.string().optional() }),
    output: z.array(TerminalSessionSchema),
  },
  'terminals.create': {
    input: z.object({ cwd: z.string(), projectPath: z.string().optional() }),
    output: TerminalSessionSchema,
  },
  'terminals.close': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.sendInput': {
    input: z.object({ sessionId: z.string(), data: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.resize': {
    input: z.object({ sessionId: z.string(), cols: z.number(), rows: z.number() }),
    output: z.object({ success: z.boolean() }),
  },
  'terminals.invokeClaudeCli': {
    input: z.object({ sessionId: z.string(), cwd: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Agents ──
  'agents.list': {
    input: z.object({ projectId: z.string() }),
    output: z.array(AgentSessionSchema),
  },
  'agents.stop': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agents.pause': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agents.resume': {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Settings ──
  'settings.get': {
    input: z.object({}),
    output: AppSettingsSchema,
  },
  'settings.update': {
    input: z.record(z.string(), z.unknown()),
    output: AppSettingsSchema,
  },
  'settings.getProfiles': {
    input: z.object({}),
    output: z.array(ProfileSchema),
  },
  'settings.createProfile': {
    input: z.object({
      name: z.string(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    }),
    output: ProfileSchema,
  },
  'settings.updateProfile': {
    input: z.object({
      id: z.string(),
      updates: z.object({
        name: z.string().optional(),
        apiKey: z.string().optional(),
        model: z.string().optional(),
      }),
    }),
    output: ProfileSchema,
  },
  'settings.deleteProfile': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'settings.setDefaultProfile': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'settings.getOAuthProviders': {
    input: z.object({}),
    output: z.array(
      z.object({
        name: z.string(),
        hasCredentials: z.boolean(),
      }),
    ),
  },
  'settings.setOAuthProvider': {
    input: z.object({
      name: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'settings.getWebhookConfig': {
    input: z.object({}),
    output: WebhookConfigSchema,
  },
  'settings.updateWebhookConfig': {
    input: z.object({
      slack: z
        .object({
          botToken: z.string().optional(),
          signingSecret: z.string().optional(),
        })
        .optional(),
      github: z
        .object({
          webhookSecret: z.string().optional(),
        })
        .optional(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'settings.getAgentSettings': {
    input: z.object({}),
    output: z.object({
      maxConcurrentAgents: z.number(),
    }),
  },
  'settings.setAgentSettings': {
    input: z.object({
      maxConcurrentAgents: z.number(),
    }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Hotkeys ──
  'hotkeys.get': {
    input: z.object({}),
    output: z.record(z.string(), z.string()),
  },
  'hotkeys.update': {
    input: z.object({
      hotkeys: z.record(z.string(), z.string()),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'hotkeys.reset': {
    input: z.object({}),
    output: z.record(z.string(), z.string()),
  },

  // ── Notes ──
  'notes.list': {
    input: z.object({ projectId: z.string().optional(), tag: z.string().optional() }),
    output: z.array(NoteSchema),
  },
  'notes.create': {
    input: z.object({
      title: z.string(),
      content: z.string(),
      tags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
    }),
    output: NoteSchema,
  },
  'notes.update': {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      pinned: z.boolean().optional(),
    }),
    output: NoteSchema,
  },
  'notes.delete': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'notes.search': {
    input: z.object({ query: z.string() }),
    output: z.array(NoteSchema),
  },

  // ── Planner ──
  'planner.getDay': {
    input: z.object({ date: z.string() }),
    output: DailyPlanSchema,
  },
  'planner.updateDay': {
    input: z.object({
      date: z.string(),
      goals: z.array(z.string()).optional(),
      scheduledTasks: z.array(ScheduledTaskSchema).optional(),
      reflection: z.string().optional(),
    }),
    output: DailyPlanSchema,
  },
  'planner.addTimeBlock': {
    input: z.object({
      date: z.string(),
      timeBlock: z.object({
        startTime: z.string(),
        endTime: z.string(),
        label: z.string(),
        type: TimeBlockTypeSchema,
        color: z.string().optional(),
      }),
    }),
    output: TimeBlockSchema,
  },
  'planner.updateTimeBlock': {
    input: z.object({
      date: z.string(),
      blockId: z.string(),
      updates: z.object({
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        label: z.string().optional(),
        type: TimeBlockTypeSchema.optional(),
        color: z.string().optional(),
      }),
    }),
    output: TimeBlockSchema,
  },
  'planner.removeTimeBlock': {
    input: z.object({ date: z.string(), blockId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'planner.getWeek': {
    input: z.object({ startDate: z.string() }),
    output: WeeklyReviewSchema,
  },
  'planner.generateWeeklyReview': {
    input: z.object({ startDate: z.string() }),
    output: WeeklyReviewSchema,
  },
  'planner.updateWeeklyReflection': {
    input: z.object({ startDate: z.string(), reflection: z.string() }),
    output: WeeklyReviewSchema,
  },

  // ── Alerts ──
  'alerts.list': {
    input: z.object({ includeExpired: z.boolean().optional() }),
    output: z.array(AlertSchema),
  },
  'alerts.create': {
    input: z.object({
      type: AlertTypeSchema,
      message: z.string(),
      triggerAt: z.string(),
      recurring: RecurringConfigSchema.optional(),
      linkedTo: AlertLinkedToSchema.optional(),
    }),
    output: AlertSchema,
  },
  'alerts.dismiss': {
    input: z.object({ id: z.string() }),
    output: AlertSchema,
  },
  'alerts.delete': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Git ──
  'git.status': {
    input: z.object({ repoPath: z.string() }),
    output: GitStatusSchema,
  },
  'git.branches': {
    input: z.object({ repoPath: z.string() }),
    output: z.array(GitBranchSchema),
  },
  'git.createBranch': {
    input: z.object({
      repoPath: z.string(),
      branchName: z.string(),
      baseBranch: z.string().optional(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'git.createWorktree': {
    input: z.object({ repoPath: z.string(), worktreePath: z.string(), branch: z.string() }),
    output: WorktreeSchema,
  },
  'git.removeWorktree': {
    input: z.object({ repoPath: z.string(), worktreePath: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'git.listWorktrees': {
    input: z.object({ projectId: z.string() }),
    output: z.array(WorktreeSchema),
  },
  'git.detectStructure': {
    input: z.object({ repoPath: z.string() }),
    output: z.object({ structure: RepoStructureSchema }),
  },

  // ── Merge ──
  'merge.previewDiff': {
    input: z.object({
      repoPath: z.string(),
      sourceBranch: z.string(),
      targetBranch: z.string(),
    }),
    output: MergeDiffSummarySchema,
  },
  'merge.checkConflicts': {
    input: z.object({
      repoPath: z.string(),
      sourceBranch: z.string(),
      targetBranch: z.string(),
    }),
    output: z.array(z.string()),
  },
  'merge.mergeBranch': {
    input: z.object({
      repoPath: z.string(),
      sourceBranch: z.string(),
      targetBranch: z.string(),
    }),
    output: MergeResultSchema,
  },
  'merge.abort': {
    input: z.object({ repoPath: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Milestones ──
  'milestones.list': {
    input: z.object({ projectId: z.string().optional() }),
    output: z.array(MilestoneSchema),
  },
  'milestones.create': {
    input: z.object({
      title: z.string(),
      description: z.string(),
      targetDate: z.string(),
      projectId: z.string().optional(),
    }),
    output: MilestoneSchema,
  },
  'milestones.update': {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      targetDate: z.string().optional(),
      status: MilestoneStatusSchema.optional(),
    }),
    output: MilestoneSchema,
  },
  'milestones.delete': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'milestones.addTask': {
    input: z.object({ milestoneId: z.string(), title: z.string() }),
    output: MilestoneSchema,
  },
  'milestones.toggleTask': {
    input: z.object({ milestoneId: z.string(), taskId: z.string() }),
    output: MilestoneSchema,
  },

  // ── Ideas ──
  'ideas.list': {
    input: z.object({
      projectId: z.string().optional(),
      status: IdeaStatusSchema.optional(),
      category: IdeaCategorySchema.optional(),
    }),
    output: z.array(IdeaSchema),
  },
  'ideas.create': {
    input: z.object({
      title: z.string(),
      description: z.string(),
      category: IdeaCategorySchema,
      tags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
    }),
    output: IdeaSchema,
  },
  'ideas.update': {
    input: z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: IdeaStatusSchema.optional(),
      category: IdeaCategorySchema.optional(),
      tags: z.array(z.string()).optional(),
    }),
    output: IdeaSchema,
  },
  'ideas.delete': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'ideas.vote': {
    input: z.object({ id: z.string(), delta: z.number() }),
    output: IdeaSchema,
  },

  // ── Changelog ──
  'changelog.list': {
    input: z.object({}),
    output: z.array(ChangelogEntrySchema),
  },
  'changelog.addEntry': {
    input: z.object({
      version: z.string(),
      date: z.string(),
      categories: z.array(ChangeCategorySchema),
    }),
    output: ChangelogEntrySchema,
  },
  'changelog.generate': {
    input: z.object({
      repoPath: z.string(),
      version: z.string(),
      fromTag: z.string().optional(),
    }),
    output: ChangelogEntrySchema,
  },

  // ── Insights ──
  'insights.getMetrics': {
    input: z.object({ projectId: z.string().optional() }),
    output: InsightMetricsSchema,
  },
  'insights.getTimeSeries': {
    input: z.object({ projectId: z.string().optional(), days: z.number().optional() }),
    output: z.array(InsightTimeSeriesSchema),
  },
  'insights.getTaskDistribution': {
    input: z.object({ projectId: z.string().optional() }),
    output: z.array(TaskDistributionSchema),
  },
  'insights.getProjectBreakdown': {
    input: z.object({}),
    output: z.array(ProjectInsightsSchema),
  },

  // ── Fitness ──
  'fitness.logWorkout': {
    input: z.object({
      date: z.string(),
      type: WorkoutTypeSchema,
      duration: z.number(),
      exercises: z.array(ExerciseSchema),
      notes: z.string().optional(),
    }),
    output: WorkoutSchema,
  },
  'fitness.listWorkouts': {
    input: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      type: WorkoutTypeSchema.optional(),
    }),
    output: z.array(WorkoutSchema),
  },
  'fitness.logMeasurement': {
    input: z.object({
      date: z.string(),
      weight: z.number().optional(),
      bodyFat: z.number().optional(),
      muscleMass: z.number().optional(),
      boneMass: z.number().optional(),
      waterPercentage: z.number().optional(),
      visceralFat: z.number().optional(),
      source: MeasurementSourceSchema,
    }),
    output: BodyMeasurementSchema,
  },
  'fitness.getMeasurements': {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(BodyMeasurementSchema),
  },
  'fitness.getStats': {
    input: z.object({}),
    output: FitnessStatsSchema,
  },
  'fitness.setGoal': {
    input: z.object({
      type: FitnessGoalTypeSchema,
      target: z.number(),
      unit: z.string(),
      deadline: z.string().optional(),
    }),
    output: FitnessGoalSchema,
  },
  'fitness.listGoals': {
    input: z.object({}),
    output: z.array(FitnessGoalSchema),
  },
  'fitness.updateGoalProgress': {
    input: z.object({ goalId: z.string(), current: z.number() }),
    output: FitnessGoalSchema,
  },
  'fitness.deleteWorkout': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'fitness.deleteGoal': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Assistant ──
  'assistant.sendCommand': {
    input: z.object({
      input: z.string(),
      context: AssistantContextSchema.optional(),
    }),
    output: AssistantResponseSchema,
  },
  'assistant.getHistory': {
    input: z.object({ limit: z.number().optional() }),
    output: z.array(CommandHistoryEntrySchema),
  },
  'assistant.clearHistory': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },

  // ── Hub ──
  'hub.connect': {
    input: z.object({ url: z.string(), apiKey: z.string() }),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  'hub.disconnect': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'hub.getStatus': {
    input: z.object({}),
    output: z.object({
      status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
      hubUrl: z.string().optional(),
      enabled: z.boolean(),
      lastConnected: z.string().optional(),
      pendingMutations: z.number(),
    }),
  },
  'hub.sync': {
    input: z.object({}),
    output: z.object({ syncedCount: z.number(), pendingCount: z.number() }),
  },
  'hub.getConfig': {
    input: z.object({}),
    output: z.object({
      hubUrl: z.string().optional(),
      enabled: z.boolean(),
      lastConnected: z.string().optional(),
    }),
  },
  'hub.removeConfig': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'hub.ws.status': {
    input: z.object({}),
    output: z.object({
      status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
      lastConnectedAt: z.string().nullable(),
      reconnectAttempts: z.number(),
      error: z.string().nullable(),
    }),
  },

  // ── Hub Tasks ──
  'hub.tasks.list': {
    input: z.object({
      projectId: z.string().optional(),
      workspaceId: z.string().optional(),
    }),
    output: z.object({ tasks: z.array(HubTaskSchema) }),
  },
  'hub.tasks.get': {
    input: z.object({ taskId: z.string() }),
    output: HubTaskSchema,
  },
  'hub.tasks.create': {
    input: z.object({
      projectId: z.string(),
      workspaceId: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      priority: HubTaskPrioritySchema.optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    output: HubTaskSchema,
  },
  'hub.tasks.update': {
    input: z.object({
      taskId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: HubTaskStatusSchema.optional(),
      priority: HubTaskPrioritySchema.optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    output: HubTaskSchema,
  },
  'hub.tasks.updateStatus': {
    input: z.object({
      taskId: z.string(),
      status: HubTaskStatusSchema,
    }),
    output: HubTaskSchema,
  },
  'hub.tasks.delete': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'hub.tasks.execute': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string(), status: z.enum(['started', 'queued']) }),
  },
  'hub.tasks.cancel': {
    input: z.object({
      taskId: z.string(),
      reason: z.string().optional(),
    }),
    output: z.object({
      success: z.boolean(),
      previousStatus: HubTaskStatusSchema,
    }),
  },

  // ── GitHub ──
  'github.listPrs': {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional(),
    }),
    output: z.array(GitHubPullRequestSchema),
  },
  'github.getPr': {
    input: z.object({ owner: z.string(), repo: z.string(), number: z.number() }),
    output: GitHubPullRequestSchema,
  },
  'github.listIssues': {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional(),
    }),
    output: z.array(GitHubIssueSchema),
  },
  'github.createIssue': {
    input: z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      body: z.string().optional(),
      labels: z.array(z.string()).optional(),
      assignees: z.array(z.string()).optional(),
    }),
    output: GitHubIssueSchema,
  },
  'github.getNotifications': {
    input: z.object({ all: z.boolean().optional() }),
    output: z.array(GitHubNotificationSchema),
  },

  // ── Spotify ──
  'spotify.getPlayback': {
    input: z.object({}),
    output: z
      .object({
        isPlaying: z.boolean(),
        track: z.string().optional(),
        artist: z.string().optional(),
        album: z.string().optional(),
        albumArt: z.string().optional(),
        progressMs: z.number().optional(),
        durationMs: z.number().optional(),
        device: z.string().optional(),
        volume: z.number().optional(),
      })
      .nullable(),
  },
  'spotify.play': {
    input: z.object({ uri: z.string().optional() }),
    output: z.object({ success: z.boolean() }),
  },
  'spotify.pause': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'spotify.next': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'spotify.previous': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'spotify.search': {
    input: z.object({ query: z.string(), limit: z.number().optional() }),
    output: z.array(
      z.object({
        name: z.string(),
        artist: z.string(),
        album: z.string(),
        uri: z.string(),
        durationMs: z.number(),
      }),
    ),
  },
  'spotify.setVolume': {
    input: z.object({ volumePercent: z.number() }),
    output: z.object({ success: z.boolean() }),
  },
  'spotify.addToQueue': {
    input: z.object({ uri: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Calendar ──
  'calendar.listEvents': {
    input: z.object({
      calendarId: z.string().optional(),
      timeMin: z.string(),
      timeMax: z.string(),
      maxResults: z.number().optional(),
    }),
    output: z.array(
      z.object({
        id: z.string(),
        summary: z.string(),
        start: z.string().optional(),
        end: z.string().optional(),
        location: z.string().optional(),
        status: z.string(),
        attendees: z.number(),
      }),
    ),
  },
  'calendar.createEvent': {
    input: z.object({
      summary: z.string(),
      startDateTime: z.string(),
      endDateTime: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      timeZone: z.string().optional(),
      attendees: z.array(z.string()).optional(),
    }),
    output: z.object({
      id: z.string(),
      summary: z.string(),
      start: z.string().optional(),
      end: z.string().optional(),
      htmlLink: z.string(),
    }),
  },
  'calendar.deleteEvent': {
    input: z.object({ eventId: z.string(), calendarId: z.string().optional() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── App ──
  'app.getVersion': {
    input: z.object({}),
    output: z.object({ version: z.string() }),
  },
  'app.checkClaudeAuth': {
    input: z.object({}),
    output: z.object({
      installed: z.boolean(),
      authenticated: z.boolean(),
      version: z.string().optional(),
    }),
  },
  'app.getOAuthStatus': {
    input: z.object({ provider: z.string() }),
    output: z.object({
      configured: z.boolean(),
      authenticated: z.boolean(),
    }),
  },
  'app.setOpenAtLogin': {
    input: z.object({ enabled: z.boolean() }),
    output: z.object({ success: z.boolean() }),
  },
  'app.getOpenAtLogin': {
    input: z.object({}),
    output: z.object({ enabled: z.boolean() }),
  },
  'app.checkForUpdates': {
    input: z.object({}),
    output: z.object({
      updateAvailable: z.boolean(),
      version: z.string().optional(),
    }),
  },
  'app.downloadUpdate': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'app.quitAndInstall': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'app.getUpdateStatus': {
    input: z.object({}),
    output: z.object({
      checking: z.boolean(),
      updateAvailable: z.boolean(),
      downloading: z.boolean(),
      downloaded: z.boolean(),
      version: z.string().optional(),
      error: z.string().optional(),
    }),
  },

  // ── Agents (global) ──
  'agents.listAll': {
    input: z.object({}),
    output: z.array(AgentSessionSchema),
  },
  'agents.getQueueStatus': {
    input: z.object({}),
    output: z.object({
      pending: z.array(
        z.object({
          id: z.string(),
          taskId: z.string(),
          projectId: z.string(),
          priority: z.number(),
          queuedAt: z.string(),
        }),
      ),
      running: z.array(z.string()),
      maxConcurrent: z.number(),
    }),
  },
  'agents.getTokenUsage': {
    input: z.object({}),
    output: AggregatedTokenUsageSchema,
  },

  // ── Time Parser ──
  'time.parse': {
    input: z.object({
      text: z.string(),
      referenceDate: z.string().optional(),
    }),
    output: z
      .object({
        iso: z.string(),
        text: z.string(),
        isRelative: z.boolean(),
      })
      .nullable(),
  },

  // ── MCP ──
  'mcp.callTool': {
    input: z.object({
      server: z.string(),
      tool: z.string(),
      args: z.record(z.string(), z.unknown()),
    }),
    output: z.object({
      content: z.array(
        z.object({
          type: z.string(),
          text: z.string(),
        }),
      ),
      isError: z.boolean(),
    }),
  },
  'mcp.listConnected': {
    input: z.object({}),
    output: z.array(z.string()),
  },
  'mcp.getConnectionState': {
    input: z.object({ server: z.string() }),
    output: z.enum(['disconnected', 'connecting', 'connected', 'error']),
  },

  // ── Claude SDK ──
  'claude.sendMessage': {
    input: z.object({
      conversationId: z.string(),
      message: z.string(),
      model: z.string().optional(),
      maxTokens: z.number().optional(),
      systemPrompt: z.string().optional(),
    }),
    output: ClaudeSendMessageResponseSchema,
  },
  'claude.streamMessage': {
    input: z.object({
      conversationId: z.string(),
      message: z.string(),
      model: z.string().optional(),
      maxTokens: z.number().optional(),
      systemPrompt: z.string().optional(),
    }),
    output: z.object({ success: z.boolean() }),
  },
  'claude.createConversation': {
    input: z.object({ title: z.string().optional() }),
    output: z.object({ conversationId: z.string() }),
  },
  'claude.listConversations': {
    input: z.object({}),
    output: z.array(ClaudeConversationSchema),
  },
  'claude.getMessages': {
    input: z.object({ conversationId: z.string() }),
    output: z.array(ClaudeMessageSchema),
  },
  'claude.clearConversation': {
    input: z.object({ conversationId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'claude.isConfigured': {
    input: z.object({}),
    output: z.object({ configured: z.boolean() }),
  },

  // ── Email ──
  'email.send': {
    input: EmailSchema,
    output: EmailSendResultSchema,
  },
  'email.getConfig': {
    input: z.object({}),
    output: SmtpConfigSchema.nullable(),
  },
  'email.updateConfig': {
    input: SmtpConfigSchema,
    output: z.object({ success: z.boolean() }),
  },
  'email.testConnection': {
    input: z.object({}),
    output: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  'email.getQueue': {
    input: z.object({}),
    output: z.array(QueuedEmailSchema),
  },
  'email.retryQueued': {
    input: z.object({ emailId: z.string() }),
    output: EmailSendResultSchema,
  },
  'email.removeFromQueue': {
    input: z.object({ emailId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },

  // ── Notifications ──
  'notifications.list': {
    input: z.object({
      filter: NotificationFilterSchema.optional(),
      limit: z.number().optional(),
    }),
    output: z.array(NotificationSchema),
  },
  'notifications.markRead': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'notifications.markAllRead': {
    input: z.object({ source: NotificationSourceSchema.optional() }),
    output: z.object({ success: z.boolean(), count: z.number() }),
  },
  'notifications.getConfig': {
    input: z.object({}),
    output: NotificationWatcherConfigSchema,
  },
  'notifications.updateConfig': {
    input: z.object({
      enabled: z.boolean().optional(),
      slack: SlackWatcherConfigSchema.partial().optional(),
      github: GitHubWatcherConfigSchema.partial().optional(),
    }),
    output: NotificationWatcherConfigSchema,
  },
  'notifications.startWatching': {
    input: z.object({}),
    output: z.object({ success: z.boolean(), watchersStarted: z.array(z.string()) }),
  },
  'notifications.stopWatching': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'notifications.getWatcherStatus': {
    input: z.object({}),
    output: z.object({
      isWatching: z.boolean(),
      activeWatchers: z.array(NotificationSourceSchema),
      lastPollTime: z.record(NotificationSourceSchema, z.string()).optional(),
      errors: z.record(NotificationSourceSchema, z.string()).optional(),
    }),
  },

  // ── Voice ──
  'voice.getConfig': {
    input: z.object({}),
    output: VoiceConfigSchema,
  },
  'voice.updateConfig': {
    input: z.object({
      enabled: z.boolean().optional(),
      language: z.string().optional(),
      inputMode: VoiceInputModeSchema.optional(),
    }),
    output: VoiceConfigSchema,
  },
  'voice.checkPermission': {
    input: z.object({}),
    output: z.object({
      granted: z.boolean(),
      canRequest: z.boolean(),
    }),
  },

  // ── Screen Capture ──
  'screen.listSources': {
    input: z.object({
      types: z.array(z.enum(['screen', 'window'])).optional(),
      thumbnailSize: z.object({ width: z.number(), height: z.number() }).optional(),
    }),
    output: z.array(ScreenSourceSchema),
  },
  'screen.capture': {
    input: z.object({
      sourceId: z.string(),
      options: z
        .object({
          width: z.number().optional(),
          height: z.number().optional(),
        })
        .optional(),
    }),
    output: ScreenshotSchema,
  },
  'screen.checkPermission': {
    input: z.object({}),
    output: z.object({
      status: ScreenPermissionStatusSchema,
      platform: z.string(),
    }),
  },

  // ── Briefing ──
  'briefing.getDaily': {
    input: z.object({}),
    output: DailyBriefingSchema.nullable(),
  },
  'briefing.generate': {
    input: z.object({}),
    output: DailyBriefingSchema,
  },
  'briefing.getConfig': {
    input: z.object({}),
    output: BriefingConfigSchema,
  },
  'briefing.updateConfig': {
    input: z.object({
      enabled: z.boolean().optional(),
      scheduledTime: z.string().optional(),
      includeGitHub: z.boolean().optional(),
      includeAgentActivity: z.boolean().optional(),
    }),
    output: BriefingConfigSchema,
  },
  'briefing.getSuggestions': {
    input: z.object({}),
    output: z.array(SuggestionSchema),
  },

  // ── Workspaces ──
  'workspaces.list': {
    input: z.object({}),
    output: z.array(WorkspaceSchema),
  },
  'workspaces.create': {
    input: z.object({ name: z.string(), description: z.string().optional() }),
    output: WorkspaceSchema,
  },
  'workspaces.update': {
    input: z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      hostDeviceId: z.string().optional(),
      settings: WorkspaceSettingsSchema.partial().optional(),
    }),
    output: WorkspaceSchema,
  },
  'workspaces.delete': {
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'devices.list': {
    input: z.object({}),
    output: z.array(DeviceSchema),
  },
  'devices.register': {
    input: z.object({
      machineId: z.string(),
      deviceName: z.string(),
      deviceType: DeviceTypeSchema,
      capabilities: DeviceCapabilitiesSchema,
      appVersion: z.string(),
    }),
    output: DeviceSchema,
  },
  'devices.heartbeat': {
    input: z.object({ deviceId: z.string() }),
    output: z.object({ success: z.boolean(), lastSeen: z.string() }),
  },
  'devices.update': {
    input: z.object({
      deviceId: z.string(),
      deviceName: z.string().optional(),
      nickname: z.string().optional(),
      capabilities: DeviceCapabilitiesSchema.optional(),
      isOnline: z.boolean().optional(),
      appVersion: z.string().optional(),
    }),
    output: DeviceSchema,
  },

  // ── Auth ──
  'auth.register': {
    input: RegisterInputSchema,
    output: RegisterOutputSchema,
  },
  'auth.login': {
    input: LoginInputSchema,
    output: LoginOutputSchema,
  },
  'auth.logout': {
    input: z.object({}),
    output: z.object({ success: z.boolean() }),
  },
  'auth.refresh': {
    input: RefreshInputSchema,
    output: RefreshOutputSchema,
  },
  'auth.me': {
    input: z.object({}),
    output: UserSchema,
  },

  // ── Workflow ──
  'workflow.watchProgress': {
    input: z.object({ projectPath: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'workflow.stopWatching': {
    input: z.object({ projectPath: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'workflow.launch': {
    input: z.object({
      taskDescription: z.string(),
      projectPath: z.string(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), pid: z.number() }),
  },
  'workflow.isRunning': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ running: z.boolean() }),
  },
  'workflow.stop': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ stopped: z.boolean() }),
  },

  // ── Agent Orchestrator ──
  'agent.startPlanning': {
    input: z.object({
      taskId: z.string(),
      projectPath: z.string(),
      taskDescription: z.string(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), status: z.literal('spawned') }),
  },
  'agent.startExecution': {
    input: z.object({
      taskId: z.string(),
      projectPath: z.string(),
      taskDescription: z.string(),
      planRef: z.string().optional(),
      subProjectPath: z.string().optional(),
    }),
    output: z.object({ sessionId: z.string(), status: z.literal('spawned') }),
  },
  'agent.killSession': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  'agent.restartFromCheckpoint': {
    input: z.object({ taskId: z.string(), projectPath: z.string() }),
    output: z.object({ sessionId: z.string(), status: z.literal('spawned') }),
  },
  'agent.getOrchestratorSession': {
    input: z.object({ taskId: z.string() }),
    output: OrchestratorSessionSchema.nullable(),
  },
  'agent.listOrchestratorSessions': {
    input: z.object({}),
    output: z.array(OrchestratorSessionSchema),
  },

  // ── QA ──
  'qa.startQuiet': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  'qa.startFull': {
    input: z.object({ taskId: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  'qa.getReport': {
    input: z.object({ taskId: z.string() }),
    output: QaReportSchema.nullable(),
  },
  'qa.getSession': {
    input: z.object({ taskId: z.string() }),
    output: QaSessionSchema.nullable(),
  },
  'qa.cancel': {
    input: z.object({ sessionId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
} as const;

/**
 * Every event-style IPC channel (main → renderer, no response)
 */
export const ipcEventContract = {
  // ── Task Events ──
  'event:task.statusChanged': {
    payload: z.object({ taskId: z.string(), status: TaskStatusSchema, projectId: z.string() }),
  },
  'event:task.progressUpdated': {
    payload: z.object({ taskId: z.string(), progress: ExecutionProgressSchema }),
  },
  'event:task.logAppended': {
    payload: z.object({ taskId: z.string(), log: z.string() }),
  },
  'event:task.planUpdated': {
    payload: z.object({ taskId: z.string(), plan: z.unknown() }),
  },

  // ── Terminal Events ──
  'event:terminal.output': {
    payload: z.object({ sessionId: z.string(), data: z.string() }),
  },
  'event:terminal.closed': {
    payload: z.object({ sessionId: z.string() }),
  },
  'event:terminal.titleChanged': {
    payload: z.object({ sessionId: z.string(), title: z.string() }),
  },

  // ── Agent Events ──
  'event:agent.statusChanged': {
    payload: z.object({ agentId: z.string(), status: z.string(), taskId: z.string() }),
  },
  'event:agent.log': {
    payload: z.object({ agentId: z.string(), message: z.string() }),
  },
  'event:agent.queueChanged': {
    payload: z.object({
      pending: z.number(),
      running: z.number(),
      maxConcurrent: z.number(),
    }),
  },
  'event:agent.tokenUsage': {
    payload: z.object({
      agentId: z.string(),
      usage: TokenUsageSchema,
    }),
  },

  // ── Project Events ──
  'event:project.updated': {
    payload: z.object({ projectId: z.string() }),
  },

  // ── App Events ──
  'event:app.updateAvailable': {
    payload: z.object({ version: z.string() }),
  },
  'event:app.updateDownloaded': {
    payload: z.object({ version: z.string() }),
  },

  // ── Assistant Events ──
  'event:assistant.response': {
    payload: z.object({ content: z.string(), type: z.enum(['text', 'action', 'error']) }),
  },
  'event:assistant.thinking': {
    payload: z.object({ isThinking: z.boolean() }),
  },
  'event:assistant.commandCompleted': {
    payload: z.object({
      id: z.string(),
      source: z.enum(['commandbar', 'slack', 'github']),
      action: z.string(),
      summary: z.string(),
      timestamp: z.string(),
    }),
  },
  'event:assistant.proactive': {
    payload: z.object({
      content: z.string(),
      source: z.enum(['watch', 'qa', 'agent']),
      taskId: z.string().optional(),
      followUp: z.string().optional(),
    }),
  },

  // ── Claude SDK Events ──
  'event:claude.streamChunk': {
    payload: ClaudeStreamChunkSchema,
  },

  // ── Webhook Events ──
  'event:webhook.received': {
    payload: z.object({
      source: z.enum(['slack', 'github']),
      commandText: z.string(),
      sourceContext: z.record(z.string(), z.string()),
      timestamp: z.string(),
    }),
  },

  // ── Git Events ──
  'event:git.worktreeChanged': {
    payload: z.object({ projectId: z.string() }),
  },

  // ── Note Events ──
  'event:note.changed': {
    payload: z.object({ noteId: z.string() }),
  },

  // ── Planner Events ──
  'event:planner.dayChanged': {
    payload: z.object({ date: z.string() }),
  },

  // ── Alert Events ──
  'event:alert.triggered': {
    payload: z.object({ alertId: z.string(), message: z.string() }),
  },
  'event:alert.changed': {
    payload: z.object({ alertId: z.string() }),
  },

  // ── Milestone Events ──
  'event:milestone.changed': {
    payload: z.object({ milestoneId: z.string() }),
  },

  // ── Idea Events ──
  'event:idea.changed': {
    payload: z.object({ ideaId: z.string() }),
  },

  // ── Fitness Events ──
  'event:fitness.workoutChanged': {
    payload: z.object({ workoutId: z.string() }),
  },
  'event:fitness.measurementChanged': {
    payload: z.object({ measurementId: z.string() }),
  },
  'event:fitness.goalChanged': {
    payload: z.object({ goalId: z.string() }),
  },

  // ── Hub Events ──
  'event:hub.connectionChanged': {
    payload: z.object({
      status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
    }),
  },
  'event:hub.syncCompleted': {
    payload: z.object({ entities: z.array(z.string()), syncedCount: z.number() }),
  },

  // ── Hub Entity Events ──
  'event:hub.tasks.created': {
    payload: z.object({ taskId: z.string(), projectId: z.string() }),
  },
  'event:hub.tasks.updated': {
    payload: z.object({ taskId: z.string(), projectId: z.string() }),
  },
  'event:hub.tasks.deleted': {
    payload: z.object({ taskId: z.string(), projectId: z.string() }),
  },
  'event:hub.tasks.progress': {
    payload: z.object({ taskId: z.string(), progress: z.number(), phase: z.string() }),
  },
  'event:hub.tasks.completed': {
    payload: z.object({
      taskId: z.string(),
      projectId: z.string(),
      result: z.enum(['success', 'failure']),
    }),
  },
  'event:hub.devices.online': {
    payload: z.object({ deviceId: z.string(), name: z.string() }),
  },
  'event:hub.devices.offline': {
    payload: z.object({ deviceId: z.string() }),
  },
  'event:hub.workspaces.updated': {
    payload: z.object({ workspaceId: z.string() }),
  },
  'event:hub.projects.updated': {
    payload: z.object({ projectId: z.string() }),
  },

  // ── GitHub Events ──
  'event:github.updated': {
    payload: z.object({
      type: z.enum(['pr', 'issue', 'notification']),
      owner: z.string(),
      repo: z.string(),
    }),
  },

  // ── Rate Limit Events ──
  'event:rateLimit.detected': {
    payload: z.object({
      taskId: z.string().optional(),
      provider: z.string(),
      retryAfter: z.number().optional(),
    }),
  },

  // ── Email Events ──
  'event:email.sent': {
    payload: z.object({
      messageId: z.string(),
      to: z.array(z.string()),
      subject: z.string(),
    }),
  },
  'event:email.failed': {
    payload: z.object({
      to: z.array(z.string()),
      subject: z.string(),
      error: z.string(),
    }),
  },

  // ── Notification Events ──
  'event:notifications.new': {
    payload: z.object({
      notification: NotificationSchema,
    }),
  },
  'event:notifications.watcherError': {
    payload: z.object({
      source: NotificationSourceSchema,
      error: z.string(),
    }),
  },
  'event:notifications.watcherStatusChanged': {
    payload: z.object({
      source: NotificationSourceSchema,
      status: z.enum(['started', 'stopped', 'polling', 'error']),
    }),
  },

  // ── Voice Events ──
  'event:voice.transcript': {
    payload: z.object({
      transcript: z.string(),
      isFinal: z.boolean(),
    }),
  },

  // ── Briefing Events ──
  'event:briefing.ready': {
    payload: z.object({
      briefingId: z.string(),
      date: z.string(),
    }),
  },

  // ── Agent Orchestrator Events ──
  'event:agent.orchestrator.progress': {
    payload: z.object({
      taskId: z.string(),
      type: z.string(),
      data: z.record(z.string(), z.unknown()),
      timestamp: z.string(),
    }),
  },
  'event:agent.orchestrator.planReady': {
    payload: z.object({
      taskId: z.string(),
      planSummary: z.string(),
      planFilePath: z.string(),
    }),
  },
  'event:agent.orchestrator.stopped': {
    payload: z.object({
      taskId: z.string(),
      reason: z.string(),
      exitCode: z.number(),
    }),
  },
  'event:agent.orchestrator.error': {
    payload: z.object({
      taskId: z.string(),
      error: z.string(),
    }),
  },
  'event:agent.orchestrator.heartbeat': {
    payload: z.object({
      taskId: z.string(),
      timestamp: z.string(),
    }),
  },
  'event:agent.orchestrator.watchdogAlert': {
    payload: z.object({
      type: z.enum(['warning', 'stale', 'dead', 'auth_failed']),
      sessionId: z.string(),
      taskId: z.string(),
      message: z.string(),
      suggestedAction: z.enum(['restart_checkpoint', 'restart_fresh', 'mark_error', 'retry_auth']),
      timestamp: z.string(),
    }),
  },

  // ── QA Events ──
  'event:qa.started': {
    payload: z.object({
      taskId: z.string(),
      mode: QaModeSchema,
    }),
  },
  'event:qa.progress': {
    payload: z.object({
      taskId: z.string(),
      step: z.string(),
      total: z.number(),
      current: z.number(),
    }),
  },
  'event:qa.completed': {
    payload: z.object({
      taskId: z.string(),
      result: QaResultSchema,
      issueCount: z.number(),
    }),
  },
} as const;

// ─── Type Utilities ───────────────────────────────────────────

/** All invoke channel names */
export type InvokeChannel = keyof typeof ipcInvokeContract;

/** All event channel names */
export type EventChannel = keyof typeof ipcEventContract;

/** Input type for an invoke channel */
export type InvokeInput<T extends InvokeChannel> = z.infer<(typeof ipcInvokeContract)[T]['input']>;

/** Output type for an invoke channel */
export type InvokeOutput<T extends InvokeChannel> = z.infer<
  (typeof ipcInvokeContract)[T]['output']
>;

/** Payload type for an event channel */
export type EventPayload<T extends EventChannel> = z.infer<(typeof ipcEventContract)[T]['payload']>;

// Re-export schemas for use in handlers
export {
  HubTaskSchema,
  HubTaskStatusSchema,
  HubTaskPrioritySchema,
  HubTaskProgressSchema,
  TaskSchema,
  TaskDraftSchema,
  TaskStatusSchema,
  TaskSuggestionSchema,
  TaskDecompositionResultSchema,
  EstimatedEffortSchema,
  SuggestedPrioritySchema,
  GithubIssueImportSchema,
  ProjectSchema,
  SubProjectSchema,
  TerminalSessionSchema,
  AppSettingsSchema,
  AgentSessionSchema,
  ExecutionProgressSchema,
  SubtaskSchema,
  ProfileSchema,
  NoteSchema,
  DailyPlanSchema,
  TimeBlockSchema,
  ScheduledTaskSchema,
  TimeBlockTypeSchema,
  WeeklyReviewSchema,
  WeeklyReviewSummarySchema,
  GitStatusSchema,
  GitBranchSchema,
  WorktreeSchema,
  RepoStructureSchema,
  MergeResultSchema,
  MergeDiffFileSchema,
  MergeDiffSummarySchema,
  AlertSchema,
  AlertTypeSchema,
  RecurringConfigSchema,
  AlertLinkedToSchema,
  MilestoneSchema,
  MilestoneStatusSchema,
  MilestoneTaskSchema,
  IdeaSchema,
  IdeaStatusSchema,
  IdeaCategorySchema,
  ChangelogEntrySchema,
  ChangeCategorySchema,
  ChangeTypeSchema,
  InsightMetricsSchema,
  InsightTimeSeriesSchema,
  TaskDistributionSchema,
  ProjectInsightsSchema,
  WorkoutSchema,
  WorkoutTypeSchema,
  ExerciseSchema,
  ExerciseSetSchema,
  WeightUnitSchema,
  BodyMeasurementSchema,
  MeasurementSourceSchema,
  FitnessGoalSchema,
  FitnessGoalTypeSchema,
  FitnessStatsSchema,
  GitHubLabelSchema,
  GitHubPullRequestSchema,
  GitHubIssueSchema,
  GitHubNotificationSchema,
  IntentTypeSchema,
  AssistantActionSchema,
  AssistantContextSchema,
  AssistantResponseSchema,
  CommandHistoryEntrySchema,
  WebhookCommandSourceContextSchema,
  WebhookCommandSchema,
  WebhookConfigSchema,
  ClaudeMessageSchema,
  ClaudeConversationSchema,
  ClaudeTokenUsageSchema,
  ClaudeSendMessageResponseSchema,
  ClaudeStreamChunkSchema,
  EmailSchema,
  EmailAttachmentSchema,
  EmailSendResultSchema,
  EmailStatusSchema,
  QueuedEmailSchema,
  SmtpConfigSchema,
  SmtpProviderSchema,
  NotificationSchema,
  NotificationSourceSchema,
  NotificationTypeSchema,
  NotificationFilterSchema,
  NotificationWatcherConfigSchema,
  SlackWatcherConfigSchema,
  GitHubWatcherConfigSchema,
  AgentPhaseSchema,
  AgentSessionStatusSchema,
  OrchestratorSessionSchema,
  VoiceInputModeSchema,
  VoiceConfigSchema,
  ScreenSourceSchema,
  ScreenshotSchema,
  ScreenPermissionStatusSchema,
  SuggestionTypeSchema,
  SuggestionSchema,
  DailyBriefingSchema,
  BriefingConfigSchema,
  TaskSummarySchema,
  AgentActivitySummarySchema,
  RepoTypeSchema,
  ChildRepoSchema,
  RepoDetectionResultSchema,
  WorkspaceSchema,
  WorkspaceSettingsSchema,
  DeviceSchema,
  DeviceCapabilitiesSchema,
  DeviceTypeSchema,
  UserSchema,
  AuthTokensSchema,
  LoginInputSchema,
  LoginOutputSchema,
  RegisterInputSchema,
  RegisterOutputSchema,
  RefreshInputSchema,
  RefreshOutputSchema,
  QaModeSchema,
  QaSessionStatusSchema,
  QaVerificationResultSchema,
  QaVerificationSuiteSchema,
  QaIssueSeveritySchema,
  QaIssueSchema,
  QaScreenshotSchema,
  QaResultSchema,
  QaReportSchema,
  QaSessionSchema,
};
