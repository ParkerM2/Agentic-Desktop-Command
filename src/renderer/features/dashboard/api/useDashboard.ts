/**
 * React Query hooks for dashboard data
 *
 * Re-exports project, agent, and capture hooks for dashboard consumption.
 */

export { useProjects } from '@features/projects';
export { useAgents } from '@features/agents';
export { useCaptures, useCaptureMutations } from './useCaptures';
