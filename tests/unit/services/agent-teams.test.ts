/**
 * Unit Tests for Agent Teams Reader
 *
 * Tests agent name parsing, file scope extraction, task file parsing,
 * progress directory scanning, and the full buildAgentTeamsData public API.
 * Mocks node:fs and node:path for memfs compatibility.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
} = await import('@main/services/visualization/agent-teams');

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

// ── Tests ──────────────────────────────────────────────────────────

describe('Agent Teams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetFs();
  });

  // ── agentNameToTaskNumber() ───────────────────────────────────

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

  // ── parseTaskFile() ───────────────────────────────────────────

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

    it('parses status from frontmatter', () => {
      const content = `---
taskNumber: 1
status: done
---

# Task #1: First Task
`;
      const result = parseTaskFile(content);
      expect(result.status).toBe('done');
    });

    it('extracts title from frontmatter when no heading present', () => {
      const content = `---
title: "My Task Title"
---

Some body content.
`;
      const result = parseTaskFile(content);
      expect(result.taskName).toBe('My Task Title');
    });
  });

  // ── buildAgentTeamsData() ─────────────────────────────────────

  describe('buildAgentTeamsData()', () => {
    it('returns hasTrackingDir: false when progress dir missing', () => {
      const result = buildAgentTeamsData('/project');
      expect(result.hasTrackingDir).toBe(false);
      expect(result.features).toEqual([]);
      expect(result.projectPath).toBe('/project');
    });

    it('returns hasTrackingDir: true with empty features for empty progress dir', () => {
      const vol = getMockVol();
      vol.mkdirSync('/project/progress', { recursive: true });

      const result = buildAgentTeamsData('/project');
      expect(result.hasTrackingDir).toBe(true);
      expect(result.features).toEqual([]);
    });

    it('discovers features from progress directories with root files', () => {
      resetFs({
        '/project/progress/my-feature/task.md': `---
title: My Feature
status: backlog
---

Feature description.
`,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features).toHaveLength(1);
      expect(result.features[0].feature).toBe('my-feature');
      expect(result.features[0].status).toBe('backlog');
      expect(result.features[0].tasks).toEqual([]);
    });

    it('skips archived directory', () => {
      resetFs({
        '/project/progress/active-feature/task.md': `---
title: Active
status: backlog
---
`,
        '/project/progress/archived/old-feature/task.md': `---
title: Old
status: done
---
`,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features).toHaveLength(1);
      expect(result.features[0].feature).toBe('active-feature');
    });

    it('creates single research agent node for researching status', () => {
      resetFs({
        '/project/progress/my-feature/task.md': `---
title: My Feature
status: researching
---
`,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].status).toBe('researching');
      expect(result.features[0].tasks).toHaveLength(1);
      expect(result.features[0].tasks[0].agentName).toBe('research-agent');
      expect(result.features[0].tasks[0].taskName).toBe('Research Agent');
      expect(result.features[0].tasks[0].status).toBe('active');
      expect(result.features[0].tasks[0].agentRole).toBe('research');
    });

    it('creates single completed research node for research_done status', () => {
      resetFs({
        '/project/progress/my-feature/task.md': `---
title: My Feature
status: research_done
---
`,
        '/project/progress/my-feature/research/research.md': 'Research results.',
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].status).toBe('research_done');
      expect(result.features[0].tasks).toHaveLength(1);
      expect(result.features[0].tasks[0].agentName).toBe('research-agent');
      expect(result.features[0].tasks[0].status).toBe('completed');
    });

    it('creates single planning agent node for planning status', () => {
      resetFs({
        '/project/progress/my-feature/task.md': `---
title: My Feature
status: planning
---
`,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].status).toBe('planning');
      expect(result.features[0].tasks).toHaveLength(1);
      expect(result.features[0].tasks[0].agentName).toBe('planning-agent');
      expect(result.features[0].tasks[0].taskName).toBe('Planning Agent');
      expect(result.features[0].tasks[0].status).toBe('active');
    });

    it('creates completed planning node for plan_ready status', () => {
      resetFs({
        '/project/progress/my-feature/task.md': `---
title: My Feature
status: plan_ready
---
`,
        '/project/progress/my-feature/plans/plan.md': 'The plan.',
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].status).toBe('plan_ready');
      expect(result.features[0].tasks).toHaveLength(1);
      expect(result.features[0].tasks[0].agentName).toBe('planning-agent');
      expect(result.features[0].tasks[0].status).toBe('completed');
    });

    it('reads task files for executing status', () => {
      const taskContent = `---
taskNumber: 2
agentRole: "service-engineer"
wave: 1
blockedBy: []
status: pending
---

# Task #2: Build Service

## Files to Modify
- src/main/services/foo.ts — the service
`;
      resetFs({
        '/project/progress/feat/task.md': `---
title: My Feature
status: executing
---
`,
        '/project/progress/feat/tasks/task-2-build-service.md': taskContent,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].status).toBe('executing');
      expect(result.features[0].tasks).toHaveLength(1);

      const task = result.features[0].tasks[0];
      expect(task.taskNumber).toBe(2);
      expect(task.taskName).toBe('Build Service');
      expect(task.agentRole).toBe('service-engineer');
      expect(task.wave).toBe(1);
      expect(task.fileScope).toContain('src/main/services/foo.ts');
      expect(task.status).toBe('pending');
    });

    it('marks all tasks completed when feature is done', () => {
      resetFs({
        '/project/progress/feat/task.md': `---
title: Done Feature
status: done
---
`,
        '/project/progress/feat/tasks/task-1-first.md': `---
taskNumber: 1
status: pending
---

# Task #1: First
`,
        '/project/progress/feat/tasks/task-2-second.md': `---
taskNumber: 2
status: pending
---

# Task #2: Second
`,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].status).toBe('done');
      expect(result.features[0].tasks).toHaveLength(2);
      expect(result.features[0].tasks[0].status).toBe('completed');
      expect(result.features[0].tasks[1].status).toBe('completed');
    });

    it('identifies guardian agents by name prefix', () => {
      resetFs({
        '/project/progress/feat/task.md': `---
title: Feature
status: executing
---
`,
        '/project/progress/feat/tasks/task-5-guardian-check.md': `---
taskNumber: 5
---

# Task #5: Guardian Check
`,
      });

      // The file is named "task-5-guardian-check.md" but guardian detection
      // uses the agentName which is the filename without .md
      const result = buildAgentTeamsData('/project');
      // agentName will be "task-5-guardian-check" — does not start with "guardian"
      expect(result.features[0].tasks[0].isGuardian).toBe(false);
    });

    it('identifies guardian agents by agentRole', () => {
      resetFs({
        '/project/progress/feat/task.md': `---
title: Feature
status: executing
---
`,
        '/project/progress/feat/tasks/task-5-qa.md': `---
taskNumber: 5
agentRole: codebase-guardian
---

# Task #5: QA Review
`,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].tasks[0].isGuardian).toBe(true);
    });

    it('reconciles status upward based on directory contents', () => {
      // Root file says backlog, but research exists
      resetFs({
        '/project/progress/feat/task.md': `---
title: Feature
status: backlog
---
`,
        '/project/progress/feat/research/research.md': 'Research done.',
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].status).toBe('research_done');
    });

    it('reconciles status to executing when task files exist', () => {
      resetFs({
        '/project/progress/feat/task.md': `---
title: Feature
status: backlog
---
`,
        '/project/progress/feat/tasks/task-1-first.md': `---
taskNumber: 1
---

# Task #1: First
`,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].status).toBe('executing');
    });

    it('handles directories without root files gracefully', () => {
      const vol = getMockVol();
      vol.mkdirSync('/project/progress/no-root-file', { recursive: true });

      const result = buildAgentTeamsData('/project');
      expect(result.features).toHaveLength(1);
      expect(result.features[0].feature).toBe('no-root-file');
      // Uses slug as title when no root file
      expect(result.features[0].status).toBe('backlog');
    });

    it('skips non-directory entries in progress', () => {
      resetFs({
        '/project/progress/index.md': '# Progress Index',
        '/project/progress/my-feature/task.md': `---
title: Feature
status: backlog
---
`,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features).toHaveLength(1);
      expect(result.features[0].feature).toBe('my-feature');
    });

    it('sets agentCount to match tasks length', () => {
      resetFs({
        '/project/progress/feat/task.md': `---
title: Feature
status: executing
---
`,
        '/project/progress/feat/tasks/task-1-a.md': `---
taskNumber: 1
---
`,
        '/project/progress/feat/tasks/task-2-b.md': `---
taskNumber: 2
---
`,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].agentCount).toBe(2);
      expect(result.features[0].tasks).toHaveLength(2);
    });

    it('sets branch to null and events to empty array', () => {
      resetFs({
        '/project/progress/feat/task.md': `---
title: Feature
status: backlog
---
`,
      });

      const result = buildAgentTeamsData('/project');
      expect(result.features[0].branch).toBeNull();
      expect(result.features[0].events).toEqual([]);
    });
  });
});
