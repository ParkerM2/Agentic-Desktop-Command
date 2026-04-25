/**
 * Peers query key factory
 */

export const peerKeys = {
  all: ['peers'] as const,
  paired: () => [...peerKeys.all, 'paired'] as const,
  discovered: () => [...peerKeys.all, 'discovered'] as const,
  identity: () => [...peerKeys.all, 'identity'] as const,
};
