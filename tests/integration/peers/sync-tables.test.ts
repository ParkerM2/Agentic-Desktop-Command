import { describe, expect, it } from 'vitest';

import { SYNC_TABLES, SYNC_TABLE_PK, isSyncTable } from '@shared/replication/sync-tables';

describe('SYNC_TABLES', () => {
  it('includes progress_tasks', () => {
    expect(SYNC_TABLES).toContain('progress_tasks');
  });

  it('includes workflow_runs_summary', () => {
    expect(SYNC_TABLES).toContain('workflow_runs_summary');
  });

  it('has exactly 2 entries in phase 2', () => {
    expect(SYNC_TABLES).toHaveLength(2);
  });

  it('isSyncTable returns true for allowlisted', () => {
    expect(isSyncTable('progress_tasks')).toBe(true);
    expect(isSyncTable('workflow_runs_summary')).toBe(true);
  });

  it('isSyncTable returns false for non-allowlisted', () => {
    expect(isSyncTable('bus_events')).toBe(false);
    expect(isSyncTable('sessions')).toBe(false);
    expect(isSyncTable('op_log')).toBe(false);
  });

  it('SYNC_TABLE_PK maps progress_tasks → slug', () => {
    expect(SYNC_TABLE_PK.progress_tasks).toBe('slug');
  });

  it('SYNC_TABLE_PK maps workflow_runs_summary → id', () => {
    expect(SYNC_TABLE_PK.workflow_runs_summary).toBe('id');
  });
});
