/**
 * Briefing IPC Schemas
 *
 * Zod schemas for daily briefings, suggestions, and briefing configuration.
 */

import { z } from 'zod';

export const SuggestionTypeSchema = z.enum(['stale_project', 'parallel_tasks', 'blocked_task']);

export const SuggestionActionSchema = z.object({
  label: z.string(),
  targetId: z.string().optional(),
  targetType: z.enum(['project', 'task']).optional(),
});

export const SuggestionSchema = z.object({
  type: SuggestionTypeSchema,
  title: z.string(),
  description: z.string(),
  action: SuggestionActionSchema.optional(),
});

export const TaskSummarySchema = z.object({
  dueToday: z.number(),
  completedYesterday: z.number(),
  overdue: z.number(),
  inProgress: z.number(),
});

export const AgentActivitySummarySchema = z.object({
  runningCount: z.number(),
  completedToday: z.number(),
  errorCount: z.number(),
});

export const DailyBriefingSchema = z.object({
  id: z.string(),
  date: z.string(),
  summary: z.string(),
  taskSummary: TaskSummarySchema,
  agentActivity: AgentActivitySummarySchema,
  suggestions: z.array(SuggestionSchema),
  githubNotifications: z.number().optional(),
  generatedAt: z.string(),
});

export const BriefingConfigSchema = z.object({
  enabled: z.boolean(),
  scheduledTime: z.string(),
  includeGitHub: z.boolean(),
  includeAgentActivity: z.boolean(),
});
