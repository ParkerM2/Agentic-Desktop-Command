import type { ScopeRef } from '@shared/ipc/runners/schemas';

export const runnerKeys = {
  all: ['runners'] as const,
  profiles: (projectId: string) => ['runners', 'profiles', projectId] as const,
  instances: (scope: ScopeRef) =>
    [
      'runners',
      'instances',
      scope.kind,
      scope.projectId,
      scope.kind === 'worktree' ? scope.worktreePath : null,
    ] as const,
};
