import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

import type { AgentRun } from '../lib/types.js';
import { broadcast } from '../ws/broadcaster.js';

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;

  // GET /api/agent-runs?project_id=X — List runs
  app.get<{ Querystring: { project_id?: string } }>('/api/agent-runs', async (request) => {
    const { project_id } = request.query;

    if (project_id) {
      return db
        .prepare('SELECT * FROM agent_runs WHERE project_id = ? ORDER BY started_at DESC')
        .all(project_id) as AgentRun[];
    }

    return db
      .prepare('SELECT * FROM agent_runs ORDER BY started_at DESC')
      .all() as AgentRun[];
  });

  // POST /api/agent-runs — Log new run
  app.post<{
    Body: {
      project_id: string;
      task_id?: string;
      status?: string;
      tokens_used?: number;
      cost_usd?: number;
      log?: string;
    };
  }>('/api/agent-runs', async (request, reply) => {
    const { project_id, task_id, status, tokens_used, cost_usd, log } = request.body;

    if (!project_id) {
      return reply.status(400).send({ error: 'project_id is required' });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO agent_runs (id, task_id, project_id, status, started_at, tokens_used, cost_usd, log) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id,
      task_id ?? null,
      project_id,
      status ?? 'running',
      now,
      tokens_used ?? 0,
      cost_usd ?? 0,
      log ?? '',
    );

    const run = db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(id) as AgentRun;
    broadcast('agent_runs', 'created', id, run);
    return reply.status(201).send(run);
  });

  // PUT /api/agent-runs/:id — Update run (status, tokens, cost)
  app.put<{
    Params: { id: string };
    Body: Partial<Pick<AgentRun, 'status' | 'completed_at' | 'tokens_used' | 'cost_usd' | 'log'>>;
  }>('/api/agent-runs/:id', async (request, reply) => {
    const existing = db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(request.params.id) as
      | AgentRun
      | undefined;

    if (!existing) {
      return reply.status(404).send({ error: 'Agent run not found' });
    }

    const status = request.body.status ?? existing.status;
    const completed_at = request.body.completed_at ?? existing.completed_at;
    const tokens_used = request.body.tokens_used ?? existing.tokens_used;
    const cost_usd = request.body.cost_usd ?? existing.cost_usd;
    const log = request.body.log ?? existing.log;

    db.prepare(
      'UPDATE agent_runs SET status = ?, completed_at = ?, tokens_used = ?, cost_usd = ?, log = ? WHERE id = ?',
    ).run(status, completed_at, tokens_used, cost_usd, log, request.params.id);

    const run = db
      .prepare('SELECT * FROM agent_runs WHERE id = ?')
      .get(request.params.id) as AgentRun;
    broadcast('agent_runs', 'updated', request.params.id, run);
    return run;
  });
}
