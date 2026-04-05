/**
 * Unit Tests for Agent Teams Reader
 *
 * Tests agent name parsing, file scope extraction, task file parsing,
 * tracking index/manifest reading, JSONL event parsing, status derivation,
 * and the full buildAgentTeamsData public API.
 * Mocks node:fs and node:path for memfs compatibility.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

// ── Path Mocking ──────────────────────────────────────────────────

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    default: { ...original, join: original.posix.join },
    join: original.posix.join,
    resolve: original.posix.resolve,
    dirname: original.posix.dirname,
  };
});

// ── File System Mocking ────────────────────────────────────────────

vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  (globalThis as Record<string, unknown>).__mockVol = vol;
  (globalThis as Record<string, unknown>).__mockFs = fs;

  return {
    default: fs,
    ...fs,
  };
});

// Import after mocks are set up
const {
  agentNameToTaskNumber,
  extractFileScope,
  parseTaskFile,
  readTrackingIndex,
  readFeatureManifest,
  parseEventsJsonl,
  deriveAgentStatus,
  buildAgentTeamsData,
} = await import('@main/services/visualization/agent-teams');

// ── Helpers ─────────────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    const posixPath = filePath.replace(/\\/g, '/');
    const dir = posixPath.substring(0, posixPath.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(posixPath, content, { encoding: 'utf-8' });
  }
}

// ── Tests ──────────────────────────────────────────���────────────────

describe('Agent Teams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetFs();
  });

  // ── agentNameToTaskNumber() ────────────────────────────────���──

  describe('agentNameToTaskNumber()', () => {
    it('extracts task number from agent name', () => {
      expect(agentNameToTaskNumber('coder-task-1')).toBe(1);
      expect(agentNameToTaskNumber('qa-task-12')).toBe(12);
    });

    it('returns null for names without task number', () => {
      expect(agentNameToTaskNumber('guardian')).toBeNull();
      expect(agentNameToTaskNumber('team-lead')).toBeNull();
    });

    it('extracts first task match', () => {
      expect(agentNameToTaskNumber('coder-task-3-qa')).toBe(3);
    });
  });

  // ── extractFileScope() ────────────────────────────────────────

  describe('extractFileScope()', () => {
    it('extracts files from Files to Modify section', () => {
      const content = `## Files to Modify
- src/main/index.ts — main entry
- src/shared/types.ts -- shared types

## Other Section
`;
      const result = extractFileScope(content);
      expect(result).toContain('src/main/index.ts');
      expect(result).toContain('src/shared/types.ts');
    });

    it('extracts files from Files to Create section', () => {
      const content = `## Files to Create
- src/new-file.ts — new file
`;
      const result = extractFileScope(content);
      expect(result).toContain('src/new-file.ts');
    });

    it('deduplicates file paths', () => {
      const content = `## Files to Modify
- src/main/index.ts — entry
## Files to Create
- src/main/index.ts — also here
`;
      const result = extractFileScope(content);
      expect(result.filter((f) => f === 'src/main/index.ts')).toHaveLength(1);
    });

    it('returns empty array when no file sections found', () => {
      const content = `## Description
Some text here.
`;
      expect(extractFileScope(content)).toEqual([]);
    });

    it('skips lines without file extension', () => {
      const content = `## Files to Modify
- src/main/index.ts — entry
- just-a-directory — not a file
`;
      const result = extractFileScope(content);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('src/main/index.ts');
    });

    it('skips non-list lines', () => {
      const content = `## Files to Modify
Some description text
- src/main/index.ts — entry
`;
      const result = extractFileScope(content);
      expect(result).toHaveLength(1);
    });
  });

  // ── parseTaskFile() ──────────────────────────────────���────────

  describe('parseTaskFile()', () => {
    it('parses full frontmatter and heading', () => {
      const content = `---
taskNumber: 3
agentRole: "component-engineer"
wave: 2
blockedBy: [1, 2]
---

# Task #3: Build the Dashboard

## Files to Modify
- src/renderer/features/dashboard/index.ts — barrel
`;
      const result = parseTaskFile(content);
      expect(result.taskNumber).toBe(3);
      expect(result.agentRole).toBe('component-engineer');
      expect(result.wave).toBe(2);
      expect(result.blockedBy).toEqual([1, 2]);
      expect(result.taskName).toBe('Build the Dashboard');
      expect(result.fileScope).toContain('src/renderer/features/dashboard/index.ts');
    });

    it('returns nulls for missing frontmatter', () => {
      const content = `# Just a heading

Some content.
`;
      const result = parseTaskFile(content);
      expect(result.taskNumber).toBeNull();
      expect(result.agentRole).toBeNull();
      expect(result.wave).toBeNull();
      expect(result.blockedBy).toEqual([]);
      expect(result.taskName).toBeNull();
    });

    it('parses empty blockedBy', () => {
      const content = `---
taskNumber: 1
blockedBy: []
---

# Task #1: First Task
`;
      const result = parseTaskFile(content);
      expect(result.blockedBy).toEqual([]);
    });

    it('parses agentRole without quotes', () => {
      const content = `---
agentRole: service-engineer
---
`;
      const result = parseTaskFile(content);
      expect(result.agentRole).toBe('service-engineer');
    });
  });

  // ── readTrackingIndex() ────────────────────────────────��──────

  describe('readTrackingIndex()', () => {
    it('returns null when index.json does not exist', () => {
      expect(readTrackingIndex('/project')).toBeNull();
    });

    it('reads and parses index.json', () => {
      const indexData = {
        features: [
          { feature: 'my-feature', status: 'active', branch: 'feature/my-feature', agentCount: 3 },
        ],
      };
      resetFs({
        '/project/tracking/index.json': JSON.stringify(indexData),
      });
      const result = readTrackingIndex('/project');
      expect(result).not.toBeNull();
      expect(result!.features).toHaveLength(1);
      expect(result!.features[0].feature).toBe('my-feature');
    });

    it('returns null for malformed JSON', () => {
      resetFs({
        '/project/tracking/index.json': 'not json',
      });
      expect(readTrackingIndex('/project')).toBeNull();
    });
  });

  // ── readFeatureManifest() ─────────────────────────────────────

  describe('readFeatureManifest()', () => {
    it('returns null when manifest does not exist', () => {
      expect(readFeatureManifest('/project', 'my-feature')).toBeNull();
    });

    it('reads and parses manifest.json', () => {
      const manifest = {
        feature: 'my-feature',
        agents: {
          'coder-task-1': { status: 'running' },
          'qa-task-1': { status: 'pending' },
        },
      };
      resetFs({
        '/project/tracking/my-feature/manifest.json': JSON.stringify(manifest),
      });
      const result = readFeatureManifest('/project', 'my-feature');
      expect(result).not.toBeNull();
      expect(Object.keys(result!.agents)).toHaveLength(2);
    });

    it('returns null for malformed JSON', () => {
      resetFs({
        '/project/tracking/my-feature/manifest.json': '{bad',
      });
      expect(readFeatureManifest('/project', 'my-feature')).toBeNull();
    });
  });

  // ── parseEventsJsonl() ────────────────────────────────────────

  describe('parseEventsJsonl()', () => {
    it('returns empty array for non-existent file', () => {
      expect(parseEventsJsonl('/nonexistent.jsonl')).toEqual([]);
    });

    it('returns empty array for empty file', () => {
      resetFs({ '/events.jsonl': '' });
      expect(parseEventsJsonl('/events.jsonl')).toEqual([]);
    });

    it('parses JSONL lines', () => {
      const lines = [
        JSON.stringify({ ts: '2026-01-01T00:00:00Z', type: 'agent_start', agent: 'coder-task-1', sid: 'sid1', data: {} }),
        JSON.stringify({ ts: '2026-01-01T00:01:00Z', type: 'tool_call', agent: null, sid: 'sid1', data: { tool: 'bash' } }),
      ];
      resetFs({ '/events.jsonl': lines.join('\n') + '\n' });

      const result = parseEventsJsonl('/events.jsonl');
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('agent_start');
      expect(result[1].type).toBe('tool_call');
    });

    it('skips malformed lines', () => {
      const lines = [
        JSON.stringify({ ts: '2026-01-01', type: 'start', agent: null, sid: 's1', data: {} }),
        'not valid json',
        JSON.stringify({ ts: '2026-01-02', type: 'end', agent: null, sid: 's1', data: {} }),
      ];
      resetFs({ '/events.jsonl': lines.join('\n') + '\n' });

      const result = parseEventsJsonl('/events.jsonl');
      expect(result).toHaveLength(2);
    });
  });

  // ── deriveAgentStatus() ───────────────────────────────────────

  describe('deriveAgentStatus()', () => {
    it('returns pending for empty events', () => {
      expect(deriveAgentStatus([])).toBe('pending');
    });

    it('returns active when last idle event is recent', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      const events = [
        { ts: new Date(now - 60_000).toISOString(), type: 'agent.idle', sid: 's1' },
      ];
      expect(deriveAgentStatus(events)).toBe('active');
    });

    it('returns idle when last idle event is old', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      const events = [
        { ts: new Date(now - 300_000).toISOString(), type: 'agent.idle', sid: 's1' },
      ];
      expect(deriveAgentStatus(events)).toBe('idle');
    });

    it('returns completed for agent.completed event', () => {
      const events = [
        { ts: '2026-01-01T00:00:00Z', type: 'agent.completed', sid: 's1' },
      ];
      expect(deriveAgentStatus(events)).toBe('completed');
    });

    it('returns completed for task.completed event', () => {
      const events = [
        { ts: '2026-01-01T00:00:00Z', type: 'task.completed', sid: 's1' },
      ];
      expect(deriveAgentStatus(events)).toBe('completed');
    });

    it('returns error for agent.error event', () => {
      const events = [
        { ts: '2026-01-01T00:00:00Z', type: 'agent.error', sid: 's1' },
      ];
      expect(deriveAgentStatus(events)).toBe('error');
    });

    it('returns pending for unknown last event type', () => {
      const events = [
        { ts: '2026-01-01T00:00:00Z', type: 'agent.start', sid: 's1' },
      ];
      expect(deriveAgentStatus(events)).toBe('pending');
    });

    it('uses the last idle event, not just the last event', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      // idle event is recent, but there's a later non-idle event
      const events = [
        { ts: new Date(now - 30_000).toISOString(), type: 'agent.idle', sid: 's1' },
        { ts: new Date(now - 10_000).toISOString(), type: 'tool_call', sid: 's1' },
      ];
      // The idle event is found by scanning backward, and it's recent
      expect(deriveAgentStatus(events)).toBe('active');
    });
  });

  // ── buildAgentTeamsData() ─────────────────────────────────────

  describe('buildAgentTeamsData()', () => {
    it('returns hasTrackingDir: false when tracking dir missing', () => {
      const result = buildAgentTeamsData('/project');
      expect(result.hasTrackingDir).toBe(false);
      expect(result.features).toEqual([]);
      expect(result.projectPath).toBe('/project');
    });

    it('returns hasTrackingDir: true with empty features when no index', () => {
      const vol = getMockVol();
      vol.mkdirSync('/project/tracking', { recursive: true });

      const result = buildAgentTeamsData('/project');
      expect(result.hasTrackingDir).toBe(true);
      expect(result.features).toEqual([]);
    });

    it('builds feature data from tracking index and manifest', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const index = {
        features: [
          { feature: 'my-feature', status: 'active', branch: 'feature/my-feature', agentCount: 1 },
        ],
      };
      const manifest = {
        feature: 'my-feature',
        agents: {
          'coder-task-1': { status: 'running' },
        },
      };

      const agentEvent = JSON.stringify({
        ts: new Date(now - 10_000).toISOString(),
        type: 'agent.idle',
        sid: 'sid-abc',
      });

      resetFs({
        '/project/tracking/index.json': JSON.stringify(index),
        '/project/tracking/my-feature/manifest.json': JSON.stringify(manifest),
        '/project/tracking/my-feature/events.jsonl': '',
        '/project/tracking/my-feature/agents/coder-task-1.jsonl': agentEvent + '\n',
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features).toHaveLength(1);
      expect(result.features[0].feature).toBe('my-feature');
      expect(result.features[0].status).toBe('active');
      expect(result.features[0].branch).toBe('feature/my-feature');
      expect(result.features[0].tasks).toHaveLength(1);
      expect(result.features[0].tasks[0].agentName).toBe('coder-task-1');
      expect(result.features[0].tasks[0].taskNumber).toBe(1);
      expect(result.features[0].tasks[0].status).toBe('active');
      expect(result.features[0].tasks[0].lastSid).toBe('sid-abc');
    });

    it('identifies guardian agents', () => {
      const index = {
        features: [
          { feature: 'feat', status: 'active', branch: null, agentCount: 1 },
        ],
      };
      const manifest = {
        feature: 'feat',
        agents: {
          'guardian-task-5': { status: 'pending' },
        },
      };
      resetFs({
        '/project/tracking/index.json': JSON.stringify(index),
        '/project/tracking/feat/manifest.json': JSON.stringify(manifest),
        '/project/tracking/feat/events.jsonl': '',
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].tasks[0].isGuardian).toBe(true);
    });

    it('reads task file metadata when available', () => {
      const index = {
        features: [
          { feature: 'feat', status: 'active', branch: null, agentCount: 1 },
        ],
      };
      const manifest = {
        feature: 'feat',
        agents: {
          'coder-task-2': { status: 'running' },
        },
      };
      const taskContent = `---
taskNumber: 2
agentRole: "service-engineer"
wave: 1
blockedBy: []
---

# Task #2: Build Service

## Files to Modify
- src/main/services/foo.ts — the service
`;
      resetFs({
        '/project/tracking/index.json': JSON.stringify(index),
        '/project/tracking/feat/manifest.json': JSON.stringify(manifest),
        '/project/tracking/feat/events.jsonl': '',
        '/project/progress/feat/tasks/task-2.md': taskContent,
      });

      const result = buildAgentTeamsData('/project');
      const task = result.features[0].tasks[0];
      expect(task.taskName).toBe('Build Service');
      expect(task.agentRole).toBe('service-engineer');
      expect(task.wave).toBe(1);
      expect(task.fileScope).toContain('src/main/services/foo.ts');
    });

    it('gracefully handles features that fail to load', () => {
      // Create an index with a feature that has no manifest (will work gracefully)
      const index = {
        features: [
          { feature: 'good-feat', status: 'active', branch: null, agentCount: 0 },
        ],
      };
      resetFs({
        '/project/tracking/index.json': JSON.stringify(index),
        '/project/tracking/good-feat/events.jsonl': '',
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features).toHaveLength(1);
      expect(result.features[0].tasks).toEqual([]);
    });
  });
});
