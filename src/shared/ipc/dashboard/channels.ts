import { domain, events } from '../channel-builder';

export const DASHBOARD = domain('dashboard', {
  LIST: ['captures'],
  CREATE: ['capture'],
  UPDATE: ['capture'],
  DELETE: ['capture'],
});

export const DASHBOARD_EVENTS = events('dashboard', {
  CAPTURE: ['changed'],
});
