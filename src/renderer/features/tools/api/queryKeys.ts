export const toolsKeys = {
  all: ['tools'] as const,
  claudeConfig: () => [...toolsKeys.all, 'claude', 'config'] as const,
};
