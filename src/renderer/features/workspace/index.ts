/**
 * workspace — Runtime session layer.
 *
 * Handles spawning and stopping agent team-lead sessions for a project.
 * IPC domain: WORKSPACE.* (src/shared/ipc/workspace/)
 * Backend: busSessionManager (command bus, NOT SQLite CRUD)
 *
 * @see workspaces (plural) for the SQLite entity CRUD feature
 */
export { WorkspacePage } from './components/WorkspacePage';
