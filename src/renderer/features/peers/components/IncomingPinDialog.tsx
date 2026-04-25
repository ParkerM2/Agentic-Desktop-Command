import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Heading,
  Stack,
} from '@ui';

import { useIncomingPin } from '../api/usePeerEvents';
import { truncate } from '../lib/truncate';

/**
 * Receiver-side modal showing the PIN issued to a remote initiator.
 * Mounted once at the app shell — driven entirely by useIncomingPin.
 */
export function IncomingPinDialog() {
  const { pin, dismiss } = useIncomingPin();
  if (pin === null) return null;
  const initiatorLabel =
    pin.initiatorDisplayName ?? truncate(pin.initiatorPeerId);
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
          <Heading as="h1">{pin.pin}</Heading>
        </Stack>
        <DialogFooter>
          <Button onClick={dismiss}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
