import { domain } from '../channel-builder';

export const TRACKER = domain('tracker', {
  LIST: ['all'],
  GET: ['plan'],
  UPDATE: ['plan'],
});
