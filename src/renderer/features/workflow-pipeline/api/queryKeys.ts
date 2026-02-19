/**
 * Workflow Pipeline query keys factory
 */
export const workflowPipelineKeys = {
  all: ['workflow-pipeline'] as const,
  task: (taskId: string) => [...workflowPipelineKeys.all, 'task', taskId] as const,
};
