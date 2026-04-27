/**
 * Peers query key factory — single source of truth shared between the
 * renderer's peers feature hooks and the cross-feature EventBridge.
 *
 * Located in @shared/ipc/peers (rather than @features/peers) so EventBridge
 * can import without crossing the renderer's `boundaries/dependencies` rule.
 * Audit 05/T13.
 */
export const peerKeys = {
  all: ['peers'] as const,
  paired: () => [...peerKeys.all, 'paired'] as const,
  discovered: () => [...peerKeys.all, 'discovered'] as const,
  identity: () => [...peerKeys.all, 'identity'] as const,
};
