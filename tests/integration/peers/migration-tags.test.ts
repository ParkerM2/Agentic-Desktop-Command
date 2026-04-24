import { describe, expect, it } from 'vitest';

import { loadMigrationTags } from '@main/features/peers/migration-tags';

describe('loadMigrationTags', () => {
  it('reads drizzle/meta/_journal.json and returns tags in idx order', () => {
    const tags = loadMigrationTags();
    // Phase 2 baseline has entries up through idx 27.
    expect(tags.length).toBeGreaterThanOrEqual(28);
    expect(tags[0]).toMatch(/^0000_/);
    expect(tags.at(-1)).toMatch(/^0027_workflow_runs_summary$/);
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
