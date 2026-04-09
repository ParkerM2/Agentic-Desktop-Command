import { domain, events } from '../channel-builder';

export const VOICE = domain('voice', {
  GET: ['config'],
  UPDATE: ['config'],
  CHECK: ['permission'],
});

export const VOICE_EVENTS = events('voice', {
  SPEECH: ['transcript'],
});
