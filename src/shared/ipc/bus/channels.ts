import { domain, events } from '../channel-builder';

export const BUS = domain('bus', {
  QUERY: ['commands', 'events'],
  LIST: ['sessions'],
  GET: ['session', 'registry'],
  SPAWN: ['session'],
  KILL: ['session'],
});

export const BUS_EVENTS = events('bus', {
  SESSION: ['spawned', 'active', 'completed', 'error', 'killed'],
  COMMAND: ['executed'],
});
