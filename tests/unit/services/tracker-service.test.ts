/**
 * Unit Tests for TrackerService
 *
 * Tests list, get, update methods for docs/tracker.json persistence.
 * Mocks node:fs with memfs.
 */

import { posix } from 'node:path';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import type { Volume } from 'memfs';

// ── Path Mocking ──────────────────────────────────────────────

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    join: original.posix.join,
  };
});

// ── File System Mocking ───────────────────────────────────────

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;

  return {
    default: fs,
    ...fs,
  };
});

const { createTrackerService } = await import(
  '@main/services/tracker/tracker-service'
);

// ── Helpers ───────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    const p = filePath.replace(/\\/g, '/');
    const dir = p.substring(0, p.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(p, content, { encoding: 'utf-8' });
  }
}

const PROJECT_ROOT = '/project';
const TRACKER_PATH = posix.join(PROJECT_ROOT, 'docs', 'tracker.json');

function makeTrackerFile(plans: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: 2,
    lastUpdated: '2026-04-01',
    plans,
  });
}

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Plan',
    status: 'DRAFT',
    planFile: null,
    created: '2026-04-01',
    statusChangedAt: '2026-04-01',
    branch: null,
    pr: null,
    tags: [],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('TrackerService', () => {
  beforeEach(() => {
    resetFs();
  });

  describe('list()', () => {
    it('returns default tracker when file does not exist', () => {
      const vol = getMockVol();
      vol.mkdirSync(posix.join(PROJECT_ROOT, 'docs'), { recursive: true });

      const service = createTrackerService(PROJECT_ROOT);
      const result = service.list();

      expect(result.version).toBe(2);
      expect(result.plans).toEqual({});
    });

    it('reads existing tracker file', () => {
      const plans = { 'plan-1': makePlan({ title: 'First Plan' }) };
      resetFs({ [TRACKER_PATH]: makeTrackerFile(plans) });

      const service = createTrackerService(PROJECT_ROOT);
      const result = service.list();

      expect(Object.keys(result.plans)).toHaveLength(1);
      expect(result.plans['plan-1']?.title).toBe('First Plan');
    });
  });

  describe('get()', () => {
    it('returns a plan by key', () => {
      const plans = { 'auth-feature': makePlan({ title: 'Auth Feature' }) };
      resetFs({ [TRACKER_PATH]: makeTrackerFile(plans) });

      const service = createTrackerService(PROJECT_ROOT);
      const plan = service.get('auth-feature');

      expect(plan).not.toBeNull();
      expect(plan!.title).toBe('Auth Feature');
    });

    it('returns null for nonexistent key', () => {
      resetFs({ [TRACKER_PATH]: makeTrackerFile({}) });

      const service = createTrackerService(PROJECT_ROOT);
      const plan = service.get('nonexistent');

      expect(plan).toBeNull();
    });
  });

  describe('update()', () => {
    it('updates status and sets statusChangedAt', () => {
      const plans = { 'plan-1': makePlan() };
      resetFs({ [TRACKER_PATH]: makeTrackerFile(plans) });

      const service = createTrackerService(PROJECT_ROOT);
      const updated = service.update('plan-1', { status: 'IN_PROGRESS' });

      expect(updated.status).toBe('IN_PROGRESS');
      expect(updated.statusChangedAt).toBeTruthy();
    });

    it('updates branch', () => {
      const plans = { 'plan-1': makePlan() };
      resetFs({ [TRACKER_PATH]: makeTrackerFile(plans) });

      const service = createTrackerService(PROJECT_ROOT);
      const updated = service.update('plan-1', { branch: 'feature/auth' });

      expect(updated.branch).toBe('feature/auth');
    });

    it('updates pr number', () => {
      const plans = { 'plan-1': makePlan() };
      resetFs({ [TRACKER_PATH]: makeTrackerFile(plans) });

      const service = createTrackerService(PROJECT_ROOT);
      const updated = service.update('plan-1', { pr: 42 });

      expect(updated.pr).toBe(42);
    });

    it('updates tags', () => {
      const plans = { 'plan-1': makePlan() };
      resetFs({ [TRACKER_PATH]: makeTrackerFile(plans) });

      const service = createTrackerService(PROJECT_ROOT);
      const updated = service.update('plan-1', { tags: ['auth', 'p0'] });

      expect(updated.tags).toEqual(['auth', 'p0']);
    });

    it('persists changes to disk', () => {
      const plans = { 'plan-1': makePlan() };
      resetFs({ [TRACKER_PATH]: makeTrackerFile(plans) });

      const service = createTrackerService(PROJECT_ROOT);
      service.update('plan-1', { status: 'IMPLEMENTED' });

      const vol = getMockVol();
      const raw = vol.readFileSync(TRACKER_PATH, 'utf-8') as string;
      const parsed = JSON.parse(raw) as { plans: Record<string, { status: string }> };
      expect(parsed.plans['plan-1']?.status).toBe('IMPLEMENTED');
    });

    it('throws for nonexistent key', () => {
      resetFs({ [TRACKER_PATH]: makeTrackerFile({}) });

      const service = createTrackerService(PROJECT_ROOT);

      expect(() => service.update('nonexistent', { status: 'DRAFT' })).toThrow(
        'not found',
      );
    });
  });
});
