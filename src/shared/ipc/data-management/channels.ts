import { domain, events } from '../channel-builder';

export const DATA_MANAGEMENT = domain('data-management', {
  GET: ['registry', 'usage', 'retention'],
  UPDATE: ['retention'],
  CLEAR: ['store'],
  RUN: ['cleanup'],
  EXPORT: ['data'],
  IMPORT: ['data'],
});

export const DATA_MANAGEMENT_EVENTS = events('data-management', {
  CLEANUP: ['complete'],
});
