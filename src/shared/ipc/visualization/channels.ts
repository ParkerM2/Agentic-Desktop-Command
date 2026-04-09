import { domain } from '../channel-builder';

export const VISUALIZATION = domain('visualization', {
  GET: ['codebase-graph', 'agent-teams', 'session-log'],
});
