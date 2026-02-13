/**
 * My Work query keys factory
 */
export const myWorkKeys = {
  all: ['my-work'] as const,
  tasks: () => [...myWorkKeys.all, 'tasks'] as const,
};
