/**
 * Unit Tests for WorkflowTemplate Service
 *
 * Tests scanArtifacts and writeArtifact methods.
 * Mocks node:fs with memfs for filesystem isolation.
 */

import { posix } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Volume } from 'memfs';

// ── Path Mocking (use posix.join for memfs compatibility on Windows) ──

vi.mock('node:path', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:path')>();
  return {
    ...original,
    join: original.posix.join,
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

// ── Imports (must come after vi.mock calls) ───────────────────────

import { createWorkflowTemplateService } from '../../../src/main/features/workflow/templates/workflow-template-service';

// ── Helpers ───────────────────────────────────────────────────────

function getVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function setupMockClaudeDir(projectPath: string): void {
  const vol = getVol();

  // Create skill directories
  vol.mkdirSync(`${projectPath}/.claude/skills/my-skill`, { recursive: true });
  vol.mkdirSync(`${projectPath}/.claude/skills/another-skill`, { recursive: true });

  // Create command directories
  vol.mkdirSync(`${projectPath}/.claude/commands/deploy`, { recursive: true });

  // Create agent files
  vol.mkdirSync(`${projectPath}/.claude/agents`, { recursive: true });
  vol.writeFileSync(`${projectPath}/.claude/agents/schema-designer.md`, '# Schema Designer');
  vol.writeFileSync(`${projectPath}/.claude/agents/component-engineer.md`, '# Component Engineer');
}

// ── Test Suite ────────────────────────────────────────────────────

describe('WorkflowTemplateService', () => {
  const dataDir = '/tmp/test-data';

  beforeEach(() => {
    const vol = getVol();
    vol.reset();
    vol.mkdirSync(dataDir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scanArtifacts', () => {
    it('finds skills, commands, and agents in a .claude directory', () => {
      const projectPath = '/test-project';
      setupMockClaudeDir(projectPath);

      const service = createWorkflowTemplateService({ dataDir });
      const result = service.scanArtifacts(projectPath);

      // Should find 2 skills
      const skills = result.filter((a) => a.type === 'skill');
      expect(skills).toHaveLength(2);
      expect(skills.map((s) => s.name).sort()).toEqual(['another-skill', 'my-skill']);

      // Should find 1 command
      const commands = result.filter((a) => a.type === 'command');
      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('deploy');

      // Should find 2 agents
      const agents = result.filter((a) => a.type === 'agent');
      expect(agents).toHaveLength(2);
      expect(agents.map((a) => a.name).sort()).toEqual(['component-engineer', 'schema-designer']);
    });

    it('returns empty array when .claude does not exist', () => {
      const service = createWorkflowTemplateService({ dataDir });
      const result = service.scanArtifacts('/nonexistent-project');

      expect(result).toEqual([]);
    });

    it('returns empty array when .claude exists but subdirectories do not', () => {
      const vol = getVol();
      vol.mkdirSync('/empty-project/.claude', { recursive: true });

      const service = createWorkflowTemplateService({ dataDir });
      const result = service.scanArtifacts('/empty-project');

      expect(result).toEqual([]);
    });
  });

  describe('writeArtifact', () => {
    it('writes a skill file to .claude/skills/{name}/skill.md', () => {
      const vol = getVol();
      const projectPath = '/test-project';
      vol.mkdirSync(projectPath, { recursive: true });

      const service = createWorkflowTemplateService({ dataDir });
      const result = service.writeArtifact(projectPath, 'skill', 'my-new-skill', '# My Skill');

      expect(result.path).toBe(`${projectPath}/.claude/skills/my-new-skill/skill.md`);
      expect(vol.readFileSync(result.path, 'utf-8')).toBe('# My Skill');
    });

    it('writes an agent file to .claude/agents/{name}.md', () => {
      const vol = getVol();
      const projectPath = '/test-project';
      vol.mkdirSync(projectPath, { recursive: true });

      const service = createWorkflowTemplateService({ dataDir });
      const result = service.writeArtifact(projectPath, 'agent', 'my-agent', '# My Agent');

      expect(result.path).toBe(`${projectPath}/.claude/agents/my-agent.md`);
      expect(vol.readFileSync(result.path, 'utf-8')).toBe('# My Agent');
    });

    it('writes a command file to .claude/commands/{name}/command.md', () => {
      const vol = getVol();
      const projectPath = '/test-project';
      vol.mkdirSync(projectPath, { recursive: true });

      const service = createWorkflowTemplateService({ dataDir });
      const result = service.writeArtifact(projectPath, 'command', 'deploy', '# Deploy');

      expect(result.path).toBe(`${projectPath}/.claude/commands/deploy/command.md`);
      expect(vol.readFileSync(result.path, 'utf-8')).toBe('# Deploy');
    });

    it('creates directories if they do not exist', () => {
      const vol = getVol();
      const projectPath = '/fresh-project';
      // Don't create any dirs — the service should create them

      const service = createWorkflowTemplateService({ dataDir });
      const result = service.writeArtifact(projectPath, 'skill', 'brand-new', '# Brand New');

      expect(result.path).toBe(`${projectPath}/.claude/skills/brand-new/skill.md`);
      expect(vol.readFileSync(result.path, 'utf-8')).toBe('# Brand New');
    });
  });
});
