import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import type { Subtask, Task, TaskWithSubtasks } from '../lib/types.js';
import { broadcast } from '../ws/broadcaster.js';

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // GET /api/tasks?project_id=X — List tasks (optional project filter)
  app.get<{ Querystring: { project_id?: string } }>('/api/tasks', async (request) => {
    const { project_id } = request.query;

    if (project_id) {
      return db
        .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY priority DESC, created_at DESC')
        .all(project_id) as Task[];
    }

    return db
      .prepare('SELECT * FROM tasks ORDER BY priority DESC, created_at DESC')
      .all() as Task[];
  });

  // POST /api/tasks — Create task
  app.post<{
    Body: { project_id: string; title: string; description?: string; status?: string; priority?: number };
  }>('/api/tasks', async (request, reply) => {
    const { project_id, title, description, status, priority } = request.body;

    if (!project_id || !title) {
      return reply.status(400).send({ error: 'project_id and title are required' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO tasks (id, project_id, title, description, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(id, project_id, title, description ?? '', status ?? 'backlog', priority ?? 0, now, now);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
    broadcast('tasks', 'created', id, task);
    return reply.status(201).send(task);
  });

  // GET /api/tasks/:id — Get task with subtasks
  app.get<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
      | Task
      | undefined;

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const subtasks = db
      .prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC')
      .all(request.params.id) as Subtask[];

    const result: TaskWithSubtasks = { ...task, subtasks };
    return result;
  });

  // PUT /api/tasks/:id — Update task
  app.put<{
    Params: { id: string };
    Body: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'project_id'>>;
  }>('/api/tasks/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
      | Task
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const title = request.body.title ?? existing.title;
    const description = request.body.description ?? existing.description;
    const status = request.body.status ?? existing.status;
    const priority = request.body.priority ?? existing.priority;
    const project_id = request.body.project_id ?? existing.project_id;
    const now = new Date().toISOString();

    db.prepare(
      'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, project_id = ?, updated_at = ? WHERE id = ?',
    ).run(title, description, status, priority, project_id, now, request.params.id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as Task;
    broadcast('tasks', 'updated', request.params.id, task);
    return task;
  });

  // DELETE /api/tasks/:id — Delete task
  app.delete<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
      | Task
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(request.params.id);
    broadcast('tasks', 'deleted', request.params.id, existing);
    return reply.status(204).send();
  });

  // PATCH /api/tasks/:id/status — Update just status
  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/api/tasks/:id/status',
    async (request, reply) => {
      const { status } = request.body;

      if (!status) {
        return reply.status(400).send({ error: 'status is required' });
      }

      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
        | Task
        | undefined;

      if (!existing) {
        return reply.status(404).send({ error: 'Task not found' });
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').run(
        status,
        now,
        request.params.id,
      );

      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as Task;
      broadcast('tasks', 'updated', request.params.id, task);
      return task;
    },
  );

  // POST /api/tasks/:taskId/subtasks — Add subtask
  app.post<{ Params: { taskId: string }; Body: { title: string; description?: string; sort_order?: number } }>(
    '/api/tasks/:taskId/subtasks',
    async (request, reply) => {
      const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(request.params.taskId) as
        | { id: string }
        | undefined;

      if (!task) {
        return reply.status(404).send({ error: 'Task not found' });
      }

      const { title, description, sort_order } = request.body;

      if (!title) {
        return reply.status(400).send({ error: 'title is required' });
      }

      const id = nanoid();
      db.prepare(
        'INSERT INTO subtasks (id, task_id, title, description, sort_order) VALUES (?, ?, ?, ?, ?)',
      ).run(id, request.params.taskId, title, description ?? '', sort_order ?? 0);

      const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as Subtask;
      broadcast('subtasks', 'created', id, subtask);
      return reply.status(201).send(subtask);
    },
  );

  // PUT /api/subtasks/:id — Update subtask
  app.put<{
    Params: { id: string };
    Body: Partial<Pick<Subtask, 'title' | 'description' | 'status' | 'sort_order'>>;
  }>('/api/subtasks/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(request.params.id) as
      | Subtask
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Subtask not found' });
    }

    const title = request.body.title ?? existing.title;
    const description = request.body.description ?? existing.description;
    const status = request.body.status ?? existing.status;
    const sort_order = request.body.sort_order ?? existing.sort_order;

    db.prepare(
      'UPDATE subtasks SET title = ?, description = ?, status = ?, sort_order = ? WHERE id = ?',
    ).run(title, description, status, sort_order, request.params.id);

    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(request.params.id) as Subtask;
    broadcast('subtasks', 'updated', request.params.id, subtask);
    return subtask;
  });

  // DELETE /api/subtasks/:id — Delete subtask
  app.delete<{ Params: { id: string } }>('/api/subtasks/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(request.params.id) as
      | Subtask
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Subtask not found' });
    }

    db.prepare('DELETE FROM subtasks WHERE id = ?').run(request.params.id);
    broadcast('subtasks', 'deleted', request.params.id, existing);
    return reply.status(204).send();
  });
}
