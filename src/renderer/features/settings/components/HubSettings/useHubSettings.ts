/**
 * useHubSettings — logic hook for the HubSettings page chrome.
 *
 * The page now delegates pair / switch / remove / manual-add to
 * `HubPickerPanel`, so this hook only exposes the status-dot,
 * pending-mutation counter, last-connected stamp, and the sync toast.
 */

import { useHubStatus, useHubSync } from '../../api/useHub';

export function useHubSettings() {
  const { data: hubStatus, isLoading } = useHubStatus();
  const syncMutation = useHubSync();

  const statusValue = hubStatus?.status ?? 'disconnected';
  const isConnected = statusValue === 'connected';
  const pendingCount = hubStatus?.pendingMutations ?? 0;

  return {
    hubStatus,
    isLoading,
    statusValue,
    isConnected,
    pendingCount,
    syncMutation,
  };
}
