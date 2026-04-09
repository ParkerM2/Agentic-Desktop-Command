import { domain, events } from '../channel-builder';

export const IDEAS = domain('ideas', {
  LIST: ['all'],
  CREATE: ['idea'],
  UPDATE: ['idea'],
  DELETE: ['idea'],
  VOTE: ['idea'],
});

export const IDEAS_EVENTS = events('ideas', {
  IDEA: ['changed'],
});
