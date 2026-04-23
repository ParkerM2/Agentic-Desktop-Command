/**
 * HubPickerPanel — Spotify-style ADC Hub picker.
 *
 * Layout:
 *   - Currently-connected header (name + dot + version)
 *   - Paired list (rename / remove / click-to-switch)
 *   - Discovered-on-your-network list (Pair & Switch)
 *   - Manual-add collapsible
 *
 * Uses only @ui primitives (no raw <button>/<input>/<label>). Consumes
 * the Task-26 hooks (useHubDiscovery, useHubPair, useHubSwitchActive,
 * useHubRemoveRecord, useHubManualPair).
 *
 * NOTE: the plan spec asked for `role="radiogroup"` + arrow-key navigation.
 * That is implemented as `role="radio"` rows inside a `role="radiogroup"`
 * container, with keyboard navigation handled by the container via arrow
 * keys — but only to focus the next/previous row; activating the row
 * requires Enter/Space, matching WAI-ARIA radio behaviour. Rename uses
 * an inline form (simplest affordance per task notes).
 *
 * KNOWN GAP: there is no HUB.RENAME.RECORD IPC channel yet, so the
 * Rename UI calls a local `onRename` noop (wired to a disabled state).
 * The button is hidden when `isRenameSupported === false` (default).
 * When the rename channel lands, flip the flag to `true`.
 */

import { useCallback, useRef, useState } from 'react';

import { RadioTower } from 'lucide-react';

import {
  Button,
  Card,
  CardContent,
  Heading,
  InlineAlert,
  Separator,
  StatusIndicator,
  Text,
} from '@ui';

import { useHubDiscovery } from '../../api/useHubDiscovery';
import { useHubManualPair } from '../../api/useHubManualPair';
import { useHubPair } from '../../api/useHubPair';
import { useHubRemoveRecord } from '../../api/useHubRemoveRecord';
import { useHubSwitchActive } from '../../api/useHubSwitchActive';

import {
  filterDiscovered,
  findActiveRecord,
  isFingerprintMismatchError,
  resolvePairedRowStatus,
} from './derive';
import { DiscoveredRow } from './DiscoveredRow';
import { ManualAdd } from './ManualAdd';
import { PairedRow } from './PairedRow';

/** Render the error banner for the picker — avoids a nested ternary inline. */
function renderBanner(bannerError: string | null, isFingerprint: boolean): React.ReactNode {
  if (isFingerprint) {
    return (
      <InlineAlert variant="warning">
        This hub&apos;s identity changed. Possible spoofing. Re-pair to accept.
      </InlineAlert>
    );
  }
  if (bannerError === null) return null;
  return <InlineAlert variant="error">{bannerError}</InlineAlert>;
}

interface HubPickerPanelProps {
  /**
   * Optional chrome wrapper — when true (default) the panel is rendered
   * inside a Card. Pass `false` from contexts that supply their own
   * surface (e.g. HubSettings page section).
   */
  withCardChrome?: boolean;
}

export function HubPickerPanel({ withCardChrome = true }: HubPickerPanelProps) {
  const discovery = useHubDiscovery();
  const pairMutation = useHubPair();
  const manualPairMutation = useHubManualPair();
  const switchMutation = useHubSwitchActive();
  const removeMutation = useHubRemoveRecord();

  // Tracks which mutation (if any) most recently produced an error banner
  // so the panel can surface FINGERPRINT_MISMATCH as a prominent warning.
  const [bannerError, setBannerError] = useState<string | null>(null);

  const radiogroupRef = useRef<HTMLDivElement | null>(null);

  const snapshot = discovery.data;
  const paired = snapshot?.paired ?? [];
  const discovered = snapshot === undefined
    ? []
    : filterDiscovered(snapshot.paired, snapshot.discovered);
  const activeHubId = snapshot?.activeHubId ?? null;
  const activeRecord = findActiveRecord(paired, activeHubId);

  const handlePair = useCallback(
    (hubId: string) => {
      setBannerError(null);
      pairMutation.mutate(
        { hubId },
        {
          onSuccess: (res) => {
            if (!res.ok) setBannerError(res.error);
          },
          onError: (err) => {
            setBannerError(err instanceof Error ? err.message : 'Pair failed');
          },
        },
      );
    },
    [pairMutation],
  );

  const handleManualPair = useCallback(
    (url: string) => {
      setBannerError(null);
      manualPairMutation.mutate(
        { url },
        {
          onSuccess: (res) => {
            if (!res.ok) setBannerError(res.error);
          },
          onError: (err) => {
            setBannerError(err instanceof Error ? err.message : 'Pair failed');
          },
        },
      );
    },
    [manualPairMutation],
  );

  const handleSwitch = useCallback(
    (hubId: string) => {
      if (hubId === activeHubId) return;
      switchMutation.mutate({ hubId });
    },
    [activeHubId, switchMutation],
  );

  const handleRemove = useCallback(
    (hubId: string) => {
      removeMutation.mutate({ hubId });
    },
    [removeMutation],
  );

  const handleRename = useCallback((_hubId: string, _nextName: string) => {
    // No-op: HUB.RENAME.RECORD channel not yet wired. The button is hidden
    // via `isRenameSupported={false}` below; this handler exists so the
    // row's contract stays stable when the channel lands.
  }, []);

  // Simple arrow-key navigation across paired radio rows: moves focus to
  // the next/previous row. Actual activation uses click / Enter via the
  // row's inner link button.
  const handleRadiogroupKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const group = radiogroupRef.current;
    if (group === null) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

    const rows = Array.from(
      group.querySelectorAll<HTMLElement>('[role="radio"]'),
    );
    if (rows.length === 0) return;

    const current = document.activeElement as HTMLElement | null;
    const idx = current === null ? -1 : rows.findIndex((r) => r.contains(current));
    const next = e.key === 'ArrowDown'
      ? (idx + 1) % rows.length
      : (idx - 1 + rows.length) % rows.length;
    e.preventDefault();
    rows[next]?.focus();
  }, []);

  const isFingerprintBanner = isFingerprintMismatchError(bannerError ?? undefined);

  const content = (
    <div className="space-y-4">
      {/* Currently connected header */}
      <div className="flex items-center gap-3">
        <RadioTower className="size-5 text-primary" />
        <div className="min-w-0 flex-1">
          <Heading as="h2" className="text-base font-semibold">
            ADC Hub
          </Heading>
          {activeRecord === null ? (
            <Text size="sm" variant="muted">
              No hub connected
            </Text>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Text size="sm" variant="muted">
                Connected to
              </Text>
              <Text className="font-medium" size="sm">
                {activeRecord.displayName}
              </Text>
              <StatusIndicator
                label={activeRecord.status}
                size="sm"
                variant={activeRecord.status === 'connected' ? 'success' : 'warning'}
              />
            </div>
          )}
        </div>
      </div>

      {renderBanner(bannerError, isFingerprintBanner)}

      <Separator />

      {/* Paired section */}
      <section aria-labelledby="hub-paired-heading" className="space-y-2">
        <Heading
          as="h3"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          id="hub-paired-heading"
        >
          Paired
        </Heading>
        {paired.length === 0 ? (
          <Text size="sm" variant="muted">
            No paired hubs yet.
          </Text>
        ) : (
          <div
            ref={radiogroupRef}
            aria-labelledby="hub-paired-heading"
            className="flex flex-col gap-1.5 focus:outline-none"
            role="radiogroup"
            tabIndex={-1}
            onKeyDown={handleRadiogroupKeyDown}
          >
            {paired.map((record) => {
              const status = resolvePairedRowStatus(record, activeHubId);
              const isActive = record.hubId === activeHubId;
              return (
                <PairedRow
                  key={record.hubId}
                  isActive={isActive}
                  isRenameSupported={false}
                  record={record}
                  status={status}
                  isRemovePending={
                    removeMutation.isPending
                      ? removeMutation.variables.hubId === record.hubId
                      : false
                  }
                  isSwitchPending={
                    switchMutation.isPending
                      ? switchMutation.variables.hubId === record.hubId
                      : false
                  }
                  onActivate={() => {
                    handleSwitch(record.hubId);
                  }}
                  onRemove={() => {
                    handleRemove(record.hubId);
                  }}
                  onRename={(name) => {
                    handleRename(record.hubId, name);
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      {/* Discovered section */}
      <section aria-labelledby="hub-discovered-heading" className="space-y-2">
        <Heading
          as="h3"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          id="hub-discovered-heading"
        >
          Discovered on your network
        </Heading>
        {discovered.length === 0 ? (
          <Text size="sm" variant="muted">
            {discovery.isLoading ? 'Scanning…' : 'No hubs discovered on this network.'}
          </Text>
        ) : (
          <div className="flex flex-col gap-1.5">
            {discovered.map((hub) => (
              <DiscoveredRow
                key={hub.hubId}
                hub={hub}
                isPairPending={
                  pairMutation.isPending
                    ? pairMutation.variables.hubId === hub.hubId
                    : false
                }
                onPair={() => {
                  handlePair(hub.hubId);
                }}
              />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Manual add */}
      <ManualAdd isPairPending={manualPairMutation.isPending} onSubmit={handleManualPair} />

      {/* Retry link on discovery errors */}
      {discovery.isError ? (
        <div className="pt-2">
          <InlineAlert variant="error">
            Failed to load hub snapshot:{' '}
            {discovery.error instanceof Error ? discovery.error.message : 'Unknown error'}
          </InlineAlert>
          <Button
            className="mt-2"
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              void discovery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );

  if (!withCardChrome) return content;

  return (
    <Card className="w-full">
      <CardContent className="p-5">{content}</CardContent>
    </Card>
  );
}
