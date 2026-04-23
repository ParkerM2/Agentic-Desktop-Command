/**
 * Hub IPC handlers
 *
 * Hub task channels (`hub.tasks.*`) are registered in `task-handlers.ts`.
 *
 * Connection/status channels (HUB.CONNECT.SERVER, HUB.DISCONNECT.SERVER,
 * HUB.GET.STATUS, etc.) operate on the ACTIVE hub via the multi-hub
 * HubConnectionManager (Task 23). The 5 new discovery/pair channels
 * registered below are:
 *   - HUB.DISCOVERED.LIST   — paired + discovered snapshot
 *   - HUB.PAIR.REQUEST      — pair with a discovered hub
 *   - HUB.SWITCH.ACTIVE     — swap active hub
 *   - HUB.REMOVE.RECORD     — delete a paired hub locally
 *   - HUB.MANUAL.PAIR       — TOFU pair by URL (manual entry)
 */

import { createHash } from 'node:crypto';
import { connect as tlsConnect } from 'node:tls';

import { HUB, HUB_EVENTS } from '@shared/ipc/hub/channels';
import type {
  discoveredHubSchema,
  hubDiscoveredListOutputSchema,
  hubRecordSchema,
} from '@shared/ipc/hub/contract';

import { hubLogger } from '../../lib/logger';

import { encryptApiKey } from './hub-config-store';
import { PairError, pairWithDiscoveredHub } from './hub-pair';

import type { HubApiClient } from "./hub-api-client";
import type { PersistedHubRecord } from './hub-config-store';
import type { HubConnectionManager } from "./hub-connection";
import type { DiscoveredHub, HubDiscovery } from './hub-discovery';
import type { HubSyncService } from "./hub-sync";
import type { IpcRouter } from '../../ipc/router';
import type { z } from 'zod';

type HubRecordWire = z.infer<typeof hubRecordSchema>;
type DiscoveredHubWire = z.infer<typeof discoveredHubSchema>;
type DiscoveredListWire = z.infer<typeof hubDiscoveredListOutputSchema>;

/**
 * Map a PersistedHubRecord (main-only shape incl. encrypted key) to the
 * wire `hubRecordSchema` shape shared with the renderer.
 */
function toWireRecord(
  rec: PersistedHubRecord,
  activeHubId: string | null,
  connectionStatus: HubRecordWire['status'],
): HubRecordWire {
  const isActive = activeHubId !== null && activeHubId === rec.hubId;
  return {
    hubId: rec.hubId,
    displayName: rec.displayName,
    lastKnownUrl: rec.lastKnownUrl,
    pinnedFingerprint: rec.pinnedFingerprint,
    addedAt: rec.addedAt,
    lastConnectedAt: rec.lastConnectedAt,
    // Only the active hub reflects the live connection status; inactive
    // records are always reported as 'disconnected'.
    status: isActive ? connectionStatus : 'disconnected',
  };
}

function buildDiscoveredSnapshot(
  connectionManager: HubConnectionManager,
  hubDiscovery: HubDiscovery,
): DiscoveredListWire {
  const activeHubId = connectionManager.getActiveHubId();
  const status = connectionManager.getStatus();
  const paired = connectionManager
    .listHubs()
    .map((r) => toWireRecord(r, activeHubId, status));
  const discovered: DiscoveredHubWire[] = hubDiscovery.getSnapshot().map((d) => ({
    hubId: d.hubId,
    displayName: d.displayName,
    version: d.version,
    channel: d.channel,
    addresses: d.addresses,
    port: d.port,
    fingerprint: d.fingerprint,
    lastSeenAt: d.lastSeenAt,
    stale: d.stale,
  }));
  return { paired, discovered, activeHubId };
}

/** Format a caught error as a user-facing string. */
function formatPairError(err: unknown): string {
  if (err instanceof PairError) return `${err.code}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return 'Pair failed';
}

/**
 * Fetch the peer cert SHA-256 DER fingerprint for a hub URL without any
 * pin enforcement. Used by HUB.MANUAL.PAIR as a trust-on-first-use (TOFU)
 * escape hatch — once the first pair succeeds the fingerprint is stored
 * on the PersistedHubRecord and all subsequent connections enforce it.
 */
function fetchPeerFingerprint(host: string, port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = tlsConnect({
      host,
      port,
      rejectUnauthorized: false,
      servername: host,
    });
    let settled = false;
    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      fn();
    };
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate(true);
      const der = cert.raw as Buffer | undefined;
      socket.destroy();
      if (!Buffer.isBuffer(der) || der.length === 0) {
        settle(() => reject(new Error('Peer certificate missing DER bytes')));
        return;
      }
      const fp = createHash('sha256').update(der).digest('hex');
      settle(() => resolve(fp));
    });
    socket.once('error', (err: Error) => {
      settle(() => reject(err));
    });
  });
}

export function registerHubHandlers(
  router: IpcRouter,
  connectionManager: HubConnectionManager,
  syncService: HubSyncService,
  _hubApiClient: HubApiClient,
  hubDiscovery: HubDiscovery,
  hubsDir: string,
): void {
  const mgr = connectionManager;
  const sync = syncService;
  const discovery = hubDiscovery;
  const hubsDirPath = hubsDir;

  router.handle(HUB.CONNECT.SERVER, async ({ url, apiKey }) => {
    mgr.configure(url, apiKey);
    const result = await mgr.connect();
    return { success: result.success, error: result.error };
  });

  router.handle(HUB.DISCONNECT.SERVER, () => {
    mgr.disconnect();
    return Promise.resolve({ success: true });
  });

  router.handle(HUB.GET.STATUS, () => {
    const connection = mgr.getConnection();
    return Promise.resolve({
      status: mgr.getStatus(),
      hubUrl: connection?.hubUrl,
      enabled: connection?.enabled ?? false,
      lastConnected: connection?.lastConnected,
      pendingMutations: sync.getPendingCount(),
    });
  });

  router.handle(HUB.SYNC.DATA, async () => {
    const syncedCount = await sync.syncPending();
    if (syncedCount > 0) {
      router.emit(HUB_EVENTS.SYNC.COMPLETED, { entities: [], syncedCount });
    }
    return { syncedCount, pendingCount: sync.getPendingCount() };
  });

  router.handle(HUB.GET.CONFIG, () => {
    const connection = mgr.getConnection();
    return Promise.resolve({
      hubUrl: connection?.hubUrl,
      enabled: connection?.enabled ?? false,
      lastConnected: connection?.lastConnected,
    });
  });

  router.handle(HUB.REMOVE.CONFIG, () => {
    mgr.removeConfig();
    return Promise.resolve({ success: true });
  });

  router.handle(HUB.GENERATE.KEY, async ({ url, bootstrapSecret }) => {
    try {
      const normalized = url.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (bootstrapSecret.length > 0) {
        headers['X-Bootstrap-Secret'] = bootstrapSecret;
      }
      const res = await fetch(`${normalized}/api/auth/generate-key`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        let hint = 'Check the Hub URL and try again.';
        if (res.status === 401) {
          hint = bootstrapSecret.length === 0
            ? 'This Hub requires a bootstrap secret. Check HUB_BOOTSTRAP_SECRET in the Hub\'s environment and enter it below.'
            : 'Bootstrap secret is incorrect.';
        } else if (res.status === 403) {
          hint =
            'Hub already has keys. Ask the admin to set HUB_BOOTSTRAP_SECRET on the Hub container so the UI can mint a replacement key.';
        }
        return {
          success: false,
          error: body.error ?? `Hub rejected the request (HTTP ${String(res.status)}). ${hint}`,
        };
      }

      const body = (await res.json()) as { key?: string };
      if (!body.key) {
        return { success: false, error: 'Hub response missing key field.' };
      }

      return { success: true, key: body.key };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reach Hub.',
      };
    }
  });

  // ─── New: discovery + pair channels (Task 25) ────────────────────

  router.handle(HUB.DISCOVERED.LIST, () => Promise.resolve(buildDiscoveredSnapshot(mgr, discovery)));

  router.handle(HUB.PAIR.REQUEST, async ({ hubId, displayName }) => {
    const hit = discovery.getSnapshot().find((d) => d.hubId === hubId);
    if (!hit) {
      return { ok: false, error: 'Hub not found' };
    }

    try {
      const pairInput: Parameters<typeof pairWithDiscoveredHub>[0] = {
        hubId: hit.hubId,
        addresses: hit.addresses,
        port: hit.port,
        fingerprint: hit.fingerprint,
      };
      if (displayName !== undefined) pairInput.displayName = displayName;

      const result = await pairWithDiscoveredHub(pairInput, { hubsDir: hubsDirPath });

      const now = new Date().toISOString();
      const record: PersistedHubRecord = {
        hubId: result.hubId,
        displayName: displayName ?? result.displayName,
        lastKnownUrl: result.lastKnownUrl,
        encryptedApiKey: encryptApiKey(result.key),
        pinnedFingerprint: result.pinnedFingerprint,
        dbPath: `hubs/${result.hubId}/adc.db`,
        clientIdentityRef: `hubs/${result.hubId}/client-identity.pub`,
        addedAt: now,
        lastConnectedAt: now,
      };
      await mgr.addHub(record, { makeActive: true });
      hubLogger.info(`[Hub] Paired with ${result.hubId} (${record.displayName})`);
      return { ok: true as const, hubId: result.hubId };
    } catch (err) {
      const message = formatPairError(err);
      hubLogger.warn(`[Hub] Pair failed for ${hubId}: ${message}`);
      return { ok: false as const, error: message };
    }
  });

  router.handle(HUB.SWITCH.ACTIVE, async ({ hubId }) => {
    try {
      await mgr.setActive(hubId);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Switch failed';
      hubLogger.warn(`[Hub] setActive failed for ${hubId}: ${message}`);
      // Router-level handler contract returns { success: boolean }; surface
      // failures through the shared SuccessResponseSchema.
      return { success: false };
    }
  });

  router.handle(HUB.REMOVE.RECORD, async ({ hubId }) => {
    // Best-effort: we don't call /api/admin/clients/:id/revoke here —
    // we don't have the admin key on the client, and the hub will expire
    // the key on its own TTL. Local removal is sufficient.
    await mgr.removeHub(hubId);
    hubLogger.info(`[Hub] Removed hub record ${hubId}`);
    return { success: true };
  });

  router.handle(HUB.MANUAL.PAIR, async ({ url, displayName }) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, error: 'Invalid URL' };
    }
    if (parsed.protocol !== 'https:') {
      return { ok: false, error: 'Hub URL must use https://' };
    }
    const host = parsed.hostname;
    const port = Number(parsed.port || 443);
    if (host === '' || Number.isNaN(port)) {
      return { ok: false, error: 'Invalid hub URL' };
    }

    let fingerprint: string;
    try {
      fingerprint = await fetchPeerFingerprint(host, port);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TLS probe failed';
      return { ok: false, error: `Could not reach hub: ${message}` };
    }

    const synthetic: DiscoveredHub = {
      // Placeholder hubId; the real one is returned in the pair confirm
      // response and is what we persist on the PersistedHubRecord.
      hubId: `manual-${Date.now().toString(36)}`,
      displayName: displayName ?? host,
      version: '',
      channel: '',
      addresses: [host],
      port,
      fingerprint,
      lastSeenAt: new Date().toISOString(),
      stale: false,
    };

    try {
      const pairInput: Parameters<typeof pairWithDiscoveredHub>[0] = {
        hubId: synthetic.hubId,
        addresses: synthetic.addresses,
        port: synthetic.port,
        fingerprint: synthetic.fingerprint,
      };
      if (displayName !== undefined) pairInput.displayName = displayName;

      const result = await pairWithDiscoveredHub(pairInput, { hubsDir: hubsDirPath });
      const now = new Date().toISOString();
      const record: PersistedHubRecord = {
        hubId: result.hubId,
        displayName: displayName ?? result.displayName,
        lastKnownUrl: result.lastKnownUrl,
        encryptedApiKey: encryptApiKey(result.key),
        pinnedFingerprint: result.pinnedFingerprint,
        dbPath: `hubs/${result.hubId}/adc.db`,
        clientIdentityRef: `hubs/${result.hubId}/client-identity.pub`,
        addedAt: now,
        lastConnectedAt: now,
      };
      await mgr.addHub(record, { makeActive: true });
      hubLogger.info(`[Hub] Manual pair succeeded with ${result.hubId}`);
      return { ok: true as const, hubId: result.hubId };
    } catch (err) {
      const message = formatPairError(err);
      hubLogger.warn(`[Hub] Manual pair failed: ${message}`);
      return { ok: false as const, error: message };
    }
  });
}
