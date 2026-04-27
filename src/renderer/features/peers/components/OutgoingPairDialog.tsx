import type { DiscoveredPeer } from '@shared/ipc/peers';

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

import { useOutgoingPair } from '../hooks/useOutgoingPair';

interface OutgoingPairDialogProps {
  target: DiscoveredPeer;
  onClose: () => void;
}

/**
 * Initiator-side three-step flow: send invite → enter PIN → confirm.
 * Render-only — all state and mutations live in `useOutgoingPair`.
 */
export function OutgoingPairDialog({ target, onClose }: OutgoingPairDialogProps) {
  const vm = useOutgoingPair(target, onClose);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) vm.close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pair with {vm.targetLabel}</DialogTitle>
          <DialogDescription>
            {target.host}:{target.port}
          </DialogDescription>
        </DialogHeader>

        {vm.stage === 'idle' && (
          <Stack gap="md">
            <Text variant="muted">
              Click Send invite. The receiving device will display a 6-digit PIN that you enter
              here to complete pairing.
            </Text>
            {vm.initError === null ? null : (
              <Text role="alert" variant="error">
                Failed to send invite: {vm.initError.message}
              </Text>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={vm.close}>
                Cancel
              </Button>
              <Button disabled={vm.isInitPending} onClick={vm.sendInvite}>
                {vm.isInitPending ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </Stack>
        )}

        {vm.stage === 'awaiting-pin' && (
          <Stack gap="md">
            <Stack gap="sm">
              <Label htmlFor="pair-pin-input">
                Enter the 6-digit PIN displayed on {vm.targetLabel}
              </Label>
              <Input
                id="pair-pin-input"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={vm.pin}
                onChange={(e) => vm.setPin(e.target.value)}
              />
            </Stack>
            {vm.confirmError === null ? null : (
              <Text role="alert" variant="error">
                Pairing failed: {vm.confirmError.message}
              </Text>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={vm.close}>
                Cancel
              </Button>
              <Button disabled={!vm.canConfirm} onClick={vm.confirm}>
                {vm.isConfirmPending ? 'Confirming…' : 'Confirm'}
              </Button>
            </DialogFooter>
          </Stack>
        )}

        {vm.stage === 'done' && (
          <Stack gap="md">
            <Text variant="success">Pairing complete. {vm.targetLabel} is now trusted.</Text>
            <DialogFooter>
              <Button onClick={vm.close}>Close</Button>
            </DialogFooter>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
