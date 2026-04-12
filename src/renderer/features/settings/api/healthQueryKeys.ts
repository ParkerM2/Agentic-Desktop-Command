/**
 * Health query keys factory
 */
export const healthKeys = {
  all: ['health'] as const,
  errorLog: (since?: string) => [...healthKeys.all, 'errorLog', since] as const,
  errorStats: () => [...healthKeys.all, 'errorStats'] as const,
  status: () => [...healthKeys.all, 'status'] as const,
};
