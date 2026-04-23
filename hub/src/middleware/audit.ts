import type { AuditRepo, PairingEventType, PairingOutcome } from '../lib/audit-repo.js';
import type { FastifyRequest } from 'fastify';

export interface AuditExtra {
  clientId?: string | null;
  displayName?: string | null;
  pubkeyFp?: string | null;
  reason?: string | null;
}

export function createAuditMiddleware(audit: AuditRepo) {
  return function auditEvent(
    req: FastifyRequest,
    eventType: PairingEventType,
    outcome: PairingOutcome,
    extra: AuditExtra,
  ): void {
    audit.record({
      event_type: eventType,
      outcome,
      client_id: extra.clientId ?? null,
      display_name: extra.displayName ?? null,
      pubkey_fp: extra.pubkeyFp ?? null,
      source_ip: req.ip,
      user_agent: req.headers['user-agent'] ?? null,
      reason: extra.reason ?? null,
    });
  };
}
