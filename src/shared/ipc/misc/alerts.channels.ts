import { domain, events } from '../channel-builder';

export const ALERTS = domain('alerts', {
  LIST: ['all'],
  CREATE: ['alert'],
  DISMISS: ['alert'],
  DELETE: ['alert'],
});

export const ALERTS_EVENTS = events('alerts', {
  ALERT: ['triggered', 'changed'],
});
