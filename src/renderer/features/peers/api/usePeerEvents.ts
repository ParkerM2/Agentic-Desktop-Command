import { useCallback, useState } from 'react';

import { PEERS_EVENTS } from '@shared/ipc/peers';
import type { PinIssuedEvent } from '@shared/ipc/peers';

import { useIpcEvent } from '@renderer/shared/hooks/useIpcEvent';

/**
 * Subscribes to PEERS_EVENTS.PIN.ISSUED and exposes the latest unseen PIN.
 * Caller calls `dismiss()` when the user closes the dialog. Multiple PINs
 * in quick succession overwrite the previous (Phase 3b accepts this).
 */
export function useIncomingPin(): { pin: PinIssuedEvent | null; dismiss: () => void } {
  const [pin, setPin] = useState<PinIssuedEvent | null>(null);
  useIpcEvent(PEERS_EVENTS.PIN.ISSUED, (payload) => {
    setPin(payload);
  });
  const dismiss = useCallback(() => {
    setPin(null);
  }, []);
  return { pin, dismiss };
}
