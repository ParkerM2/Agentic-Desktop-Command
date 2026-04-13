import { domain, events } from '../channel-builder';

export const GITHUB = domain('github', {
  LIST: ['prs', 'issues', 'repos'],
  GET: ['pr', 'notifications', 'auth-status', 'pr_files'],
  CREATE: ['issue'],
});

export const GITHUB_EVENTS = events('github', {
  DATA: ['updated'],
});
