import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import type { Capture } from '../lib/types.js';
import { broadcast } from '../ws/broadcaster.js';

export async function captureRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // GET /api/captures?limit=20 — Recent captures
  app.get<{ Querystring: { limit?: string } }>('/api/captures', async (request) => {
    const limit = Number(request.query.limit) || 20;

    return db
      .prepare('SELECT * FROM captures ORDER BY created_at DESC LIMIT ?')
      .all(limit) as Capture[];
  });

  // POST /api/captures — Create capture
  app.post<{ Body: { text: string; project_id?: string } }>(
    '/api/captures',
    async (request, reply) => {
      const { text, project_id } = request.body;

      if (!text) {
        return reply.status(400).send({ error: 'text is required' });
      }

      const id = nanoid();
      const now = new Date().toISOString();

      db.prepare(
        'INSERT INTO captures (id, text, project_id, created_at) VALUES (?, ?, ?, ?)',
      ).run(id, text, project_id ?? null, now);

      const capture = db.prepare('SELECT * FROM captures WHERE id = ?').get(id) as Capture;
      broadcast('captures', 'created', id, capture);
      return reply.status(201).send(capture);
    },
  );

  // DELETE /api/captures/:id — Delete capture
  app.delete<{ Params: { id: string } }>('/api/captures/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM captures WHERE id = ?').get(request.params.id) as
      | Capture
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Capture not found' });
    }

    db.prepare('DELETE FROM captures WHERE id = ?').run(request.params.id);
    broadcast('captures', 'deleted', request.params.id, existing);
    return reply.status(204).send();
  });
}
