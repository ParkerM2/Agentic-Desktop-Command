import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import { broadcast } from '../ws/broadcaster.js';

// ─── Types ────────────────────────────────────────────────────

interface WorkspaceRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  host_device_id: string | null;
  settings: string | null;
  created_at: string;
  updated_at: string;
}

interface DeviceRow {
  id: string;
  user_id: string;
  device_name: string;
  device_type: string;
  is_online: number;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatWorkspace(row: WorkspaceRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    hostDeviceId: row.host_device_id ?? undefined,
    settings: row.settings ? JSON.parse(row.settings) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Routes ───────────────────────────────────────────────────

export async function workspaceRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // ─────────────────────────────────────────────────────────────
  // GET /api/workspaces — List user's workspaces
  // ─────────────────────────────────────────────────────────────
  app.get('/api/workspaces', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const workspaces = db
      .prepare('SELECT * FROM workspaces WHERE user_id = ? ORDER BY created_at DESC')
      .all(request.user.id) as WorkspaceRow[];

    return {
      workspaces: workspaces.map(formatWorkspace),
    };
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/workspaces — Create workspace
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      name: string;
      description?: string;
      hostDeviceId?: string;
      settings?: {
        autoStartQueuedTasks?: boolean;
        maxConcurrentAgents?: number;
        defaultBranch?: string;
      };
    };
  }>('/api/workspaces', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const { name, description, hostDeviceId, settings } = request.body;

    if (!name || name.trim().length < 1) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Workspace name is required' },
      });
    }

    // Validate host device belongs to user
    if (hostDeviceId) {
      const device = db
        .prepare('SELECT id FROM devices WHERE id = ? AND user_id = ?')
        .get(hostDeviceId, request.user.id) as { id: string } | undefined;

      if (!device) {
        return reply.status(400).send({
          error: { code: 'INVALID_REQUEST', message: 'Invalid host device' },
        });
      }
    }

    const id = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO workspaces (id, user_id, name, description, host_device_id, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id,
      request.user.id,
      name.trim(),
      description ?? null,
      hostDeviceId ?? null,
      settings ? JSON.stringify(settings) : null,
      now,
      now,
    );

    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as WorkspaceRow;
    const formatted = formatWorkspace(workspace);

    broadcast('workspaces', 'created', id, formatted);

    return reply.status(201).send(formatted);
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/workspaces/:id — Get single workspace
  // ─────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/workspaces/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const workspace = db
      .prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?')
      .get(request.params.id, request.user.id) as WorkspaceRow | undefined;

    if (!workspace) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    return formatWorkspace(workspace);
  });

  // ─────────────────────────────────────────────────────────────
  // PATCH /api/workspaces/:id — Update workspace
  // ─────────────────────────────────────────────────────────────
  app.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      hostDeviceId?: string | null;
      settings?: Partial<{
        autoStartQueuedTasks: boolean;
        maxConcurrentAgents: number;
        defaultBranch: string;
      }>;
    };
  }>('/api/workspaces/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const workspace = db
      .prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?')
      .get(request.params.id, request.user.id) as WorkspaceRow | undefined;

    if (!workspace) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const { name, description, hostDeviceId, settings } = request.body;

    // Validate host device if changing
    if (hostDeviceId !== undefined && hostDeviceId !== null) {
      const device = db
        .prepare('SELECT id FROM devices WHERE id = ? AND user_id = ?')
        .get(hostDeviceId, request.user.id) as { id: string } | undefined;

      if (!device) {
        return reply.status(400).send({
          error: { code: 'INVALID_REQUEST', message: 'Invalid host device' },
        });
      }
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (hostDeviceId !== undefined) {
      updates.push('host_device_id = ?');
      values.push(hostDeviceId);
    }

    if (settings !== undefined) {
      // Merge with existing settings
      const existingSettings = workspace.settings ? JSON.parse(workspace.settings) : {};
      const mergedSettings = { ...existingSettings, ...settings };
      updates.push('settings = ?');
      values.push(JSON.stringify(mergedSettings));
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(request.params.id);

    db.prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(request.params.id) as WorkspaceRow;
    const formatted = formatWorkspace(updated);

    broadcast('workspaces', 'updated', request.params.id, formatted);

    return formatted;
  });

  // ─────────────────────────────────────────────────────────────
  // DELETE /api/workspaces/:id — Delete workspace
  // ─────────────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>('/api/workspaces/:id', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const workspace = db
      .prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?')
      .get(request.params.id, request.user.id) as WorkspaceRow | undefined;

    if (!workspace) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    // Note: Projects in this workspace will have workspace_id set to NULL (ON DELETE SET NULL)
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(request.params.id);

    broadcast('workspaces', 'deleted', request.params.id, { id: request.params.id });

    return reply.status(204).send();
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/workspaces/:id/host — Change host device
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Params: { id: string };
    Body: { hostDeviceId: string | null };
  }>('/api/workspaces/:id/host', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const workspace = db
      .prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?')
      .get(request.params.id, request.user.id) as WorkspaceRow | undefined;

    if (!workspace) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const { hostDeviceId } = request.body;

    // Validate new host device
    if (hostDeviceId !== null) {
      const device = db
        .prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?')
        .get(hostDeviceId, request.user.id) as DeviceRow | undefined;

      if (!device) {
        return reply.status(400).send({
          error: { code: 'INVALID_REQUEST', message: 'Invalid host device' },
        });
      }

      // Warn if device is not a desktop
      if (device.device_type !== 'desktop') {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Host device must be a desktop device capable of execution',
          },
        });
      }
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE workspaces SET host_device_id = ?, updated_at = ? WHERE id = ?').run(
      hostDeviceId,
      now,
      request.params.id,
    );

    const updated = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(request.params.id) as WorkspaceRow;
    const formatted = formatWorkspace(updated);

    broadcast('workspaces', 'updated', request.params.id, {
      ...formatted,
      hostChanged: true,
      previousHostDeviceId: workspace.host_device_id,
    });

    return formatted;
  });
}
