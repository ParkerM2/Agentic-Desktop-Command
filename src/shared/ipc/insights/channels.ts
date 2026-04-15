import { domain } from '../channel-builder';

export const INSIGHTS = domain('insights', {
  GET: ['metrics', 'time-series', 'task-distribution', 'project-breakdown'],
});
