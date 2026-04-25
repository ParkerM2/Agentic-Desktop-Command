import { useState } from 'react';

import type { DiscoveredPeer, PairedPeer, SelfIdentity } from '@shared/ipc/peers';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Code,
  EmptyState,
  Flex,
  Spinner,
  Stack,
  Text,
} from '@ui';

import {
  useDiscoveredPeers,
  usePairedPeers,
  useRevokePeer,
  useSelfIdentity,
} from '../api/usePeers';
import { truncate } from '../lib/truncate';

import { OutgoingPairDialog } from './OutgoingPairDialog';

// ─── Helpers ─────────────────────────────────────────────

function renderSelfBody(isPending: boolean, data: SelfIdentity | undefined) {
  if (isPending) return <Spinner />;
  if (data === undefined) return <Text variant="muted">Identity unavailable.</Text>;
  return (
    <Stack gap="sm">
      <Flex align="center" gap="sm">
        <Text size="sm" variant="muted">
          Peer ID
        </Text>
        <Code>{truncate(data.peerId)}</Code>
      </Flex>
      <Flex align="center" gap="sm">
        <Text size="sm" variant="muted">
          Fingerprint
        </Text>
        <Code>{truncate(data.fingerprint)}</Code>
      </Flex>
    </Stack>
  );
}

interface PairedRowProps {
  peer: PairedPeer;
  onRevoke: (peerId: string) => void;
  revokePending: boolean;
}

function PairedRow({ peer, onRevoke, revokePending }: PairedRowProps) {
  const isRevoked = peer.revokedAt !== null;
  const label = peer.displayName ?? truncate(peer.peerId);
  return (
    <Flex align="center" gap="md" justify="between">
      <Stack gap="none">
        <Text>{label}</Text>
        <Code>{truncate(peer.peerId)}</Code>
      </Stack>
      <Flex align="center" gap="sm">
        <Badge variant={isRevoked ? 'destructive' : 'success'}>
          {isRevoked ? 'Revoked' : 'Trusted'}
        </Badge>
        {isRevoked ? null : (
          <Button
            disabled={revokePending}
            size="sm"
            variant="destructive"
            onClick={() => onRevoke(peer.peerId)}
          >
            Revoke
          </Button>
        )}
      </Flex>
    </Flex>
  );
}

function renderPairedBody(
  isPending: boolean,
  data: readonly PairedPeer[] | undefined,
  onRevoke: (peerId: string) => void,
  revokePending: boolean,
) {
  if (isPending) return <Spinner />;
  if (data === undefined || data.length === 0) {
    return (
      <EmptyState
        description="Pair with a nearby device to enable sync."
        title="No paired peers"
      />
    );
  }
  return (
    <Stack gap="sm">
      {data.map((peer) => (
        <PairedRow
          key={peer.peerId}
          peer={peer}
          revokePending={revokePending}
          onRevoke={onRevoke}
        />
      ))}
    </Stack>
  );
}

interface DiscoveredRowProps {
  peer: DiscoveredPeer;
  onInvite: (peer: DiscoveredPeer) => void;
}

function DiscoveredRow({ peer, onInvite }: DiscoveredRowProps) {
  const label = peer.displayName ?? truncate(peer.peerId);
  return (
    <Flex align="center" gap="md" justify="between">
      <Stack gap="none">
        <Text>{label}</Text>
        <Code>
          {peer.host}:{peer.port}
        </Code>
      </Stack>
      <Flex align="center" gap="sm">
        {peer.isPaired ? (
          <Badge variant="success">Paired</Badge>
        ) : (
          <Button size="sm" onClick={() => onInvite(peer)}>
            Invite
          </Button>
        )}
      </Flex>
    </Flex>
  );
}

function renderDiscoveredBody(
  isPending: boolean,
  data: readonly DiscoveredPeer[] | undefined,
  onInvite: (peer: DiscoveredPeer) => void,
) {
  if (isPending) return <Spinner />;
  if (data === undefined || data.length === 0) {
    return (
      <EmptyState
        description="Other ADC devices on this network will appear here."
        title="No devices found"
      />
    );
  }
  return (
    <Stack gap="sm">
      {data.map((peer) => (
        <DiscoveredRow key={peer.peerId} peer={peer} onInvite={onInvite} />
      ))}
    </Stack>
  );
}

// ─── Component ───────────────────────────────────────────

/**
 * Settings panel listing this device, paired peers, and nearby (mDNS) peers.
 *
 * Auto-updates via the global EventBridge subscriptions for
 * DISCOVERY.CHANGED (cache write) and TRUST.CHANGED (invalidate) — this
 * panel only consumes the queries.
 */
export function PeerListPanel() {
  const self = useSelfIdentity();
  const paired = usePairedPeers();
  const discovered = useDiscoveredPeers();
  const revoke = useRevokePeer();

  const [inviteTarget, setInviteTarget] = useState<DiscoveredPeer | null>(null);

  return (
    <>
      <Stack gap="lg">
        <Card>
          <CardHeader>
            <CardTitle>This device</CardTitle>
          </CardHeader>
          <CardContent>{renderSelfBody(self.isPending, self.data)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paired peers</CardTitle>
          </CardHeader>
          <CardContent>
            {renderPairedBody(
              paired.isPending,
              paired.data,
              (peerId) => revoke.mutate(peerId),
              revoke.isPending,
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nearby (mDNS)</CardTitle>
          </CardHeader>
          <CardContent>
            {renderDiscoveredBody(discovered.isPending, discovered.data, setInviteTarget)}
          </CardContent>
        </Card>
      </Stack>

      {inviteTarget !== null && (
        <OutgoingPairDialog target={inviteTarget} onClose={() => setInviteTarget(null)} />
      )}
    </>
  );
}
