import { describe, expect, it } from 'vitest';

import { loadMigrationTags } from '@main/db/migration-tags';

describe('loadMigrationTags', () => {
  it('reads drizzle/meta/_journal.json and returns tags in idx order', () => {
    const tags = loadMigrationTags();
    // Audit-fix sprint adds 0030_op_log_hlc_index on top of the Phase 2/3 baseline.
    expect(tags.length).toBeGreaterThanOrEqual(30);
    expect(tags[0]).toMatch(/^0000_/);
    expect(tags.at(-1)).toMatch(/^0030_op_log_hlc_index$/);
  });

  it('tags are strictly increasing by idx prefix', () => {
    const tags = loadMigrationTags();
    for (let i = 1; i < tags.length; i++) {
      const prevIdx = Number(tags[i - 1].slice(0, 4));
      const curIdx = Number(tags[i].slice(0, 4));
      expect(curIdx).toBeGreaterThan(prevIdx);
    }
  });
});
