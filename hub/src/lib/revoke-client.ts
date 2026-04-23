import type { AuditRepo } from './audit-repo.js';
import type { RevocationBus } from './revocation-bus.js';
import type Database from 'better-sqlite3';

export interface RevokeDeps {
  db: Database.Database;
  bus: RevocationBus;
  audit: AuditRepo;
}

export interface RevokeResult {
  /** Number of api_keys rows whose revoked_at transitioned from NULL to now. */
  updated: number;
}

/**
 * Revoke every live API key belonging to a client.
 *
 * Steps, in order:
 *   1. `UPDATE api_keys SET revoked_at=?, revoked_reason=? WHERE client_id=? AND revoked_at IS NULL`
 *   2. Record a `key.revoke` audit event.
 *   3. Fire the revocation bus so WS listeners can close live sockets with 4003.
 *
 * Audit + bus emission happen even if `updated === 0` so the caller has a
 * consistent signal. The only things that short-circuit are programmer errors
 * (bad DB, etc.) which bubble up as thrown errors.
 */
export function revokeClient(
  deps: RevokeDeps,
  clientId: string,
  reason: string,
): RevokeResult {
  const info = deps.db
    .prepare(
      'UPDATE api_keys SET revoked_at = ?, revoked_reason = ? WHERE client_id = ? AND revoked_at IS NULL',
    )
    .run(Date.now(), reason, clientId);

  deps.audit.record({
    event_type: 'key.revoke',
    outcome: 'success',
    client_id: clientId,
    reason,
  });

  deps.bus.revoke(clientId, reason);

  return { updated: info.changes };
}
