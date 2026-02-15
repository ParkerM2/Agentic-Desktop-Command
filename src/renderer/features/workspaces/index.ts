/**
 * Workspaces feature — public API
 */

// API hooks
export {
  useWorkspaces,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
} from './api/useWorkspaces';
export { workspaceKeys } from './api/queryKeys';

// Events
export { useWorkspaceEvents } from './hooks/useWorkspaceEvents';

// Store
export { useWorkspaceStore } from './store';
