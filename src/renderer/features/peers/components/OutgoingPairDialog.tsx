import { useState } from 'react';

import type { DiscoveredPeer, PairInitOutput } from '@shared/ipc/peers';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Stack,
  Text,
} from '@ui';

import { usePairConfirm, usePairInit } from '../api/usePeers';

type Stage = 'idle' | 'awaiting-pin' | 'done';

interface OutgoingPairDialogProps {
  target: DiscoveredPeer;
  onClose: () => void;
}

/**
 * Initiator-side three-step flow: send invite → enter PIN → confirm.
 * Holds the {sessionId, challenge} between mutations as renderer state.
 */
export function OutgoingPairDialog({ target, onClose }: OutgoingPairDialogProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [session, setSession] = useState<PairInitOutput | null>(null);
  const [pin, setPin] = useState('');

  const pairInit = usePairInit();
  const pairConfirm = usePairConfirm();

  const targetLabel = target.displayName ?? `${target.peerId.slice(0, 16)}…`;

  const handleSendInvite = () => {
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
  };

  const handleConfirm = () => {
    if (session === null || pin.length !== 6) return;
    pairConfirm.mutate(
      {
        host: target.host,
        port: target.port,
        fingerprint: target.fingerprint,
        sessionId: session.sessionId,
        challenge: session.challenge,
        pin,
        displayName: target.displayName ?? null,
      },
      {
        onSuccess() {
          setStage('done');
        },
      },
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pair with {targetLabel}</DialogTitle>
          <DialogDescription>
            {target.host}:{target.port}
          </DialogDescription>
        </DialogHeader>

        {stage === 'idle' && (
          <Stack gap="md">
            <Text variant="muted">
              Click Send invite. The receiving device will display a 6-digit PIN that you enter
              here to complete pairing.
            </Text>
            {pairInit.isError ? (
              <Text variant="error">Failed to send invite: {pairInit.error.message}</Text>
            ) : null}
            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={pairInit.isPending} onClick={handleSendInvite}>
                {pairInit.isPending ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </Stack>
        )}

        {stage === 'awaiting-pin' && (
          <Stack gap="md">
            <Stack gap="sm">
              <Label htmlFor="pair-pin-input">Enter the 6-digit PIN displayed on {targetLabel}</Label>
              <Input
                id="pair-pin-input"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replaceAll(/\D/g, '').slice(0, 6))}
              />
            </Stack>
            {pairConfirm.isError ? (
              <Text variant="error">Pairing failed: {pairConfirm.error.message}</Text>
            ) : null}
            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={pin.length !== 6 || pairConfirm.isPending}
                onClick={handleConfirm}
              >
                {pairConfirm.isPending ? 'Confirming…' : 'Confirm'}
              </Button>
            </DialogFooter>
          </Stack>
        )}

        {stage === 'done' && (
          <Stack gap="md">
            <Text variant="success">Pairing complete. {targetLabel} is now trusted.</Text>
            <DialogFooter>
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
