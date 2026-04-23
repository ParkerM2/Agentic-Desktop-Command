import { ulid } from 'ulid';

import type Database from 'better-sqlite3';


export type PairingEventType =
  | 'pair.init'
  | 'pair.confirm'
  | 'pair.reject'
  | 'key.revoke'
  | 'key.use';

export type PairingOutcome =
  | 'success'
  | 'rate_limited'
  | 'identity_conflict'
  | 'bad_signature'
  | 'expired_nonce'
  | 'revoked'
  | 'unknown_key'
  | 'internal_error';

export interface RecordInput {
  event_type: PairingEventType;
  client_id?: string | null;
  display_name?: string | null;
  source_ip?: string | null;
  user_agent?: string | null;
  pubkey_fp?: string | null;
  outcome: PairingOutcome;
  reason?: string | null;
}

export interface ListFilter {
  from?: number;
  to?: number;
  clientId?: string;
  eventType?: PairingEventType;
  limit?: number;
  offset?: number;
}

export interface PairingEventRow {
  id: string;
  ts: number;
  event_type: string;
  client_id: string | null;
  display_name: string | null;
  source_ip: string | null;
  user_agent: string | null;
  pubkey_fp: string | null;
  outcome: string;
  reason: string | null;
}

export interface AuditRepo {
  record: (input: RecordInput) => void;
  list: (filter: ListFilter) => PairingEventRow[];
  purgeOlderThan: (ageMs: number) => number;
}

export function createAuditRepo(db: Database.Database): AuditRepo {
  const insert = db.prepare(
    `INSERT INTO pairing_events
       (id, ts, event_type, client_id, display_name, source_ip, user_agent, pubkey_fp, outcome, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  return {
    record(input) {
      insert.run(
        ulid(),
        Date.now(),
        input.event_type,
        input.client_id ?? null,
        input.display_name ?? null,
        input.source_ip ?? null,
        input.user_agent ?? null,
        input.pubkey_fp ?? null,
        input.outcome,
        input.reason ?? null,
      );
    },
    list(filter) {
      const clauses: string[] = [];
      const params: unknown[] = [];
      if (filter.from !== undefined) {
        clauses.push('ts >= ?');
        params.push(filter.from);
      }
      if (filter.to !== undefined) {
        clauses.push('ts <= ?');
        params.push(filter.to);
      }
      if (filter.clientId !== undefined) {
        clauses.push('client_id = ?');
        params.push(filter.clientId);
      }
      if (filter.eventType !== undefined) {
        clauses.push('event_type = ?');
        params.push(filter.eventType);
      }
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const limit = Math.min(filter.limit ?? 100, 1000);
      const offset = filter.offset ?? 0;
      params.push(limit, offset);
      return db
        .prepare(`SELECT * FROM pairing_events ${where} ORDER BY ts DESC LIMIT ? OFFSET ?`)
        .all(...params) as PairingEventRow[];
    },
    purgeOlderThan(ageMs) {
      const cutoff = Date.now() - ageMs;
      const info = db.prepare('DELETE FROM pairing_events WHERE ts < ?').run(cutoff);
      return info.changes;
    },
  };
}
