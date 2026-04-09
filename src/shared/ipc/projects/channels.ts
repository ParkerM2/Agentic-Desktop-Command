import { domain, events } from '../channel-builder';

export const PROJECTS = domain('projects', {
  LIST: ['all'],
  ADD: ['project'],
  REMOVE: ['project'],
  INITIALIZE: ['project'],
  SELECT: ['directory'],
  DETECT: ['repo'],
  UPDATE: ['project'],
  GET: ['sub-projects'],
  CREATE: ['sub-project', 'new'],
  DELETE: ['sub-project'],
  SETUP: ['existing'],
  ANALYZE: ['codebase'],
});

export const PROJECTS_EVENTS = events('projects', {
  PROJECT: ['updated'],
  SETUP: ['progress'],
});
