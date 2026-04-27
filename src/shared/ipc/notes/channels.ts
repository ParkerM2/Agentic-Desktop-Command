import { domain, events } from '../channel-builder';

export const NOTES = domain('notes', {
  LIST: ['all'],
  CREATE: ['note'],
  UPDATE: ['note'],
  DELETE: ['note'],
  SEARCH: ['notes'],
});

export const NOTES_EVENTS = events('notes', {
  NOTE: ['changed'],
});
