/**
 * Workflow query keys factory
 */
export const workflowKeys = {
  all: ['workflow'] as const,
  session: (sessionId: string) => [...workflowKeys.all, 'session', sessionId] as const,
};
