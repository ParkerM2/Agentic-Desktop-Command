import { domain, events } from '../channel-builder';

export const PLANNER = domain('planner', {
  GET: ['day', 'week'],
  UPDATE: ['day', 'weekly-reflection'],
  ADD: ['time-block'],
  MODIFY: ['time-block'],
  REMOVE: ['time-block'],
  GENERATE: ['weekly-review'],
});

export const PLANNER_EVENTS = events('planner', {
  DAY: ['changed'],
});
