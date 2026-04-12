import { domain, events } from '../channel-builder';

export const FITNESS = domain('fitness', {
  LOG: ['workout', 'measurement'],
  LIST: ['workouts', 'goals'],
  GET: ['measurements', 'stats'],
  SET: ['goal'],
  UPDATE: ['goal-progress', 'goal', 'workout', 'measurement'],
  DELETE: ['workout', 'goal', 'measurement'],
});

export const FITNESS_EVENTS = events('fitness', {
  WORKOUT: ['changed'],
  MEASUREMENT: ['changed'],
  GOAL: ['changed'],
});
