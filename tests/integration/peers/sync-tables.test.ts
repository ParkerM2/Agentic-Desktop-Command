import { describe, expect, it } from 'vitest';

import { SYNC_TABLES, SYNC_TABLE_PK, isSyncTable } from '@shared/replication/sync-tables';

describe('SYNC_TABLES', () => {
  it('includes progress_tasks in phase 1', () => {
    expect(SYNC_TABLES).toContain('progress_tasks');
  });

  it('isSyncTable returns true for allowlisted tables', () => {
    expect(isSyncTable('progress_tasks')).toBe(true);
  });

  it('isSyncTable returns false for non-allowlisted tables', () => {
    expect(isSyncTable('bus_events')).toBe(false);
    expect(isSyncTable('sessions')).toBe(false);
    expect(isSyncTable('op_log')).toBe(false);
  });

  it('SYNC_TABLE_PK maps progress_tasks to slug', () => {
    expect(SYNC_TABLE_PK.progress_tasks).toBe('slug');
  });
});
