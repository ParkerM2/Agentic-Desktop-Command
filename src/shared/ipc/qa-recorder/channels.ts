import { domain, events } from '../channel-builder';

export const QA_RECORDER = domain('qa-recorder', {
  LIST: ['scripts', 'runs'],
  GET: ['script', 'run'],
  SAVE: ['script'],
  DELETE: ['script'],
  RUN: ['script'],
  EXPORT: ['file', 'github'],
});

export const QA_RECORDER_EVENTS = events('qa-recorder', {
  OUTPUT: ['line'],
  RUN: ['screenshot', 'complete'],
});
