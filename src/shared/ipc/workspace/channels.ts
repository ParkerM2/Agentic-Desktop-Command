import { domain, events } from '../channel-builder';

export const WORKSPACE = domain('workspace', {
  INIT: ['project', 'all-projects'],
  GET: ['sessions'],
  SPAWN: ['team-lead'],
  STOP: ['team-lead', 'project'],
  SEND: ['message'],
  HANDOFF: ['plan'],
  EXECUTE: ['task'],
  PROVISION: ['teammate'],
  TEARDOWN: ['teammate'],
});

export const WORKSPACE_EVENTS = events('workspace', {
  SESSION: ['ready', 'crashed', 'restarted'],
  PLAN: ['handed-off'],
});
