/**
 * Planner query keys factory
 */
export const plannerKeys = {
  all: ['planner'] as const,
  days: () => [...plannerKeys.all, 'day'] as const,
  day: (date: string) => [...plannerKeys.days(), date] as const,
  weeks: () => [...plannerKeys.all, 'week'] as const,
  week: (startDate: string) => [...plannerKeys.weeks(), startDate] as const,
};
