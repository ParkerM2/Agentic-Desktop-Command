import { domain, events } from '../channel-builder';

export const EMAIL = domain('email', {
  SEND: ['message'],
  GET: ['config', 'queue'],
  UPDATE: ['config'],
  TEST: ['connection'],
  RETRY: ['queued'],
  REMOVE: ['queued'],
});

export const EMAIL_EVENTS = events('email', {
  MESSAGE: ['sent', 'failed'],
});
