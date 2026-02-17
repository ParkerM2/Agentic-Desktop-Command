/**
 * Insights IPC Contract
 *
 * Invoke channels for analytics metrics, time series, task distribution,
 * and project breakdowns.
 */

import { z } from 'zod';

export const InsightMetricsSchema = z.object({
  totalTasks: z.number(),
  completedTasks: z.number(),
  completionRate: z.number(),
  agentRunCount: z.number(),
  agentSuccessRate: z.number(),
  activeAgents: z.number(),
});

export const InsightTimeSeriesSchema = z.object({
  date: z.string(),
  tasksCompleted: z.number(),
  agentRuns: z.number(),
});

export const TaskDistributionSchema = z.object({
  status: z.string(),
  count: z.number(),
  percentage: z.number(),
});

export const ProjectInsightsSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  taskCount: z.number(),
  completedCount: z.number(),
  completionRate: z.number(),
});

export const insightsInvoke = {
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
} as const;

export const insightsEvents = {} as const;
