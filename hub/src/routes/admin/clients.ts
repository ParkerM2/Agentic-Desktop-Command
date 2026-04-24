import type Database from 'better-sqlite3';
import type { FastifyPluginAsync } from 'fastify';

export interface AdminClientsDeps {
  db: Database.Database;
  revokeClient: (clientId: string, reason: string) => { updated: number };
}

interface RevokeBody {
  reason?: string;
}

interface RenameBody {
  displayName?: string;
}

interface ClientIdParams {
  clientId: string;
}

interface ClientRow {
  client_id: string;
  display_name: string | null;
  created_at: string;
  revoked_at: number | null;
  revoked_reason: string | null;
}

interface LastSeenRow {
  last_seen: number | null;
}

export interface AdminClientDto {
  clientId: string;
  displayName: string | null;
  pairedAt: string;
  lastSeenAt: number | null;
  revokedAt: number | null;
  revokedReason: string | null;
}

const revokeBodySchema = {
  type: 'object',
  required: ['reason'],
  additionalProperties: false,
  properties: {
    reason: { type: 'string', minLength: 1, maxLength: 256 },
  },
} as const;

const renameBodySchema = {
  type: 'object',
  required: ['displayName'],
  additionalProperties: false,
  properties: {
    displayName: { type: 'string', minLength: 1, maxLength: 64 },
  },
} as const;

const clientIdParamsSchema = {
  type: 'object',
  required: ['clientId'],
  additionalProperties: false,
  properties: {
    clientId: { type: 'string', minLength: 1, maxLength: 64 },
  },
} as const;

/**
 * Admin client-management endpoints.
 *
 * All routes require `X-Admin-Key` header (enforced by the parent plugin's
 * preHandler). All routes are scoped under `/api/admin/clients`.
 */
export function createAdminClientsRoutes(deps: AdminClientsDeps): FastifyPluginAsync {
  const { db, revokeClient } = deps;

  // Prefer the most recent api_keys row per client_id (one row per live/revoked
  // lifecycle). We aggregate with MAX(created_at) to collapse superseded rows,
  // but we want the current/latest displayName + revocation state.
  const listClients = db.prepare(
    `SELECT
       k.client_id,
       k.display_name,
       k.created_at,
       k.revoked_at,
       k.revoked_reason
     FROM api_keys k
     INNER JOIN (
       SELECT client_id, MAX(created_at) AS max_created
         FROM api_keys
        WHERE client_id IS NOT NULL
        GROUP BY client_id
     ) latest
       ON latest.client_id = k.client_id
      AND latest.max_created = k.created_at
     WHERE k.client_id IS NOT NULL
     ORDER BY k.created_at DESC`,
  );

  const lastSeenStmt = db.prepare(
    `SELECT MAX(ts) AS last_seen
       FROM pairing_events
      WHERE client_id = ? AND event_type = 'pair.confirm' AND outcome = 'success'`,
  );

  const renameStmt = db.prepare(
    `UPDATE api_keys
        SET display_name = ?
      WHERE client_id = ? AND revoked_at IS NULL`,
  );

  const deleteBindingStmt = db.prepare(
    `DELETE FROM client_bindings WHERE client_id = ?`,
  );

  // eslint-disable-next-line @typescript-eslint/require-await
  const plugin: FastifyPluginAsync = async (app) => {
    app.get('/clients', async () => {
      const rows = listClients.all() as ClientRow[];
      const result: AdminClientDto[] = rows.map((row) => {
        const seen = lastSeenStmt.get(row.client_id) as LastSeenRow | undefined;
        return {
          clientId: row.client_id,
          displayName: row.display_name,
          pairedAt: row.created_at,
          lastSeenAt: seen?.last_seen ?? null,
          revokedAt: row.revoked_at,
          revokedReason: row.revoked_reason,
        };
      });
      return result;
    });

    app.post<{ Params: ClientIdParams; Body: RevokeBody }>(
      '/clients/:clientId/revoke',
      { schema: { params: clientIdParamsSchema, body: revokeBodySchema } },
      async (request, reply) => {
        const { clientId } = request.params;
        const reason = request.body.reason ?? '';
        const result = revokeClient(clientId, reason);
        await reply.status(200).send({ updated: result.updated });
      },
    );

    app.post<{ Params: ClientIdParams; Body: RenameBody }>(
      '/clients/:clientId/rename',
      { schema: { params: clientIdParamsSchema, body: renameBodySchema } },
      async (request, reply) => {
        const { clientId } = request.params;
        const displayName = request.body.displayName ?? '';
        const info = renameStmt.run(displayName, clientId);
        await reply.status(200).send({ updated: info.changes });
      },
    );

    app.post<{ Params: ClientIdParams }>(
      '/clients/:clientId/reset-identity',
      { schema: { params: clientIdParamsSchema } },
      async (request, reply) => {
        const { clientId } = request.params;
        // Order: revoke first (so WS listeners see the old key row while the
        // bus fires), then delete binding — binding-less clients can't pair
        // again without a fresh handshake.
        const revoked = revokeClient(clientId, 'identity_reset');
        const info = deleteBindingStmt.run(clientId);
        await reply.status(200).send({
          deleted: info.changes,
          revoked: revoked.updated,
        });
      },
    );
  };

  return plugin;
}
