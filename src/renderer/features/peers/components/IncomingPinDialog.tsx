import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Stack,
  Text,
} from '@ui';

import { useIncomingPin } from '../api/usePeerEvents';
import { peerLabel } from '../lib/format';

/**
 * Receiver-side modal showing the PIN issued to a remote initiator.
 * Mounted once at the app shell — driven entirely by useIncomingPin.
 */
export function IncomingPinDialog() {
  const { pin, dismiss } = useIncomingPin();
  if (pin === null) return null;
  const initiatorLabel = peerLabel({
    displayName: pin.initiatorDisplayName,
    peerId: pin.initiatorPeerId,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pairing request</DialogTitle>
          <DialogDescription>
            A device ({initiatorLabel}) is requesting to pair. Read this PIN to that device.
          </DialogDescription>
        </DialogHeader>
        <Stack align="center" gap="md">
          <Text className="text-3xl font-mono tracking-widest" size="lg">
            {pin.pin}
          </Text>
        </Stack>
        <DialogFooter>
          <Button onClick={dismiss}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
