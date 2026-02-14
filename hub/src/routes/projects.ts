import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import { broadcast } from '../ws/broadcaster.js';

// ─── Types ────────────────────────────────────────────────────

interface ProjectRow {
  id: string;
  name: string;
  path: string;
  workspace_id: string | null;
  git_url: string | null;
  repo_structure: string;
  default_branch: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface SubProjectRow {
  id: string;
  project_id: string;
  name: string;
  relative_path: string;
  git_url: string | null;
  default_branch: string | null;
  created_at: string;
}

interface WorkspaceRow {
  id: string;
  user_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatProject(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    rootPath: row.path,
    workspaceId: row.workspace_id ?? undefined,
    gitUrl: row.git_url ?? undefined,
    repoStructure: row.repo_structure as 'single' | 'monorepo' | 'multi-repo',
    defaultBranch: row.default_branch ?? 'main',
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatSubProject(row: SubProjectRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    relativePath: row.relative_path,
    gitUrl: row.git_url ?? undefined,
    defaultBranch: row.default_branch ?? 'main',
    createdAt: row.created_at,
  };
}

// ─── Routes ───────────────────────────────────────────────────

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // ─────────────────────────────────────────────────────────────
  // GET /api/projects — List all projects (legacy, no auth required)
  // ─────────────────────────────────────────────────────────────
  app.get('/api/projects', async () => {
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as ProjectRow[];
    return projects.map(formatProject);
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/workspaces/:wid/projects — List projects in workspace
  // ─────────────────────────────────────────────────────────────
  app.get<{ Params: { wid: string } }>('/api/workspaces/:wid/projects', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Verify workspace belongs to user
    const workspace = db
      .prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?')
      .get(request.params.wid, request.user.id) as WorkspaceRow | undefined;

    if (!workspace) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const projects = db
      .prepare('SELECT * FROM projects WHERE workspace_id = ? ORDER BY created_at DESC')
      .all(request.params.wid) as ProjectRow[];

    // Include sub-projects for each project
    const projectsWithSubProjects = projects.map((project) => {
      const subProjects = db
        .prepare('SELECT * FROM sub_projects WHERE project_id = ? ORDER BY relative_path ASC')
        .all(project.id) as SubProjectRow[];

      return {
        ...formatProject(project),
        subProjects: subProjects.map(formatSubProject),
      };
    });

    return { projects: projectsWithSubProjects };
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/workspaces/:wid/projects — Create project in workspace
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Params: { wid: string };
    Body: {
      name: string;
      rootPath: string;
      description?: string;
      gitUrl?: string;
      repoStructure: 'single' | 'monorepo' | 'multi-repo';
      defaultBranch?: string;
      subProjects?: Array<{
        name: string;
        relativePath: string;
        gitUrl?: string;
        defaultBranch?: string;
      }>;
    };
  }>('/api/workspaces/:wid/projects', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Verify workspace belongs to user
    const workspace = db
      .prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?')
      .get(request.params.wid, request.user.id) as WorkspaceRow | undefined;

    if (!workspace) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const { name, rootPath, description, gitUrl, repoStructure, defaultBranch, subProjects } = request.body;

    if (!name || !rootPath) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'name and rootPath are required' },
      });
    }

    if (!['single', 'monorepo', 'multi-repo'].includes(repoStructure)) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'repoStructure must be single, monorepo, or multi-repo' },
      });
    }

    // Check for duplicate path in workspace
    const existing = db
      .prepare('SELECT id FROM projects WHERE workspace_id = ? AND path = ?')
      .get(request.params.wid, rootPath) as { id: string } | undefined;

    if (existing) {
      return reply.status(409).send({
        error: { code: 'CONFLICT', message: 'A project with this path already exists in this workspace' },
      });
    }

    const projectId = nanoid();
    const now = new Date().toISOString();

    // Create project
    db.prepare(
      'INSERT INTO projects (id, name, path, workspace_id, git_url, repo_structure, default_branch, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      projectId,
      name,
      rootPath,
      request.params.wid,
      gitUrl ?? null,
      repoStructure,
      defaultBranch ?? 'main',
      description ?? null,
      now,
      now,
    );

    // Create sub-projects if provided
    const createdSubProjects: SubProjectRow[] = [];
    if (subProjects && subProjects.length > 0) {
      const insertSubProject = db.prepare(
        'INSERT INTO sub_projects (id, project_id, name, relative_path, git_url, default_branch, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );

      for (const sp of subProjects) {
        const subProjectId = nanoid();
        insertSubProject.run(
          subProjectId,
          projectId,
          sp.name,
          sp.relativePath,
          sp.gitUrl ?? null,
          sp.defaultBranch ?? 'main',
          now,
        );
        createdSubProjects.push({
          id: subProjectId,
          project_id: projectId,
          name: sp.name,
          relative_path: sp.relativePath,
          git_url: sp.gitUrl ?? null,
          default_branch: sp.defaultBranch ?? null,
          created_at: now,
        });
      }
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ProjectRow;
    const formatted = {
      ...formatProject(project),
      subProjects: createdSubProjects.map(formatSubProject),
    };

    broadcast('projects', 'created', projectId, formatted);

    return reply.status(201).send(formatted);
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/projects — Create project (legacy, no workspace)
  // ─────────────────────────────────────────────────────────────
  app.post<{ Body: { name: string; path: string } }>('/api/projects', async (request, reply) => {
    const { name, path } = request.body;

    if (!name || !path) {
      return reply.status(400).send({ error: 'name and path are required' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO projects (id, name, path, repo_structure, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, name, path, 'single', now, now);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow;
    const formatted = formatProject(project);
    broadcast('projects', 'created', id, formatted);
    return reply.status(201).send(formatted);
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/projects/:id — Get single project with sub-projects
  // ─────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id) as
      | ProjectRow
      | undefined;

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const subProjects = db
      .prepare('SELECT * FROM sub_projects WHERE project_id = ? ORDER BY relative_path ASC')
      .all(request.params.id) as SubProjectRow[];

    return {
      ...formatProject(project),
      subProjects: subProjects.map(formatSubProject),
    };
  });

  // ─────────────────────────────────────────────────────────────
  // PATCH /api/projects/:id — Update project
  // ─────────────────────────────────────────────────────────────
  app.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      gitUrl?: string;
      defaultBranch?: string;
    };
  }>('/api/projects/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id) as
      | ProjectRow
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // If project belongs to a workspace, verify user ownership
    if (existing.workspace_id && request.user) {
      const workspace = db
        .prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?')
        .get(existing.workspace_id, request.user.id) as WorkspaceRow | undefined;

      if (!workspace) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized to modify this project' },
        });
      }
    }

    const { name, description, gitUrl, defaultBranch } = request.body;
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (gitUrl !== undefined) {
      updates.push('git_url = ?');
      values.push(gitUrl);
    }

    if (defaultBranch !== undefined) {
      updates.push('default_branch = ?');
      values.push(defaultBranch);
    }

    if (updates.length === 0) {
      return formatProject(existing);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(request.params.id);

    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id) as ProjectRow;
    const formatted = formatProject(project);
    broadcast('projects', 'updated', request.params.id, formatted);
    return formatted;
  });

  // ─────────────────────────────────────────────────────────────
  // PUT /api/projects/:id — Update project (legacy)
  // ─────────────────────────────────────────────────────────────
  app.put<{ Params: { id: string }; Body: Partial<{ name: string; path: string }> }>(
    '/api/projects/:id',
    async (request, reply) => {
      const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id) as
        | ProjectRow
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

      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id) as ProjectRow;
      const formatted = formatProject(project);
      broadcast('projects', 'updated', request.params.id, formatted);
      return formatted;
    },
  );

  // ─────────────────────────────────────────────────────────────
  // DELETE /api/projects/:id — Delete project + cascade
  // ─────────────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id) as
      | ProjectRow
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // If project belongs to a workspace, verify user ownership
    if (existing.workspace_id && request.user) {
      const workspace = db
        .prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?')
        .get(existing.workspace_id, request.user.id) as WorkspaceRow | undefined;

      if (!workspace) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized to delete this project' },
        });
      }
    }

    // Sub-projects and tasks will cascade delete
    db.prepare('DELETE FROM projects WHERE id = ?').run(request.params.id);
    broadcast('projects', 'deleted', request.params.id, { id: request.params.id });
    return reply.status(204).send();
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/projects/:id/sub-projects — List sub-projects
  // ─────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/projects/:id/sub-projects', async (request, reply) => {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(request.params.id) as
      | { id: string }
      | undefined;

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const subProjects = db
      .prepare('SELECT * FROM sub_projects WHERE project_id = ? ORDER BY relative_path ASC')
      .all(request.params.id) as SubProjectRow[];

    return { subProjects: subProjects.map(formatSubProject) };
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/projects/:id/sub-projects — Add sub-project
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Params: { id: string };
    Body: {
      name: string;
      relativePath: string;
      gitUrl?: string;
      defaultBranch?: string;
    };
  }>('/api/projects/:id/sub-projects', async (request, reply) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(request.params.id) as
      | ProjectRow
      | undefined;

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const { name, relativePath, gitUrl, defaultBranch } = request.body;

    if (!name || !relativePath) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'name and relativePath are required' },
      });
    }

    // Check for duplicate relative path
    const existing = db
      .prepare('SELECT id FROM sub_projects WHERE project_id = ? AND relative_path = ?')
      .get(request.params.id, relativePath) as { id: string } | undefined;

    if (existing) {
      return reply.status(409).send({
        error: { code: 'CONFLICT', message: 'A sub-project with this path already exists' },
      });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO sub_projects (id, project_id, name, relative_path, git_url, default_branch, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(id, request.params.id, name, relativePath, gitUrl ?? null, defaultBranch ?? 'main', now);

    const subProject = db.prepare('SELECT * FROM sub_projects WHERE id = ?').get(id) as SubProjectRow;
    const formatted = formatSubProject(subProject);

    broadcast('sub_projects', 'created', id, formatted);

    return reply.status(201).send(formatted);
  });

  // ─────────────────────────────────────────────────────────────
  // DELETE /api/projects/:pid/sub-projects/:sid — Delete sub-project
  // ─────────────────────────────────────────────────────────────
  app.delete<{ Params: { pid: string; sid: string } }>(
    '/api/projects/:pid/sub-projects/:sid',
    async (request, reply) => {
      const subProject = db
        .prepare('SELECT * FROM sub_projects WHERE id = ? AND project_id = ?')
        .get(request.params.sid, request.params.pid) as SubProjectRow | undefined;

      if (!subProject) {
        return reply.status(404).send({ error: 'Sub-project not found' });
      }

      db.prepare('DELETE FROM sub_projects WHERE id = ?').run(request.params.sid);

      broadcast('sub_projects', 'deleted', request.params.sid, { id: request.params.sid });

      return reply.status(204).send();
    },
  );
}
