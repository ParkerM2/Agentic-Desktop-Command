import { domain, events } from '../channel-builder';

export const BRIEFING = domain('briefing', {
  GET: ['daily', 'config', 'suggestions'],
  GENERATE: ['daily'],
  UPDATE: ['config'],
});

export const BRIEFING_EVENTS = events('briefing', {
  BRIEFING: ['ready'],
});
