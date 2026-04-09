import { domain, events } from '../channel-builder';

export const TERMINALS = domain('terminals', {
  LIST: ['all'],
  CREATE: ['session'],
  CLOSE: ['session'],
  SEND: ['input'],
  RESIZE: ['session'],
  INVOKE: ['claude-cli'],
});

export const TERMINALS_EVENTS = events('terminals', {
  TERMINAL: ['output', 'closed', 'title-changed'],
});
