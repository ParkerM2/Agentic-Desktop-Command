import { domain, events } from '../channel-builder';

export const AGENT_DASHBOARD = domain('agent-dashboard', {
  SPAWN: ['project-owner', 'team-lead'],
  LIST: ['sessions', 'qa-sessions', 'sessions-for-task'],
  GET: ['session', 'files-changed', 'tasks-for-feature', 'task', 'qa-session', 'session-log', 'git-diff'],
  SEND: ['message'],
  STOP: ['session'],
});

export const AGENT_DASHBOARD_EVENTS = events('agent-dashboard', {
  SESSION: ['started', 'ended', 'status-changed'],
  MESSAGE: ['received'],
  TEAMMATE: ['joined', 'left'],
  STREAM: ['event'],
  TASK: ['updated'],
  QA: ['session-updated'],
});
