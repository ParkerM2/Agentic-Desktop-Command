/**
 * Insights Service — Aggregates metrics from tasks, agents, and projects
 *
 * Reads data from task and agent services to compute real-time metrics.
 * All methods are synchronous; IPC handlers wrap with Promise.resolve().
 */

import type {
  InsightMetrics,
  InsightTimeSeries,
  ProjectInsights,
  TaskDistribution,
} from '@shared/types';

import type { AgentService } from '../agent/agent-service';
import type { AgentOrchestrator } from '../agent-orchestrator/types';
import type { ProjectService } from '../project/project-service';
import type { TaskService } from '../project/task-service';
import type { QaRunner } from '../qa/qa-types';

export interface InsightsService {
  getMetrics: (projectId?: string) => InsightMetrics;
  getTimeSeries: (projectId?: string, days?: number) => InsightTimeSeries[];
  getTaskDistribution: (projectId?: string) => TaskDistribution[];
  getProjectBreakdown: () => ProjectInsights[];
}

export function createInsightsService(deps: {
  taskService: TaskService;
  agentService: AgentService;
  projectService: ProjectService;
  agentOrchestrator?: AgentOrchestrator;
  qaRunner?: QaRunner;
}): InsightsService {
  const { taskService, agentService, projectService, agentOrchestrator, qaRunner } = deps;

  function getOrchestratorMetrics(): {
    sessionsToday: number;
    successRate: number;
    avgDuration: number;
  } {
    if (!agentOrchestrator) {
      return { sessionsToday: 0, successRate: 0, avgDuration: 0 };
    }

    const today = new Date().toISOString().split('T')[0] ?? '';
    const allSessions = [...agentOrchestrator.listActiveSessions()];

    const sessionsToday = allSessions.filter(
      (s) => s.spawnedAt.startsWith(today),
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
        totalDuration += Date.now() - Date.parse(s.spawnedAt);
      }
      avgDuration = Math.round(totalDuration / completed.length);
    }

    return { sessionsToday, successRate, avgDuration };
  }

  function getQaPassRate(projectIds: string[]): number {
    if (!qaRunner) {
      return 0;
    }
    let qaTotal = 0;
    let qaPassed = 0;
    for (const pid of projectIds) {
      const tasks = taskService.listTasks(pid);
      for (const task of tasks) {
        const report = qaRunner.getReportForTask(task.id);
        if (report) {
          qaTotal++;
          if (report.result === 'pass') {
            qaPassed++;
          }
        }
      }
    }
    return qaTotal > 0 ? Math.round((qaPassed / qaTotal) * 100) : 0;
  }

  return {
    getMetrics(projectId) {
      const projects = projectService.listProjectsSync();
      const projectIds = projectId ? [projectId] : projects.map((p) => p.id);

      let totalTasks = 0;
      let completedTasks = 0;

      for (const pid of projectIds) {
        const tasks = taskService.listTasks(pid);
        totalTasks += tasks.length;
        completedTasks += tasks.filter((t) => t.status === 'done').length;
      }

      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Agent metrics from first project (agents are project-scoped)
      const agentProjectId = projectId ?? (projectIds.length > 0 ? projectIds[0] : '');
      const agents = agentProjectId ? agentService.listAgents(agentProjectId) : [];
      const activeAgents = agents.filter((a) => a.status === 'running').length;
      const completedAgents = agents.filter((a) => a.status === 'completed').length;
      const agentSuccessRate =
        agents.length > 0 ? Math.round((completedAgents / agents.length) * 100) : 0;

      // Orchestrator and QA metrics
      const orchMetrics = getOrchestratorMetrics();
      const qaPassRate = getQaPassRate(projectIds);

      return {
        totalTasks,
        completedTasks,
        completionRate,
        agentRunCount: agents.length,
        agentSuccessRate,
        activeAgents,
        orchestratorSessionsToday: orchMetrics.sessionsToday,
        orchestratorSuccessRate: orchMetrics.successRate,
        averageAgentDuration: orchMetrics.avgDuration,
        qaPassRate,
        totalTokenCost: 0,
      };
    },

    getTimeSeries(projectId, days = 7) {
      const projects = projectService.listProjectsSync();
      const projectIds = projectId ? [projectId] : projects.map((p) => p.id);
      const result: InsightTimeSeries[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        let tasksCompleted = 0;
        for (const pid of projectIds) {
          const tasks = taskService.listTasks(pid);
          tasksCompleted += tasks.filter(
            (t) => t.status === 'done' && t.updatedAt.startsWith(dateStr),
          ).length;
        }

        // Count orchestrator sessions spawned on this date
        let agentRuns = 0;
        if (agentOrchestrator) {
          const activeSessions = agentOrchestrator.listActiveSessions();
          agentRuns = activeSessions.filter(
            (s) => s.spawnedAt.startsWith(dateStr),
          ).length;
        }

        result.push({
          date: dateStr,
          tasksCompleted,
          agentRuns,
        });
      }

      return result;
    },

    getTaskDistribution(projectId) {
      const projects = projectService.listProjectsSync();
      const projectIds = projectId ? [projectId] : projects.map((p) => p.id);

      const statusCounts: Record<string, number> = {};
      let total = 0;

      for (const pid of projectIds) {
        const tasks = taskService.listTasks(pid);
        for (const task of tasks) {
          statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1;
          total++;
        }
      }

      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));
    },

    getProjectBreakdown() {
      const projects = projectService.listProjectsSync();

      return projects.map((project) => {
        const tasks = taskService.listTasks(project.id);
        const completedCount = tasks.filter((t) => t.status === 'done').length;
        const taskCount = tasks.length;
        const completionRate = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

        return {
          projectId: project.id,
          projectName: project.name,
          taskCount,
          completedCount,
          completionRate,
        };
      });
    },
  };
}
