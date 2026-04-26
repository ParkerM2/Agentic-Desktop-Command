import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  isSyncTable,
  SYNC_TABLE_DEFS,
  SYNC_TABLE_PK,
  SYNC_TABLES,
  type SyncTable,
} from '@shared/replication/sync-tables';

/**
 * Audit reference: tmp/audit/03-replication.md H8, H9.
 *
 * These tests pin the column allowlist contents per sync table and the derived
 * structures (`SYNC_TABLES`, `SYNC_TABLE_PK`, `SyncTable`). If a contributor adds
 * a column to one of the underlying drizzle schemas they must update
 * `SYNC_TABLE_DEFS` in lockstep, otherwise replication of that column will
 * throw `peers: column X not in allowlist for Y`.
 */
describe('SYNC_TABLE_DEFS allowlist', () => {
  it('lists every sync table', () => {
    expect(SYNC_TABLES).toEqual(['progress_tasks', 'workflow_runs_summary', 'notes', 'ideas']);
  });

  it('derives SYNC_TABLE_PK from SYNC_TABLE_DEFS', () => {
    expect(SYNC_TABLE_PK).toEqual({
      progress_tasks: 'slug',
      workflow_runs_summary: 'id',
      notes: 'id',
      ideas: 'id',
    });
    for (const table of SYNC_TABLES) {
      expect(SYNC_TABLE_PK[table]).toBe(SYNC_TABLE_DEFS[table].pk);
    }
  });

  it('progress_tasks: full column set matches drizzle schema', () => {
    const cols = SYNC_TABLE_DEFS.progress_tasks.columns;
    for (const c of [
      'slug',
      'id',
      'project_id',
      'title',
      'status',
      'priority',
      'jira_key',
      'jira_url',
      'pr_url',
      'pr_number',
      'pr_status',
      'last_session_id',
      'last_agent_name',
      'completed_at',
      'archived_at',
      'team_name',
      'workflow',
      'workflow_phase',
      'session_history',
      'description',
      'created_at',
      'updated_at',
    ]) {
      expect(cols.has(c)).toBe(true);
    }
    expect(cols.has('definitely_not_a_real_column')).toBe(false);
  });

  it('workflow_runs_summary: column set matches drizzle schema', () => {
    const cols = SYNC_TABLE_DEFS.workflow_runs_summary.columns;
    for (const c of [
      'id',
      'project_id',
      'task_id',
      'workflow_id',
      'status',
      'started_at',
      'finished_at',
      'summary',
      'ran_on_peer_id',
    ]) {
      expect(cols.has(c)).toBe(true);
    }
    expect(cols.size).toBe(9);
  });

  it('notes: column set matches drizzle schema', () => {
    const cols = SYNC_TABLE_DEFS.notes.columns;
    for (const c of [
      'id',
      'title',
      'content',
      'tags',
      'project_id',
      'task_id',
      'pinned',
      'created_at',
      'updated_at',
    ]) {
      expect(cols.has(c)).toBe(true);
    }
    expect(cols.size).toBe(9);
  });

  it('ideas: column set matches drizzle schema', () => {
    const cols = SYNC_TABLE_DEFS.ideas.columns;
    for (const c of [
      'id',
      'title',
      'description',
      'status',
      'category',
      'tags',
      'project_id',
      'votes',
      'created_at',
      'updated_at',
    ]) {
      expect(cols.has(c)).toBe(true);
    }
    expect(cols.size).toBe(10);
  });

  it('every table.columns includes its own pk', () => {
    for (const table of SYNC_TABLES) {
      const def = SYNC_TABLE_DEFS[table];
      expect(def.columns.has(def.pk)).toBe(true);
    }
  });

  it('isSyncTable narrows correctly', () => {
    expect(isSyncTable('notes')).toBe(true);
    expect(isSyncTable('progress_tasks')).toBe(true);
    expect(isSyncTable('peer_state')).toBe(false);
    expect(isSyncTable('')).toBe(false);
  });

  it('SyncTable type is the union of allowed table names', () => {
    expectTypeOf<SyncTable>().toEqualTypeOf<
      'progress_tasks' | 'workflow_runs_summary' | 'notes' | 'ideas'
    >();
  });
});
