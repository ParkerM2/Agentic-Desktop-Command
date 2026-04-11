/**
 * Insights Service — Aggregates metrics from tasks, agents, and projects
 *
 * Reads data from progress and agent services to compute real-time metrics.
 * Methods are async because ProgressService.listTasks() returns a Promise.
 */

import type {
  InsightMetrics,
  InsightTimeSeries,
  ProjectInsights,
  TaskDistribution,
} from '@shared/types';
import type { ProgressTask } from '@shared/types/progress';

import type { BusSessionManager } from '../../bus/session-manager';
import type { ProgressService } from '../progress/progress-service';
import type { ProjectService } from '../project/project-service';
import type { QaRunner } from '../qa/qa-types';

export interface InsightsService {
  getMetrics: () => Promise<InsightMetrics>;
  getTimeSeries: (days?: number) => Promise<InsightTimeSeries[]>;
  getTaskDistribution: () => Promise<TaskDistribution[]>;
  getProjectBreakdown: () => Promise<ProjectInsights[]>;
}

export function createInsightsService(deps: {
  progressService: ProgressService;
  projectService: ProjectService;
  busSessionManager: BusSessionManager;
  qaRunner?: QaRunner;
}): InsightsService {
  const { progressService, projectService, busSessionManager, qaRunner } = deps;

  function getOrchestratorTokenCost(): number {
    // AgentSession does not yet track per-session token costs.
    // When the orchestrator adds cost tracking to AgentSession,
    // sum completed session costs here. For now return 0.
    return 0;
  }

  function getOrchestratorMetrics(): {
    sessionsToday: number;
    successRate: number;
    avgDuration: number;
    activeCount: number;
  } {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const allSessions = [...busSessionManager.list()];

    const sessionsToday = allSessions.filter(
      (s) => s.startedAt.startsWith(today),
    ).length;

    const activeCount = allSessions.filter(
      (s) => s.status === 'active' || s.status === 'spawning',
    ).length;

    const finished = allSessions.filter(
      (s) => s.status === 'completed' || s.status === 'error',
    );
    const successCount = finished.filter((s) => s.status === 'completed').length;
    const successRate =
      finished.length > 0 ? Math.round((successCount / finished.length) * 100) : 0;

    const completed = finished.filter((s) => s.status === 'completed');
    let avgDuration = 0;
    if (completed.length > 0) {
      let totalDuration = 0;
      for (const s of completed) {
        totalDuration += Date.now() - Date.parse(s.startedAt);
      }
      avgDuration = Math.round(totalDuration / completed.length);
    }

    return { sessionsToday, successRate, avgDuration, activeCount };
  }

  function getQaPassRate(tasks: ProgressTask[]): number {
    if (!qaRunner) {
      return 0;
    }
    let qaTotal = 0;
    let qaPassed = 0;
    for (const task of tasks) {
      const report = qaRunner.getReportForTask(task.slug);
      if (report) {
        qaTotal++;
        if (report.result === 'pass') {
          qaPassed++;
        }
      }
    }
    return qaTotal > 0 ? Math.round((qaPassed / qaTotal) * 100) : 0;
  }

  return {
    async getMetrics() {
      const tasks = await progressService.listTasks();

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === 'done').length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Agent metrics from orchestrator
      const orchMetrics = getOrchestratorMetrics();
      const qaPassRate = getQaPassRate(tasks);

      return {
        totalTasks,
        completedTasks,
        completionRate,
        agentRunCount: orchMetrics.sessionsToday,
        agentSuccessRate: orchMetrics.successRate,
        activeAgents: orchMetrics.activeCount,
        orchestratorSessionsToday: orchMetrics.sessionsToday,
        orchestratorSuccessRate: orchMetrics.successRate,
        averageAgentDuration: orchMetrics.avgDuration,
        qaPassRate,
        totalTokenCost: getOrchestratorTokenCost(),
      };
    },

    async getTimeSeries(days = 7) {
      const tasks = await progressService.listTasks();
      const result: InsightTimeSeries[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const tasksCompleted = tasks.filter(
          (t) => t.status === 'done' && t.updatedAt.startsWith(dateStr),
        ).length;

        // Count sessions spawned on this date
        const allSessions = busSessionManager.list();
        const agentRuns = allSessions.filter(
          (s) => s.startedAt.startsWith(dateStr),
        ).length;

        result.push({
          date: dateStr,
          tasksCompleted,
          agentRuns,
        });
      }

      return result;
    },

    async getTaskDistribution() {
      const tasks = await progressService.listTasks();

      const statusCounts: Record<string, number> = {};
      const total = tasks.length;

      for (const task of tasks) {
        statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
      }

      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
    },

    async getProjectBreakdown() {
      const projects = projectService.listProjectsSync();
      const tasks = await progressService.listTasks();

      // Progress tasks are global (not per-project). Aggregate all tasks
      // under the first project for now; per-project mapping can be added
      // when ProgressTask gains a projectId field.
      const completedCount = tasks.filter((t) => t.status === 'done').length;
      const taskCount = tasks.length;
      const completionRate = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

      return projects.map((project, idx) => ({
        projectId: project.id,
        projectName: project.name,
        // Attribute all tasks to the first project; others get zero
        taskCount: idx === 0 ? taskCount : 0,
        completedCount: idx === 0 ? completedCount : 0,
        completionRate: idx === 0 ? completionRate : 0,
      }));
    },
  };
}
