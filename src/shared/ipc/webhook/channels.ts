import { events } from '../channel-builder';

export const WEBHOOK_EVENTS = events('webhook', {
  COMMAND: ['received'],
});
