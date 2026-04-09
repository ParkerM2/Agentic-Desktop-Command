/**
 * Unit Tests for Agent Teams Reader
 *
 * Tests agent name parsing, file scope extraction, task file parsing,
 * progress directory scanning, and the full buildAgentTeamsData public API.
 * Mocks node:fs for memfs compatibility.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentManagerService } from '@main/services/agent-manager/agent-manager-service';

import type { Volume } from 'memfs';

// ── Path Mocking ──────────────────────────────────────────────────

vi.mock('node:path', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
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
  buildAgentTeamsData,
} = await import('@main/features/visualization/agent-teams');

// ── Helpers ─────────────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [filePath, content] of Object.entries(files)) {
    const posixPath = filePath.replaceAll('\\', '/');
    const dir = posixPath.substring(0, posixPath.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(posixPath, content, { encoding: 'utf-8' });
  }
}

/** Create a minimal mock AgentManagerService */
function makeMockAgentManager(
  sessions: Array<{ id: string; name: string; status: string; lastActivityAt: string }> = [],
): AgentManagerService {
  return {
    listSessions: vi.fn(() => sessions as ReturnType<AgentManagerService['listSessions']>),
    spawnProjectOwner: vi.fn(),
    spawnTeamLead: vi.fn(),
    getSession: vi.fn(),
    sendMessage: vi.fn().mockReturnValue(false),
    stopSession: vi.fn().mockReturnValue(false),
    onEvent: vi.fn().mockReturnValue(() => { /* no-op unsubscribe */ }),
    getSessionProjectPath: vi.fn(),
    getMessages: vi.fn().mockReturnValue([]),
    dispose: vi.fn(),
  } as unknown as AgentManagerService;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Agent Teams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetFs();
  });

  // ── agentNameToTaskNumber() ────────────────────────────────────

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

  // ── parseTaskFile() ──────────────────────────────────────────

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

  // ── buildAgentTeamsData() ─────────────────────────────────────

  describe('buildAgentTeamsData()', () => {
    it('returns hasTrackingDir: false when progress dir missing', () => {
      const agentManager = makeMockAgentManager();
      const result = buildAgentTeamsData('/project', agentManager);
      expect(result.hasTrackingDir).toBe(false);
      expect(result.features).toEqual([]);
      expect(result.projectPath).toBe('/project');
    });

    it('returns hasTrackingDir: true with empty features when progress dir is empty', () => {
      const vol = getMockVol();
      vol.mkdirSync('/project/progress', { recursive: true });

      const agentManager = makeMockAgentManager();
      const result = buildAgentTeamsData('/project', agentManager);
      expect(result.hasTrackingDir).toBe(true);
      expect(result.features).toEqual([]);
    });

    it('skips backlog features (not in active pipeline)', () => {
      resetFs({
        '/project/progress/my-feature/task.md': `---
title: My Feature
status: backlog
---
`,
      });

      const agentManager = makeMockAgentManager();
      const result = buildAgentTeamsData('/project', agentManager);
      expect(result.features).toHaveLength(0);
    });

    it('builds researching feature with single Research Agent node', () => {
      const now = new Date().toISOString();
      resetFs({
        '/project/progress/my-feature/task.md': `---
title: My Feature
status: researching
---
`,
      });

      const sessions = [
        { id: 'sess-001', name: 'progress-research-my-feature', status: 'running', lastActivityAt: now },
      ];
      const agentManager = makeMockAgentManager(sessions);
      const result = buildAgentTeamsData('/project', agentManager);

      expect(result.features).toHaveLength(1);
      expect(result.features[0].feature).toBe('my-feature');
      expect(result.features[0].status).toBe('researching');
      expect(result.features[0].tasks).toHaveLength(1);
      expect(result.features[0].tasks[0].taskName).toBe('Research Agent');
      expect(result.features[0].tasks[0].status).toBe('active');
      expect(result.features[0].tasks[0].lastSid).toBe('sess-001');
    });

    it('builds planning feature with single Planning Agent node', () => {
      const now = new Date().toISOString();
      resetFs({
        '/project/progress/my-feature/task.md': `---
title: My Feature
status: planning
---
`,
      });

      const sessions = [
        { id: 'sess-002', name: 'progress-plan-my-feature', status: 'idle', lastActivityAt: now },
      ];
      const agentManager = makeMockAgentManager(sessions);
      const result = buildAgentTeamsData('/project', agentManager);

      expect(result.features[0].tasks[0].taskName).toBe('Planning Agent');
      expect(result.features[0].tasks[0].status).toBe('idle');
    });

    it('builds research_done feature with completed node (dimmed)', () => {
      resetFs({
        '/project/progress/my-feature/task.md': `---
title: My Feature
status: research_done
---
`,
      });

      const agentManager = makeMockAgentManager();
      const result = buildAgentTeamsData('/project', agentManager);

      expect(result.features[0].tasks[0].taskName).toBe('Research Agent');
      expect(result.features[0].tasks[0].status).toBe('completed');
    });

    it('builds executing feature with AgentTask children from task files', () => {
      const taskContent = `---
taskNumber: 1
agentRole: "component-engineer"
wave: 1
blockedBy: []
---

# Task #1: Build Component

## Files to Modify
- src/renderer/features/foo/index.ts — barrel
`;
      resetFs({
        '/project/progress/my-feature/task.md': `---
title: My Feature
status: executing
---
`,
        '/project/progress/my-feature/tasks/task-1.md': taskContent,
      });

      const agentManager = makeMockAgentManager();
      const result = buildAgentTeamsData('/project', agentManager);

      expect(result.features[0].tasks).toHaveLength(1);
      expect(result.features[0].tasks[0].taskName).toBe('Build Component');
      expect(result.features[0].tasks[0].agentRole).toBe('component-engineer');
      expect(result.features[0].tasks[0].fileScope).toContain('src/renderer/features/foo/index.ts');
      expect(result.features[0].tasks[0].status).toBe('pending');
    });

    it('sets task status to active when matching live session exists', () => {
      const now = new Date().toISOString();
      resetFs({
        '/project/progress/feat/task.md': `---
title: Feat
status: executing
---
`,
        '/project/progress/feat/tasks/task-2.md': `---
taskNumber: 2
agentRole: service-engineer
wave: 1
blockedBy: []
---

# Task #2: Build Service
`,
      });

      const sessions = [
        { id: 'sess-099', name: 'progress-task-2-feat', status: 'running', lastActivityAt: now },
      ];
      const agentManager = makeMockAgentManager(sessions);
      const result = buildAgentTeamsData('/project', agentManager);

      expect(result.features[0].tasks[0].status).toBe('active');
      expect(result.features[0].tasks[0].lastSid).toBe('sess-099');
    });

    it('builds done feature with all agents completed', () => {
      resetFs({
        '/project/progress/finished/task.md': `---
title: Finished Feature
status: done
---
`,
        '/project/progress/finished/tasks/task-1.md': `---
taskNumber: 1
agentRole: engineer
wave: 1
blockedBy: []
---

# Task #1: Implement
`,
        '/project/progress/finished/tasks/task-2.md': `---
taskNumber: 2
agentRole: qa
wave: 1
blockedBy: [1]
---

# Task #2: QA
`,
      });

      const agentManager = makeMockAgentManager();
      const result = buildAgentTeamsData('/project', agentManager);

      expect(result.features[0].tasks).toHaveLength(2);
      expect(result.features[0].tasks[0].status).toBe('completed');
      expect(result.features[0].tasks[1].status).toBe('completed');
    });

    it('identifies guardian agents', () => {
      resetFs({
        '/project/progress/feat/task.md': `---
title: Feat
status: executing
---
`,
        '/project/progress/feat/tasks/task-5.md': `---
taskNumber: 5
agentRole: codebase-guardian
wave: 2
blockedBy: [1]
---

# Task #5: Guardian Review
`,
      });

      const agentManager = makeMockAgentManager();
      const result = buildAgentTeamsData('/project', agentManager);

      expect(result.features[0].tasks[0].isGuardian).toBe(true);
    });

    it('skips archived subdirectory in progress/', () => {
      resetFs({
        '/project/progress/active-feat/task.md': `---
title: Active
status: researching
---
`,
        '/project/progress/archived/old-feat/task.md': `---
title: Old
status: done
---
`,
      });

      const agentManager = makeMockAgentManager();
      const result = buildAgentTeamsData('/project', agentManager);

      // archived/ directory itself is skipped; old-feat inside it is not a direct child of progress/
      const slugs = result.features.map((f) => f.feature);
      expect(slugs).not.toContain('archived');
      expect(slugs).not.toContain('old-feat');
    });

    it('gracefully handles features with no root file', () => {
      const vol = getMockVol();
      // Create a directory with no task.md / description.md / ticket.md
      vol.mkdirSync('/project/progress/empty-feat', { recursive: true });
      // Also create a researching feature that will appear
      resetFs({
        '/project/progress/researching-feat/task.md': `---
title: Researching
status: researching
---
`,
      });

      const agentManager = makeMockAgentManager();
      const result = buildAgentTeamsData('/project', agentManager);
      // empty-feat has no root file → title falls back to slug, status falls back to 'backlog' → skipped
      const slugs = result.features.map((f) => f.feature);
      expect(slugs).not.toContain('empty-feat');
      expect(slugs).toContain('researching-feat');
    });
  });
});
