/**
 * Dashboard query keys factory
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  captures: () => [...dashboardKeys.all, 'captures'] as const,
};
