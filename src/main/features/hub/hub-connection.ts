/**
 * Hub Connection Manager
 *
 * Orchestrates hub connection lifecycle around the v2 hubs[] config:
 *  - Config persistence (via hub-config-store's loadConfigV2/saveConfigV2)
 *  - WebSocket real-time updates (via hub-ws-client)
 *  - Event mapping (via hub-event-mapper)
 *  - Multi-hub management (add / remove / rename / setActive)
 *  - `beforeActiveHubChange` lifecycle bus so services holding per-hub
 *    resources (DB handles, etc.) can close gracefully before the active
 *    hub swaps.
 *
 * The existing single-active API (`getConnection`, `getStatus`, `connect`,
 * `disconnect`, `configure`, `setEnabled`, `getClient`, `isAvailable`,
 * `removeConfig`, `onWebSocketMessage`, `dispose`) now operates on the
 * active hub's PersistedHubRecord so existing callers keep compiling.
 */

import { HUB_EVENTS } from '@shared/ipc/hub/channels';
import { generateId } from '@shared/lib/id';
import type { HubConnection, HubConnectionStatus } from '@shared/types';

import { hubLogger } from '@main/lib/logger';

import { createHubClient } from './hub-client';
import {
  createHubConfigStore,
  decryptApiKey,
  encryptApiKey,
} from './hub-config-store';
import { createHubWsClient } from './hub-ws-client';
import { createEventBus } from './lifecycle';

import type { HubClient } from './hub-client';
import type {
  HubConfigV2,
  PersistedHubRecord,
} from './hub-config-store';
import type { EventBus, Handler } from './lifecycle';
import type { AdcDatabase } from '../../db';
import type { IpcRouter } from '../../ipc/router';

export type { HubConnectionStatus } from '@shared/types';

/** Payload emitted before the active hub changes. */
export interface ActiveHubChangePayload {
  from: string | null;
  to: string | null;
}

export interface AddHubOptions {
  /** If true, `setActive(record.hubId)` is called after persisting. */
  makeActive?: boolean;
}

export interface HubConnectionManager {
  // ── Lifecycle ─────────────────────────────────────────────────────
  /** Called by service-registry. Loads v2 config and is ready to accept
   *  connect() calls. Safe to call multiple times. */
  init: () => void;

  // ── Multi-hub management ──────────────────────────────────────────
  /** All persisted hubs (immutable snapshot). */
  listHubs: () => PersistedHubRecord[];
  getActiveHubId: () => string | null;
  getActiveHub: () => PersistedHubRecord | null;
  /** Append a hub record. When `makeActive` is true, the new hub becomes
   *  active (emits beforeActiveHubChange + reconnects). */
  addHub: (record: PersistedHubRecord, options?: AddHubOptions) => Promise<void>;
  /** Remove a hub. If it was active, falls back to the first remaining
   *  hub or null. */
  removeHub: (hubId: string) => Promise<void>;
  /** Swap the active hub. No-op when `hubId` equals the current active. */
  setActive: (hubId: string) => Promise<void>;
  renameHub: (hubId: string, displayName: string) => Promise<void>;

  // ── Single-active (legacy) API — operates on the active hub ───────
  getConnection: () => HubConnection | null;
  /** Legacy wrapper: stores url+key under a synthetic hub and activates
   *  it. New callers should use addHub + setActive. */
  configure: (hubUrl: string, apiKey: string) => HubConnection;
  setEnabled: (enabled: boolean) => HubConnection | null;
  connect: () => Promise<{ success: boolean; error?: string }>;
  disconnect: () => void;
  getStatus: () => HubConnectionStatus;
  getClient: () => HubClient;
  isAvailable: () => boolean;
  removeConfig: () => void;
  onWebSocketMessage: (callback: (data: unknown) => void) => void;
  dispose: () => void;

  // ── Events ────────────────────────────────────────────────────────
  /** Subscribe to active-hub-change. Handler runs BEFORE the swap
   *  completes so it can close DB handles, etc. Returns unsubscribe. */
  onBeforeActiveHubChange: (
    handler: Handler<ActiveHubChangePayload>,
  ) => () => void;
}

export interface HubConnectionManagerDeps {
  router: IpcRouter;
  db: AdcDatabase;
  dataDir: string;
}

const LEGACY_HUB_ID = 'legacy';
const CURRENT_CONFIG_VERSION = 2 as const;

function deriveDisplayName(hubUrl: string): string {
  try {
    const { host } = new URL(hubUrl);
    return host ? `Hub (${host})` : 'Hub';
  } catch {
    return 'Hub';
  }
}

function recordToConnection(
  record: PersistedHubRecord,
  status: HubConnectionStatus,
): HubConnection {
  return {
    hubUrl: record.lastKnownUrl ?? '',
    apiKey: decryptApiKey(record.encryptedApiKey),
    enabled: true,
    lastConnected: record.lastConnectedAt ?? undefined,
    status,
  };
}

export function createHubConnectionManager(
  deps: HubConnectionManagerDeps,
): HubConnectionManager {
  const { router, db, dataDir } = deps;
  const configStore = createHubConfigStore(db, dataDir);

  let config: HubConfigV2 = configStore.loadConfigV2();
  let status: HubConnectionStatus = 'disconnected';
  const messageListeners: Array<(data: unknown) => void> = [];
  const beforeActiveHubChange: EventBus<ActiveHubChangePayload> =
    createEventBus<ActiveHubChangePayload>();

  // ── Helpers ────────────────────────────────────────────────────────

  function getActiveRecord(): PersistedHubRecord | null {
    if (!config.activeHubId) return null;
    return config.hubs.find((h) => h.hubId === config.activeHubId) ?? null;
  }

  function persist(next: HubConfigV2): void {
    config = next;
    configStore.saveConfigV2(next);
  }

  function getConnectionForClient(): HubConnection | null {
    const active = getActiveRecord();
    if (!active) return null;
    return recordToConnection(active, status);
  }

  function setStatus(newStatus: HubConnectionStatus): void {
    if (status === newStatus) return;
    status = newStatus;
    router.emit(HUB_EVENTS.CONNECTION.CHANGED, { status: newStatus });
    hubLogger.info(`[Hub] Connection status: ${newStatus}`);
  }

  // ── HTTP + WebSocket clients ──────────────────────────────────────

  const client = createHubClient(getConnectionForClient);

  const ws = createHubWsClient({
    router,
    getConnection: () => {
      const active = getActiveRecord();
      if (!active) {
        throw new Error('[Hub] getConnection called without active hub');
      }
      return recordToConnection(active, status);
    },
    isEnabledAndConnected: () =>
      getActiveRecord() !== null && status === 'connected',
    messageListeners,
    scheduleConnect: () => {
      if (getActiveRecord()) {
        hubLogger.info('[Hub] Attempting reconnect...');
        void performConnect();
      }
    },
  });

  async function performConnect(): Promise<{ success: boolean; error?: string }> {
    const active = getActiveRecord();
    if (!active) {
      return { success: false, error: 'Hub not configured' };
    }

    setStatus('connecting');

    const healthResult = await client.healthCheck();
    if (!healthResult.success) {
      setStatus('error');
      ws.cancelReconnect();
      return { success: false, error: healthResult.error ?? 'Health check failed' };
    }

    const now = new Date().toISOString();
    const updatedHubs = config.hubs.map((h) =>
      h.hubId === active.hubId ? { ...h, lastConnectedAt: now } : h,
    );
    persist({ ...config, hubs: updatedHubs });
    setStatus('connected');

    ws.connect();
    return { success: true };
  }

  function disconnectInternal(): void {
    ws.cancelReconnect();
    ws.disconnect();
    setStatus('disconnected');
  }

  async function setActiveInternal(target: string | null): Promise<void> {
    if (target === config.activeHubId) {
      return;
    }

    const previous = config.activeHubId;
    await beforeActiveHubChange.emit(
      { from: previous, to: target },
      {
        onHandlerError: (err) => {
          hubLogger.error('[Hub] beforeActiveHubChange handler failed:', err);
        },
      },
    );

    disconnectInternal();

    persist({ ...config, activeHubId: target });
    hubLogger.info(
      `[Hub] Active hub changed: ${previous ?? 'null'} → ${target ?? 'null'}`,
    );

    const newActive = getActiveRecord();
    if (newActive?.lastKnownUrl && newActive.encryptedApiKey) {
      void performConnect();
    }
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    init() {
      // loadConfigV2 already ran in the constructor; re-read in case
      // external code modified storage (tests, migrations).
      config = configStore.loadConfigV2();
    },

    listHubs() {
      // Defensive copy to avoid caller mutation of internal state.
      return config.hubs.map((h) => ({ ...h }));
    },

    getActiveHubId() {
      return config.activeHubId;
    },

    getActiveHub() {
      const active = getActiveRecord();
      return active ? { ...active } : null;
    },

    async addHub(record, options) {
      const exists = config.hubs.some((h) => h.hubId === record.hubId);
      const nextHubs = exists
        ? config.hubs.map((h) => (h.hubId === record.hubId ? record : h))
        : [...config.hubs, record];

      persist({ ...config, hubs: nextHubs });
      hubLogger.info(
        `[Hub] ${exists ? 'Updated' : 'Added'} hub ${record.hubId} (${record.displayName})`,
      );

      if (options?.makeActive) {
        await setActiveInternal(record.hubId);
      }
    },

    async removeHub(hubId) {
      const existed = config.hubs.some((h) => h.hubId === hubId);
      if (!existed) return;

      const isActive = config.activeHubId === hubId;

      if (isActive) {
        // Pick a replacement (first remaining hub, or null) and swap to
        // it so beforeActiveHubChange fires and DB handles close.
        const replacement = config.hubs.find((h) => h.hubId !== hubId);
        await setActiveInternal(replacement?.hubId ?? null);
      }

      const nextHubs = config.hubs.filter((h) => h.hubId !== hubId);
      persist({ ...config, hubs: nextHubs });
      hubLogger.info(`[Hub] Removed hub ${hubId}`);
    },

    async setActive(hubId) {
      await setActiveInternal(hubId);
    },

    renameHub(hubId, displayName) {
      const existing = config.hubs.find((h) => h.hubId === hubId);
      if (!existing) return Promise.resolve();
      const nextHubs = config.hubs.map((h) =>
        h.hubId === hubId ? { ...h, displayName } : h,
      );
      persist({ ...config, hubs: nextHubs });
      hubLogger.info(`[Hub] Renamed ${hubId} → ${displayName}`);
      return Promise.resolve();
    },

    getConnection() {
      return getConnectionForClient();
    },

    configure(hubUrl, apiKey) {
      const trimmedUrl = hubUrl.replace(/\/+$/, '');
      const encrypted = encryptApiKey(apiKey);
      const now = new Date().toISOString();

      // Reuse the active hub's slot when possible (matches legacy
      // single-hub behaviour), else fall back to the legacy synthetic
      // id, else mint a new one.
      const legacyRecord = config.hubs.find((h) => h.hubId === LEGACY_HUB_ID);
      const existingId = config.activeHubId ?? legacyRecord?.hubId ?? null;
      const targetId = existingId ?? generateId();

      const existing = config.hubs.find((h) => h.hubId === targetId);
      const record: PersistedHubRecord = existing
        ? {
            ...existing,
            lastKnownUrl: trimmedUrl,
            encryptedApiKey: encrypted,
          }
        : {
            hubId: targetId,
            displayName: deriveDisplayName(trimmedUrl),
            lastKnownUrl: trimmedUrl,
            encryptedApiKey: encrypted,
            pinnedFingerprint: null,
            dbPath: `hubs/${targetId}/adc.db`,
            clientIdentityRef: null,
            addedAt: now,
            lastConnectedAt: null,
          };

      const nextHubs = existing
        ? config.hubs.map((h) => (h.hubId === targetId ? record : h))
        : [...config.hubs, record];

      persist({
        version: CURRENT_CONFIG_VERSION,
        hubs: nextHubs,
        activeHubId: targetId,
      });

      hubLogger.info(`[Hub] Configured hub: ${trimmedUrl}`);
      return recordToConnection(record, status);
    },

    setEnabled(enabled) {
      // In the v2 model, "enabled" is implicit in having an active hub.
      // We keep the method for backward compatibility: disable = disconnect
      // and clear activeHubId; re-enable is a no-op (needs configure).
      const active = getActiveRecord();
      if (!active) return null;

      if (!enabled) {
        disconnectInternal();
        persist({ ...config, activeHubId: null });
        return null;
      }

      return recordToConnection(active, status);
    },

    connect() {
      return performConnect();
    },

    disconnect() {
      disconnectInternal();
    },

    getStatus() {
      return status;
    },

    getClient() {
      return client;
    },

    isAvailable() {
      return getActiveRecord() !== null && status === 'connected';
    },

    removeConfig() {
      disconnectInternal();
      persist({ version: CURRENT_CONFIG_VERSION, hubs: [], activeHubId: null });
      hubLogger.info('[Hub] Configuration removed');
    },

    onWebSocketMessage(callback) {
      messageListeners.push(callback);
    },

    dispose() {
      ws.cancelReconnect();
      ws.disconnect();
    },

    onBeforeActiveHubChange(handler) {
      return beforeActiveHubChange.on(handler);
    },
  };
}
