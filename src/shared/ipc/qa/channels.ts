import { domain, events } from '../channel-builder';

export const QA = domain('qa', {
  START: ['quiet', 'full'],
  GET: ['report', 'session'],
  CANCEL: ['session'],
});

export const QA_EVENTS = events('qa', {
  SESSION: ['started', 'progress', 'completed'],
});
