import { domain, events } from '../channel-builder';

export const MILESTONES = domain('milestones', {
  LIST: ['all'],
  CREATE: ['milestone'],
  UPDATE: ['milestone'],
  DELETE: ['milestone'],
  ADD: ['task'],
  TOGGLE: ['task'],
});

export const MILESTONES_EVENTS = events('milestones', {
  MILESTONE: ['changed'],
});
