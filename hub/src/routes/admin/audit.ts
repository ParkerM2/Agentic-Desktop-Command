import type { AuditRepo, ListFilter, PairingEventType } from '../../lib/audit-repo.js';
import type { FastifyPluginAsync } from 'fastify';

export interface AdminAuditDeps {
  audit: AuditRepo;
}

interface AuditQuery {
  from?: string;
  to?: string;
  clientId?: string;
  eventType?: string;
  limit?: string;
  offset?: string;
}

const querySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    from: { type: 'string' },
    to: { type: 'string' },
    clientId: { type: 'string', minLength: 1, maxLength: 64 },
    eventType: { type: 'string', minLength: 1, maxLength: 32 },
    limit: { type: 'string' },
    offset: { type: 'string' },
  },
} as const;

const KNOWN_EVENT_TYPES: readonly PairingEventType[] = [
  'pair.init',
  'pair.confirm',
  'pair.reject',
  'key.revoke',
  'key.use',
];

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Admin audit log endpoint.
 *
 * GET /audit?from=&to=&clientId=&eventType=&limit=&offset=
 * Returns PairingEventRow[] ordered by ts DESC. All filters optional.
 * `eventType` is validated against the known set; unknown values return [].
 */
export function createAdminAuditRoutes(deps: AdminAuditDeps): FastifyPluginAsync {
  const { audit } = deps;

  // eslint-disable-next-line @typescript-eslint/require-await
  const plugin: FastifyPluginAsync = async (app) => {
    app.get<{ Querystring: AuditQuery }>(
      '/audit',
      { schema: { querystring: querySchema } },
      async (request) => {
        const q = request.query;

        const filter: ListFilter = {};

        const from = parsePositiveInt(q.from);
        if (from !== undefined) filter.from = from;

        const to = parsePositiveInt(q.to);
        if (to !== undefined) filter.to = to;

        if (q.clientId !== undefined && q.clientId.length > 0) {
          filter.clientId = q.clientId;
        }

        if (q.eventType !== undefined && q.eventType.length > 0) {
          if (!KNOWN_EVENT_TYPES.includes(q.eventType as PairingEventType)) {
            // Unknown event type — return empty set rather than 400 to keep
            // the filter semantics pure.
            return [];
          }
          filter.eventType = q.eventType as PairingEventType;
        }

        const limit = parsePositiveInt(q.limit);
        if (limit !== undefined) filter.limit = limit;

        const offset = parsePositiveInt(q.offset);
        if (offset !== undefined) filter.offset = offset;

        return audit.list(filter);
      },
    );
  };

  return plugin;
}
