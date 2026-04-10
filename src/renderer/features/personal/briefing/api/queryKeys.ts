/**
 * Briefing query key factory
 */

export const briefingKeys = {
  all: ['briefing'] as const,
  daily: () => [...briefingKeys.all, 'daily'] as const,
  config: () => [...briefingKeys.all, 'config'] as const,
  suggestions: () => [...briefingKeys.all, 'suggestions'] as const,
};
