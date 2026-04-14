/**
 * workspaces — SQLite entity CRUD layer.
 *
 * Manages Workspace records in the database (create/read/update/delete).
 * IPC domain: WORKSPACES.* (src/shared/ipc/misc/ — workspaces channels)
 * Backend: WorkspacesService + migration 0014_add_workspaces_table
 *
 * @see workspace (singular) for the runtime session layer (spawn/stop agent teams)
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
