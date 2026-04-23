import { createAdminKeyMiddleware } from '../../middleware/admin-auth.js';

import { createAdminAuditRoutes } from './audit.js';
import { createAdminClientsRoutes } from './clients.js';
import { createAdminSettingsRoutes } from './settings.js';

import type { AuditRepo } from '../../lib/audit-repo.js';
import type Database from 'better-sqlite3';
import type { FastifyPluginAsync } from 'fastify';

export interface AdminRoutesDeps {
  db: Database.Database;
  audit: AuditRepo;
  revokeClient: (clientId: string, reason: string) => { updated: number };
  dataDir: string;
  getCurrentAdminKey: () => string;
  onKeyRotated: (newKey: string) => void;
}

/**
 * Admin plugin — mounts all admin sub-plugins under `/api/admin`, gated by
 * the `X-Admin-Key` preHandler.
 *
 * Endpoints:
 *   GET    /api/admin/clients
 *   POST   /api/admin/clients/:clientId/revoke
 *   POST   /api/admin/clients/:clientId/rename
 *   POST   /api/admin/clients/:clientId/reset-identity
 *   GET    /api/admin/audit
 *   POST   /api/admin/rotate-admin-key
 *
 * Callers must also add `/api/admin/` to the bypass list of any other
 * auth middleware (api-key, jwt-auth) so the admin key is the only auth
 * required.
 */
export function createAdminRoutes(deps: AdminRoutesDeps): FastifyPluginAsync {
  const adminKeyGuard = createAdminKeyMiddleware(deps.getCurrentAdminKey);

  const clients = createAdminClientsRoutes({
    db: deps.db,
    revokeClient: deps.revokeClient,
  });
  const audit = createAdminAuditRoutes({ audit: deps.audit });
  const settings = createAdminSettingsRoutes({
    dataDir: deps.dataDir,
    onKeyRotated: deps.onKeyRotated,
  });

  const plugin: FastifyPluginAsync = async (app) => {
    // Fastify encapsulation: register the guard as an onRequest hook inside
    // this plugin scope so child routes inherit it, but outer routes do not.
    app.addHook('onRequest', adminKeyGuard);

    await app.register(clients);
    await app.register(audit);
    await app.register(settings);
  };

  return plugin;
}
