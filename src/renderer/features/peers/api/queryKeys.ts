/**
 * Peers query key factory — re-exported from @shared/ipc/peers.
 *
 * The canonical definition now lives in `src/shared/ipc/peers/queryKeys.ts`
 * so cross-feature consumers (e.g. EventBridge) can import it without
 * crossing the renderer's `boundaries/dependencies` rule. This re-export
 * preserves the existing import path for renderer code. Audit 05/T13.
 */
export { peerKeys } from '@shared/ipc/peers';
