import { useEffect, useState } from 'react';

import { PEERS_EVENTS } from '@shared/ipc/peers';
import type { PinIssuedEvent } from '@shared/ipc/peers';

/**
 * Subscribes to PEERS_EVENTS.PIN.ISSUED and exposes the latest unseen PIN.
 * Caller calls `dismiss()` when the user closes the dialog. Multiple PINs
 * in quick succession overwrite the previous (Phase 3b accepts this).
 */
export function useIncomingPin(): { pin: PinIssuedEvent | null; dismiss: () => void } {
  const [pin, setPin] = useState<PinIssuedEvent | null>(null);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (typeof window === 'undefined' || !window.api) return;
    const cleanup = window.api.on(PEERS_EVENTS.PIN.ISSUED, (payload: unknown) => {
      setPin(payload as PinIssuedEvent);
    });
    return cleanup;
  }, []);
  return {
    pin,
    dismiss: () => {
      setPin(null);
    },
  };
}
