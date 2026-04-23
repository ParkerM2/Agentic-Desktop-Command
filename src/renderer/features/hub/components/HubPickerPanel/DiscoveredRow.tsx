/**
 * DiscoveredRow — one row in the "Discovered on your network" section.
 *
 * Shows the hub's displayName + version, plus a "Pair & Switch" button
 * that fires the pair mutation for that hub.
 */

import { Button, Flex, StatusIndicator, Text } from '@ui';

import type { DiscoveredHub } from './derive';

interface DiscoveredRowProps {
  hub: DiscoveredHub;
  isPairPending: boolean;
  onPair: () => void;
}

export function DiscoveredRow({ hub, isPairPending, onPair }: DiscoveredRowProps) {
  const rowId = `hub-discovered-${hub.hubId}`;
  return (
    <Flex
      className="items-center gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
      data-testid={rowId}
    >
      <StatusIndicator size="sm" variant="neutral" />

      <div className="min-w-0 flex-1">
        <Flex className="items-center gap-2">
          <Text className="truncate font-medium">{hub.displayName}</Text>
          {hub.version === '' ? null : (
            <Text size="sm" variant="muted">
              (v{hub.version})
            </Text>
          )}
        </Flex>
      </div>

      <Button
        disabled={isPairPending}
        size="sm"
        type="button"
        variant="secondary"
        onClick={onPair}
      >
        {isPairPending ? 'Pairing…' : 'Pair & Switch'}
      </Button>
    </Flex>
  );
}
