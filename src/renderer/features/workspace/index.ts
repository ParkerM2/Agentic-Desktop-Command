/**
 * workspace — Runtime session layer + SQLite entity CRUD layer.
 *
 * Session layer: spawning and stopping agent team-lead sessions for a project.
 *   IPC domain: WORKSPACE.* (src/shared/ipc/workspace/)
 *   Backend: busSessionManager (command bus, NOT SQLite CRUD)
 *
 * CRUD layer: manage Workspace records in the database (create/read/update/delete).
 *   IPC domain: WORKSPACES.* (src/shared/ipc/workspaces/)
 *   Backend: WorkspacesService + migration 0014_add_workspaces_table
 */
export { WorkspacePage } from './components/WorkspacePage';

// API hooks (CRUD)
export {
  useWorkspaces,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
} from './api/useWorkspaces';
export { workspaceKeys } from './api/workspacesQueryKeys';

// Store (persisted active workspace selection)
export { useWorkspaceStore as useWorkspacesStore } from './workspaces-store';
