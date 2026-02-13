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

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  autoBuildPath: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
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

const ChangeTypeSchema = z.enum(['added', 'changed', 'fixed', 'removed']);

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
const MeasurementSourceSchema = z.enum(['manual', 'withings']);
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

const AgentSessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  projectId: z.string(),
  status: z.enum(['idle', 'running', 'paused', 'error', 'completed']),
  worktreePath: z.string().optional(),
  terminalId: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
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

const IntentTypeSchema = z.enum(['quick_command', 'task_creation', 'conversation']);

const AssistantActionSchema = z.enum([
  'create_task',
  'create_time_block',
  'create_note',
  'create_reminder',
  'search',
  'spotify_control',
  'open_url',
  'conversation',
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

  // ── Agents (global) ──
  'agents.listAll': {
    input: z.object({}),
    output: z.array(AgentSessionSchema),
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
  TaskSchema,
  TaskDraftSchema,
  TaskStatusSchema,
  ProjectSchema,
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
};
