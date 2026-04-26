/**
 * Presentation hook for the initiator-side pairing dialog.
 *
 * Owns the three-stage state machine (`idle` → `awaiting-pin` → `done`),
 * holds the `{ sessionId, challenge }` returned by `usePairInit` between
 * mutations, and PIN-sanitizes every keystroke. The component (`OutgoingPairDialog`)
 * is then a render-only switch on `stage`.
 */

import { useCallback, useMemo, useState } from 'react';

import type { DiscoveredPeer, PairInitOutput } from '@shared/ipc/peers';

import { usePairConfirm, usePairInit } from '../api/usePeers';
import { peerLabel, sanitizePin } from '../lib/format';

export type Stage = 'idle' | 'awaiting-pin' | 'done';

export interface UseOutgoingPairResult {
  stage: Stage;
  pin: string;
  setPin: (raw: string) => void;
  targetLabel: string;
  isInitPending: boolean;
  isConfirmPending: boolean;
  initError: Error | null;
  confirmError: Error | null;
  canConfirm: boolean;
  sendInvite: () => void;
  confirm: () => void;
  close: () => void;
}

/**
 * @param target  the discovered peer being invited (component renders only when
 *                non-null; we accept `DiscoveredPeer` directly to keep the
 *                contract identical to the previous prop shape)
 * @param onClose external close handler (parent clears its `inviteTarget`)
 */
export function useOutgoingPair(
  target: DiscoveredPeer,
  onClose: () => void,
): UseOutgoingPairResult {
  const [stage, setStage] = useState<Stage>('idle');
  const [session, setSession] = useState<PairInitOutput | null>(null);
  const [pinValue, setPinValue] = useState('');

  const pairInit = usePairInit();
  const pairConfirm = usePairConfirm();

  const targetLabel = useMemo(() => peerLabel(target), [target]);

  const setPin = useCallback((raw: string) => {
    setPinValue(sanitizePin(raw));
  }, []);

  const sendInvite = useCallback(() => {
    pairInit.mutate(
      {
        host: target.host,
        port: target.port,
        fingerprint: target.fingerprint,
        displayName: target.displayName ?? null,
      },
      {
        onSuccess(result) {
          setSession(result);
          setStage('awaiting-pin');
        },
      },
    );
  }, [pairInit, target.host, target.port, target.fingerprint, target.displayName]);

  const confirm = useCallback(() => {
    if (session === null || pinValue.length !== 6) return;
    pairConfirm.mutate(
      {
        host: target.host,
        port: target.port,
        fingerprint: target.fingerprint,
        sessionId: session.sessionId,
        challenge: session.challenge,
        pin: pinValue,
        displayName: target.displayName ?? null,
      },
      {
        onSuccess() {
          setStage('done');
        },
      },
    );
  }, [
    pairConfirm,
    session,
    pinValue,
    target.host,
    target.port,
    target.fingerprint,
    target.displayName,
  ]);

  const close = useCallback(() => {
    pairInit.reset();
    pairConfirm.reset();
    onClose();
  }, [pairInit, pairConfirm, onClose]);

  return {
    stage,
    pin: pinValue,
    setPin,
    targetLabel,
    isInitPending: pairInit.isPending,
    isConfirmPending: pairConfirm.isPending,
    initError: pairInit.error,
    confirmError: pairConfirm.error,
    canConfirm: pinValue.length === 6 && !pairConfirm.isPending,
    sendInvite,
    confirm,
    close,
  };
}
