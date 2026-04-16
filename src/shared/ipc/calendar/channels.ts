import { domain } from '../channel-builder';

export const CALENDAR = domain('calendar', {
  LIST: ['events'],
  CREATE: ['event'],
  DELETE: ['event'],
});
