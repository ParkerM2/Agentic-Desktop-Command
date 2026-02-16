/**
 * Insights/metrics-related types
 */

export interface InsightMetrics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  agentRunCount: number;
  agentSuccessRate: number;
  activeAgents: number;
  orchestratorSessionsToday?: number;
  orchestratorSuccessRate?: number;
  averageAgentDuration?: number;
  qaPassRate?: number;
  totalTokenCost?: number;
}

export interface InsightTimeSeries {
  date: string;
  tasksCompleted: number;
  agentRuns: number;
}

export interface TaskDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface ProjectInsights {
  projectId: string;
  projectName: string;
  taskCount: number;
  completedCount: number;
  completionRate: number;
}
