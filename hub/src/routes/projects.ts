import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import type { Project } from '../lib/types.js';
import { broadcast } from '../ws/broadcaster.js';

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // GET /api/projects — List all projects
  app.get('/api/projects', async () => {
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Project[];
    return projects;
  });

  // POST /api/projects — Create project
  app.post<{ Body: { name: string; path: string } }>('/api/projects', async (request, reply) => {
    const { name, path } = request.body;

    if (!name || !path) {
      return reply.status(400).send({ error: 'name and path are required' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO projects (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, name, path, now, now);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project;
    broadcast('projects', 'created', id, project);
    return reply.status(201).send(project);
  });

  // GET /api/projects/:id — Get single project
  app.get<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id) as
      | Project
      | undefined;

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return project;
  });

  // PUT /api/projects/:id — Update project
  app.put<{ Params: { id: string }; Body: Partial<Pick<Project, 'name' | 'path'>> }>(
    '/api/projects/:id',
    async (request, reply) => {
      const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id) as
        | Project
        | undefined;

      if (!existing) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      const name = request.body.name ?? existing.name;
      const path = request.body.path ?? existing.path;
      const now = new Date().toISOString();

      db.prepare('UPDATE projects SET name = ?, path = ?, updated_at = ? WHERE id = ?').run(
        name,
        path,
        now,
        request.params.id,
      );

      const project = db
        .prepare('SELECT * FROM projects WHERE id = ?')
        .get(request.params.id) as Project;
      broadcast('projects', 'updated', request.params.id, project);
      return project;
    },
  );

  // DELETE /api/projects/:id — Delete project + cascade tasks
  app.delete<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id) as
      | Project
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(request.params.id);
    broadcast('projects', 'deleted', request.params.id, existing);
    return reply.status(204).send();
  });
}
