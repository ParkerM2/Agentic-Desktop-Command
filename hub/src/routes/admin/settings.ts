import { rotateAdminKey } from '../../lib/admin-key.js';

import type { FastifyPluginAsync } from 'fastify';

export interface AdminSettingsDeps {
  dataDir: string;
  /**
   * Callback invoked after a successful rotation so the server-side
   * `getCurrentAdminKey()` closure is updated. Without this the middleware
   * would continue accepting the old key.
   */
  onKeyRotated: (newKey: string) => void;
}

/**
 * Admin settings endpoints — rotate-admin-key today, extensible later.
 */
export function createAdminSettingsRoutes(deps: AdminSettingsDeps): FastifyPluginAsync {
  const { dataDir, onKeyRotated } = deps;

  // eslint-disable-next-line @typescript-eslint/require-await
  const plugin: FastifyPluginAsync = async (app) => {
    // Rotate requires the CURRENT admin key (enforced by the outer preHandler).
    // We disk-write the new key and update the in-memory closure atomically.
    app.post('/rotate-admin-key', async (_request, reply) => {
      const newKey = rotateAdminKey(dataDir);
      onKeyRotated(newKey);
      await reply.status(200).send({ key: newKey });
    });
  };

  return plugin;
}
