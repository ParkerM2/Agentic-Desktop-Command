/**
 * Voice query keys factory
 */
export const voiceKeys = {
  all: ['voice'] as const,
  config: () => [...voiceKeys.all, 'config'] as const,
  permission: () => [...voiceKeys.all, 'permission'] as const,
};
