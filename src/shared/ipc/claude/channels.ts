import { domain, events } from '../channel-builder';

export const CLAUDE = domain('claude', {
  SEND: ['message'],
  STREAM: ['message'],
  CREATE: ['conversation'],
  LIST: ['conversations'],
  GET: ['messages'],
  CLEAR: ['conversation'],
  CHECK: ['configured'],
  SCAN: ['config'],
});

export const CLAUDE_EVENTS = events('claude', {
  STREAM: ['chunk'],
});
