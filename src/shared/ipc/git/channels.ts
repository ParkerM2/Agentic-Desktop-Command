import { domain, events } from '../channel-builder';

export const GIT = domain('git', {
  GET: ['status', 'branches', 'remote-url'],
  CREATE: ['branch', 'pr', 'worktree'],
  REMOVE: ['worktree'],
  LIST: ['worktrees'],
  COMMIT: ['changes'],
  PUSH: ['changes'],
  RESOLVE: ['conflict'],
  DETECT: ['structure'],
});

export const GIT_EVENTS = events('git', {
  WORKTREE: ['changed'],
});
