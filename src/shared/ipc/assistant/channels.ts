import { domain, events } from '../channel-builder';

export const ASSISTANT = domain('assistant', {
  START: ['session'],
  SEND: ['command'],
  GET: ['history'],
  CLEAR: ['history'],
});

export const ASSISTANT_EVENTS = events('assistant', {
  MESSAGE: ['response', 'thinking'],
  TOOL: ['executed'],
  SESSION: ['autostart'],
});
