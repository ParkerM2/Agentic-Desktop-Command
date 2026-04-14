/**
 * Bus query keys factory
 */
export const busKeys = {
  all: ['bus'] as const,
  sessions: () => [...busKeys.all, 'sessions'] as const,
  session: (sessionId: string) => [...busKeys.all, 'session', sessionId] as const,
};
