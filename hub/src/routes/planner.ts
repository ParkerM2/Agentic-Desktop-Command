import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import type { PlannerEvent } from '../lib/types.js';
import { broadcast } from '../ws/broadcaster.js';

export async function plannerRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // GET /api/planner/events?date=YYYY-MM-DD&end_date=YYYY-MM-DD
  app.get<{ Querystring: { date?: string; end_date?: string } }>(
    '/api/planner/events',
    async (request) => {
      const { date, end_date } = request.query;

      if (date && end_date) {
        return db
          .prepare(
            'SELECT * FROM planner_events WHERE date >= ? AND date <= ? ORDER BY date ASC, start_time ASC',
          )
          .all(date, end_date) as PlannerEvent[];
      }

      if (date) {
        return db
          .prepare('SELECT * FROM planner_events WHERE date = ? ORDER BY start_time ASC')
          .all(date) as PlannerEvent[];
      }

      return db
        .prepare('SELECT * FROM planner_events ORDER BY date ASC, start_time ASC')
        .all() as PlannerEvent[];
    },
  );

  // POST /api/planner/events — Create event
  app.post<{
    Body: {
      date: string;
      start_time: string;
      end_time: string;
      title: string;
      category?: string;
      task_id?: string;
    };
  }>('/api/planner/events', async (request, reply) => {
    const { date, start_time, end_time, title, category, task_id } = request.body;

    if (!date || !start_time || !end_time || !title) {
      return reply.status(400).send({ error: 'date, start_time, end_time, and title are required' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO planner_events (id, date, start_time, end_time, title, category, task_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(id, date, start_time, end_time, title, category ?? 'personal', task_id ?? null, now, now);

    const event = db.prepare('SELECT * FROM planner_events WHERE id = ?').get(id) as PlannerEvent;
    broadcast('planner_events', 'created', id, event);
    return reply.status(201).send(event);
  });

  // PUT /api/planner/events/:id — Update event
  app.put<{
    Params: { id: string };
    Body: Partial<Pick<PlannerEvent, 'date' | 'start_time' | 'end_time' | 'title' | 'category' | 'task_id'>>;
  }>('/api/planner/events/:id', async (request, reply) => {
    const existing = db
      .prepare('SELECT * FROM planner_events WHERE id = ?')
      .get(request.params.id) as PlannerEvent | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    const date = request.body.date ?? existing.date;
    const start_time = request.body.start_time ?? existing.start_time;
    const end_time = request.body.end_time ?? existing.end_time;
    const title = request.body.title ?? existing.title;
    const category = request.body.category ?? existing.category;
    const task_id = request.body.task_id !== undefined ? request.body.task_id : existing.task_id;
    const now = new Date().toISOString();

    db.prepare(
      'UPDATE planner_events SET date = ?, start_time = ?, end_time = ?, title = ?, category = ?, task_id = ?, updated_at = ? WHERE id = ?',
    ).run(date, start_time, end_time, title, category, task_id, now, request.params.id);

    const event = db
      .prepare('SELECT * FROM planner_events WHERE id = ?')
      .get(request.params.id) as PlannerEvent;
    broadcast('planner_events', 'updated', request.params.id, event);
    return event;
  });

  // DELETE /api/planner/events/:id — Delete event
  app.delete<{ Params: { id: string } }>('/api/planner/events/:id', async (request, reply) => {
    const existing = db
      .prepare('SELECT * FROM planner_events WHERE id = ?')
      .get(request.params.id) as PlannerEvent | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    db.prepare('DELETE FROM planner_events WHERE id = ?').run(request.params.id);
    broadcast('planner_events', 'deleted', request.params.id, existing);
    return reply.status(204).send();
  });
}
