/**
 * Agent Dashboard query keys factory
 *
 * Hierarchical key structure for React Query cache management.
 * All agent dashboard queries share the 'agent-dashboard' prefix,
 * enabling targeted or broad cache invalidation.
 */

export const agentDashboardKeys = {
  all: ['agent-dashboard'] as const,
  sessions: () => [...agentDashboardKeys.all, 'sessions'] as const,
  session: (id: string) => [...agentDashboardKeys.all, 'session', id] as const,
  messages: (sessionId: string) => [...agentDashboardKeys.all, 'messages', sessionId] as const,
  filesChanged: (branch: string) => [...agentDashboardKeys.all, 'files', branch] as const,
  tasks: (featureSlug: string) => [...agentDashboardKeys.all, 'tasks', featureSlug] as const,
  task: (featureSlug: string, taskNumber: number) =>
    [...agentDashboardKeys.all, 'task', featureSlug, taskNumber] as const,
  qaSession: (taskId: string) => [...agentDashboardKeys.all, 'qa', taskId] as const,
  qaSessions: () => [...agentDashboardKeys.all, 'qa-sessions'] as const,
};
