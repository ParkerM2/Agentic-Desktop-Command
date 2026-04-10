/** Workspace feature — public API */
export { WorkspacePage } from './components/WorkspacePage';
export {
  useRelaySessions,
  useRelayBuffer,
  useSendRelayInput,
  useSpawnRemoteSession,
} from './api/useWorkspace';
export { useRelaySession } from './hooks/useRelaySession';
export type { RelayOutputLine, RelaySessionState } from './hooks/useRelaySession';
