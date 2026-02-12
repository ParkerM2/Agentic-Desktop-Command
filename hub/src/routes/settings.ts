import type { FastifyInstance } from 'fastify';

import type { Setting } from '../lib/types.js';
import { broadcast } from '../ws/broadcaster.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // GET /api/settings — Get all settings as object
  app.get('/api/settings', async () => {
    const rows = db.prepare('SELECT * FROM settings').all() as Setting[];

    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }

    return result;
  });

  // PUT /api/settings — Bulk update settings { key: value, ... }
  app.put<{ Body: Record<string, string> }>('/api/settings', async (request) => {
    const entries = request.body;
    const now = new Date().toISOString();

    const upsert = db.prepare(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    );

    const updateMany = db.transaction((items: [string, string][]) => {
      for (const [key, value] of items) {
        upsert.run(key, value, now);
      }
    });

    updateMany(Object.entries(entries));

    // Return updated settings
    const rows = db.prepare('SELECT * FROM settings').all() as Setting[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }

    broadcast('settings', 'updated', 'bulk', result);
    return result;
  });
}
