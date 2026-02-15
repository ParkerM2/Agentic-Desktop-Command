import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import type { Subtask } from '../lib/types.js';
import { broadcast } from '../ws/broadcaster.js';

// ─── Types ────────────────────────────────────────────────────

interface TaskRow {
  id: string;
  project_id: string;
  workspace_id: string | null;
  sub_project_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: number;
  assigned_device_id: string | null;
  created_by_device_id: string | null;
  execution_session_id: string | null;
  progress: string | null;
  metadata: string | null;
  agent_name: string | null;
  activity_history: string;
  cost_tokens: number;
  cost_usd: number;
  pr_number: number | null;
  pr_state: string | null;
  pr_ci_status: string | null;
  pr_url: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatTask(row: TaskRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id ?? undefined,
    subProjectId: row.sub_project_id ?? undefined,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedDeviceId: row.assigned_device_id ?? undefined,
    createdByDeviceId: row.created_by_device_id ?? undefined,
    executionSessionId: row.execution_session_id ?? undefined,
    progress: row.progress ? JSON.parse(row.progress) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    agentName: row.agent_name ?? undefined,
    activityHistory: JSON.parse(row.activity_history),
    costTokens: row.cost_tokens,
    costUsd: row.cost_usd,
    prNumber: row.pr_number ?? undefined,
    prState: row.pr_state ?? undefined,
    prCiStatus: row.pr_ci_status ?? undefined,
    prUrl: row.pr_url ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Routes ───────────────────────────────────────────────────

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // ─────────────────────────────────────────────────────────────
  // GET /api/tasks — List tasks with filters
  // ─────────────────────────────────────────────────────────────
  app.get<{
    Querystring: {
      project_id?: string;
      workspace_id?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };
  }>('/api/tasks', async (request) => {
    const { project_id, workspace_id, status, limit, offset } = request.query;

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: unknown[] = [];

    if (project_id) {
      query += ' AND project_id = ?';
      params.push(project_id);
    }

    if (workspace_id) {
      query += ' AND workspace_id = ?';
      params.push(workspace_id);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit, 10));
    }

    if (offset) {
      query += ' OFFSET ?';
      params.push(parseInt(offset, 10));
    }

    const tasks = db.prepare(query).all(...params) as TaskRow[];
    return tasks.map(formatTask);
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/tasks — Create task
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      project_id: string;
      title: string;
      description?: string;
      status?: string;
      priority?: number;
      workspace_id?: string;
      sub_project_id?: string;
      agent_name?: string;
      metadata?: Record<string, unknown>;
    };
  }>('/api/tasks', async (request, reply) => {
    const {
      project_id,
      title,
      description,
      status,
      priority,
      workspace_id,
      sub_project_id,
      agent_name,
      metadata,
    } = request.body;

    if (!project_id || !title) {
      return reply.status(400).send({ error: 'project_id and title are required' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    // Get device ID if authenticated
    const createdByDeviceId = request.user?.deviceId ?? null;

    db.prepare(
      `INSERT INTO tasks (
        id, project_id, workspace_id, sub_project_id, title, description,
        status, priority, created_by_device_id, agent_name, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      project_id,
      workspace_id ?? null,
      sub_project_id ?? null,
      title,
      description ?? '',
      status ?? 'backlog',
      priority ?? 0,
      createdByDeviceId,
      agent_name ?? null,
      metadata ? JSON.stringify(metadata) : null,
      now,
      now,
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow;
    const formatted = formatTask(task);
    broadcast('tasks', 'created', id, formatted);
    return reply.status(201).send(formatted);
  });

  // ─────────────────────────────────────────────────────────────
  // GET /api/tasks/:id — Get task with subtasks
  // ─────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
      | TaskRow
      | undefined;

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const subtasks = db
      .prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC')
      .all(request.params.id) as Subtask[];

    return {
      ...formatTask(task),
      subtasks,
    };
  });

  // ─────────────────────────────────────────────────────────────
  // PUT /api/tasks/:id — Update task
  // ─────────────────────────────────────────────────────────────
  app.put<{
    Params: { id: string };
    Body: Partial<{
      title: string;
      description: string;
      status: string;
      priority: number;
      project_id: string;
      workspace_id: string | null;
      sub_project_id: string | null;
      assigned_device_id: string | null;
      agent_name: string | null;
      activity_history: unknown[];
      cost_tokens: number;
      cost_usd: number;
      pr_number: number | null;
      pr_state: string | null;
      pr_ci_status: string | null;
      pr_url: string | null;
      metadata: Record<string, unknown>;
    }>;
  }>('/api/tasks/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
      | TaskRow
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (request.body.title !== undefined) {
      updates.push('title = ?');
      values.push(request.body.title);
    }
    if (request.body.description !== undefined) {
      updates.push('description = ?');
      values.push(request.body.description);
    }
    if (request.body.status !== undefined) {
      updates.push('status = ?');
      values.push(request.body.status);
    }
    if (request.body.priority !== undefined) {
      updates.push('priority = ?');
      values.push(request.body.priority);
    }
    if (request.body.project_id !== undefined) {
      updates.push('project_id = ?');
      values.push(request.body.project_id);
    }
    if (request.body.workspace_id !== undefined) {
      updates.push('workspace_id = ?');
      values.push(request.body.workspace_id);
    }
    if (request.body.sub_project_id !== undefined) {
      updates.push('sub_project_id = ?');
      values.push(request.body.sub_project_id);
    }
    if (request.body.assigned_device_id !== undefined) {
      updates.push('assigned_device_id = ?');
      values.push(request.body.assigned_device_id);
    }
    if (request.body.agent_name !== undefined) {
      updates.push('agent_name = ?');
      values.push(request.body.agent_name);
    }
    if (request.body.activity_history !== undefined) {
      updates.push('activity_history = ?');
      values.push(JSON.stringify(request.body.activity_history));
    }
    if (request.body.cost_tokens !== undefined) {
      updates.push('cost_tokens = ?');
      values.push(request.body.cost_tokens);
    }
    if (request.body.cost_usd !== undefined) {
      updates.push('cost_usd = ?');
      values.push(request.body.cost_usd);
    }
    if (request.body.pr_number !== undefined) {
      updates.push('pr_number = ?');
      values.push(request.body.pr_number);
    }
    if (request.body.pr_state !== undefined) {
      updates.push('pr_state = ?');
      values.push(request.body.pr_state);
    }
    if (request.body.pr_ci_status !== undefined) {
      updates.push('pr_ci_status = ?');
      values.push(request.body.pr_ci_status);
    }
    if (request.body.pr_url !== undefined) {
      updates.push('pr_url = ?');
      values.push(request.body.pr_url);
    }
    if (request.body.metadata !== undefined) {
      const existingMeta = existing.metadata ? JSON.parse(existing.metadata) : {};
      const merged = { ...existingMeta, ...request.body.metadata };
      updates.push('metadata = ?');
      values.push(JSON.stringify(merged));
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(request.params.id);

    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as TaskRow;
    const formatted = formatTask(task);
    broadcast('tasks', 'updated', request.params.id, formatted);
    return formatted;
  });

  // ─────────────────────────────────────────────────────────────
  // DELETE /api/tasks/:id — Delete task
  // ─────────────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
      | TaskRow
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(request.params.id);
    broadcast('tasks', 'deleted', request.params.id, {
      id: request.params.id,
      projectId: existing.project_id,
    });
    return reply.status(204).send();
  });

  // ─────────────────────────────────────────────────────────────
  // PATCH /api/tasks/:id/status — Update just status
  // ─────────────────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/api/tasks/:id/status',
    async (request, reply) => {
      const { status } = request.body;

      if (!status) {
        return reply.status(400).send({ error: 'status is required' });
      }

      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
        | TaskRow
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

      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as TaskRow;
      const formatted = formatTask(task);
      broadcast('tasks', 'updated', request.params.id, formatted);
      return formatted;
    },
  );

  // ─────────────────────────────────────────────────────────────
  // POST /api/tasks/:id/progress — Push progress update
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Params: { id: string };
    Body: {
      phase: string;
      phaseIndex: number;
      totalPhases: number;
      currentAgent: string | null;
      filesChanged: number;
      logLines: string[];
      status?: string;
      cost_tokens?: number;
      cost_usd?: number;
    };
  }>('/api/tasks/:id/progress', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
      | TaskRow
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const { phase, phaseIndex, totalPhases, currentAgent, filesChanged, logLines, status, cost_tokens, cost_usd } =
      request.body;

    const now = new Date().toISOString();

    // Build progress object
    const progress = {
      phase,
      phaseIndex,
      totalPhases,
      currentAgent,
      filesChanged,
      lastActivity: now,
      logs: logLines,
    };

    // Append snapshot to activity_history
    const existingHistory: unknown[] = JSON.parse(existing.activity_history);
    existingHistory.push({
      timestamp: now,
      phase,
      phaseIndex,
      filesChanged,
    });

    const updates: string[] = ['progress = ?', 'activity_history = ?', 'updated_at = ?'];
    const values: unknown[] = [JSON.stringify(progress), JSON.stringify(existingHistory), now];

    // Optionally update status
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    // Update cost tracking
    if (cost_tokens !== undefined) {
      updates.push('cost_tokens = ?');
      values.push(cost_tokens);
    }
    if (cost_usd !== undefined) {
      updates.push('cost_usd = ?');
      values.push(cost_usd);
    }

    values.push(request.params.id);
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as TaskRow;
    const formatted = formatTask(task);

    // Broadcast progress event with projectId
    broadcast('tasks', 'progress', request.params.id, {
      taskId: request.params.id,
      projectId: task.project_id,
      progress: formatted.progress,
    });

    return {
      received: true,
      taskId: request.params.id,
      broadcastedTo: 1,
    };
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/tasks/:id/complete — Mark task complete
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Params: { id: string };
    Body: {
      result: 'success' | 'error';
      prUrl?: string;
      errorMessage?: string;
      summary?: string;
    };
  }>('/api/tasks/:id/complete', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
      | TaskRow
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const { result, prUrl, errorMessage, summary } = request.body;
    const now = new Date().toISOString();

    const newStatus = result === 'success' ? 'done' : 'error';

    // Update metadata with completion info
    const existingMeta = existing.metadata ? JSON.parse(existing.metadata) : {};
    const updatedMeta = {
      ...existingMeta,
      completedAt: now,
      result,
      prUrl,
      errorMessage,
      summary,
    };

    db.prepare(
      'UPDATE tasks SET status = ?, metadata = ?, completed_at = ?, updated_at = ?, progress = NULL WHERE id = ?',
    ).run(newStatus, JSON.stringify(updatedMeta), now, now, request.params.id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as TaskRow;
    const formatted = formatTask(task);

    // Broadcast completion event with projectId
    broadcast('tasks', 'completed', request.params.id, {
      taskId: request.params.id,
      projectId: task.project_id,
      result,
      prUrl,
      summary,
    });

    return formatted;
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/tasks/:id/execute — Request task execution
  // ─────────────────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/tasks/:id/execute', async (request, reply) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
      | TaskRow
      | undefined;

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    // Get workspace to find host device
    if (!task.workspace_id) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Task must belong to a workspace to execute' },
      });
    }

    const workspace = db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .get(task.workspace_id) as { host_device_id: string | null } | undefined;

    if (!workspace?.host_device_id) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Workspace has no host device configured' },
      });
    }

    // Check if host device is online
    const device = db
      .prepare('SELECT * FROM devices WHERE id = ?')
      .get(workspace.host_device_id) as { is_online: number } | undefined;

    if (!device?.is_online) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Host device is offline' },
      });
    }

    const sessionId = `exec-${nanoid()}`;
    const now = new Date().toISOString();

    // Update task status and session
    db.prepare(
      'UPDATE tasks SET status = ?, execution_session_id = ?, assigned_device_id = ?, updated_at = ? WHERE id = ?',
    ).run('queued', sessionId, workspace.host_device_id, now, request.params.id);

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as TaskRow;
    const formatted = formatTask(updatedTask);

    // Broadcast execute command to host device
    broadcast('tasks', 'execute', request.params.id, {
      type: 'command:execute',
      taskId: request.params.id,
      projectId: task.project_id,
      task: formatted,
    });

    return {
      sessionId,
      status: 'queued' as const,
    };
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/tasks/:id/cancel — Cancel task execution
  // ─────────────────────────────────────────────────────────────
  app.post<{
    Params: { id: string };
    Body: { reason?: string };
  }>('/api/tasks/:id/cancel', async (request, reply) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(request.params.id) as
      | TaskRow
      | undefined;

    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    if (!['queued', 'running'].includes(task.status)) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Task is not running or queued' },
      });
    }

    const now = new Date().toISOString();
    const previousStatus = task.status;

    // Update task status
    db.prepare(
      'UPDATE tasks SET status = ?, execution_session_id = NULL, progress = NULL, updated_at = ? WHERE id = ?',
    ).run('backlog', now, request.params.id);

    // Broadcast cancel command to device
    if (task.assigned_device_id) {
      broadcast('tasks', 'cancel', request.params.id, {
        type: 'command:cancel',
        taskId: request.params.id,
        projectId: task.project_id,
        reason: request.body.reason,
      });
    }

    return {
      success: true,
      previousStatus,
    };
  });

  // ─────────────────────────────────────────────────────────────
  // Subtask routes (unchanged)
  // ─────────────────────────────────────────────────────────────

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
