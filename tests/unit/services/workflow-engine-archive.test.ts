import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { archiveArtifact } from '../../../src/main/features/workflow-engine/states/finalize';

const TEST_DIR = join(import.meta.dirname, '../../.test-tmp/workflow-archive');

describe('archiveArtifact', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'active'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'archive'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('moves file from active to archive directory', () => {
    const src = join(TEST_DIR, 'active', 'run-123.json');
    writeFileSync(src, '{"runId":"123"}');
    const archiveDir = join(TEST_DIR, 'archive');
    archiveArtifact(src, archiveDir);
    expect(existsSync(src)).toBe(false);
    expect(existsSync(join(archiveDir, 'run-123.json'))).toBe(true);
  });

  it('creates archive directory if it does not exist', () => {
    const src = join(TEST_DIR, 'active', 'run-456.json');
    writeFileSync(src, '{"runId":"456"}');
    const archiveDir = join(TEST_DIR, 'new-archive');
    archiveArtifact(src, archiveDir);
    expect(existsSync(join(archiveDir, 'run-456.json'))).toBe(true);
  });

  it('does nothing if source file does not exist', () => {
    const src = join(TEST_DIR, 'active', 'nonexistent.json');
    const archiveDir = join(TEST_DIR, 'archive');
    archiveArtifact(src, archiveDir);
    expect(existsSync(join(archiveDir, 'nonexistent.json'))).toBe(false);
  });
});
