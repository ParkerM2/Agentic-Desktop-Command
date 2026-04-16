import { domain, events } from '../channel-builder';

export const RUNNERS = domain('runners', {
  PROFILE: ['list', 'save', 'delete'],
  INSTANCE: ['list', 'start', 'stop', 'restart'],
});

export const RUNNERS_EVENTS = events('runners', {
  INSTANCE: ['status', 'output', 'health'],
});
