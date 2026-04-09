/**
 * WorkflowTemplate Service
 *
 * File-based CRUD for workflow templates.
 *
 * Storage layout:
 *   - Builtin templates: seeded from DEFAULT_TEMPLATES (in-memory, not written to disk)
 *   - User templates (project-level): <projectPath>/.claude/templates/<id>.json
 *   - User templates (app-level):     <userData>/templates/<id>.json
 *
 * On each read, templates are loaded from disk and validated with Zod.
 * Builtin templates are always prepended and cannot be mutated or deleted.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { WorkflowTemplateSchema } from '@shared/ipc/workflow-templates';
import type { PluginArtifact, WorkflowTemplate } from '@shared/ipc/workflow-templates';

import { DEFAULT_TEMPLATES } from './default-templates';

export interface WorkflowTemplateService {
  list: () => WorkflowTemplate[];
  get: (id: string) => WorkflowTemplate;
  create: (data: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltin'>) => WorkflowTemplate;
  update: (
    id: string,
    updates: Partial<Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltin'>>,
  ) => WorkflowTemplate;
  delete: (id: string) => { success: boolean };
  duplicate: (id: string, name?: string) => WorkflowTemplate;
  scanArtifacts: (projectPath: string) => PluginArtifact[];
  writeArtifact: (projectPath: string, type: string, name: string, content: string) => { path: string };
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadTemplateFile(filePath: string): WorkflowTemplate | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    const result = WorkflowTemplateSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return null;
  } catch {
    return null;
  }
}

function saveTemplateFile(dir: string, template: WorkflowTemplate): void {
  ensureDir(dir);
  const filePath = join(dir, `${template.id}.json`);
  writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
}

function loadAllFromDir(dir: string): WorkflowTemplate[] {
  if (!existsSync(dir)) {
    return [];
  }

  const results: WorkflowTemplate[] = [];

  try {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const template = loadTemplateFile(join(dir, file));
      if (template !== null) {
        results.push(template);
      }
    }
  } catch {
    // Directory read error — return what we have
  }

  return results;
}

function scanDirEntries(
  dir: string,
  type: PluginArtifact['type'],
  filter: 'directories' | 'md-files',
): PluginArtifact[] {
  if (!existsSync(dir)) {
    return [];
  }
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const results: PluginArtifact[] = [];
    for (const entry of entries) {
      if (filter === 'directories' && entry.isDirectory()) {
        results.push({ name: entry.name, type, path: join(dir, entry.name) });
      }
      if (filter === 'md-files' && entry.isFile() && entry.name.endsWith('.md')) {
        results.push({ name: entry.name.replace(/\.md$/, ''), type, path: join(dir, entry.name) });
      }
    }
    return results;
  } catch {
    return [];
  }
}

export function createWorkflowTemplateService(deps: { dataDir: string }): WorkflowTemplateService {
  const userTemplatesDir = join(deps.dataDir, 'templates');

  function allTemplates(): WorkflowTemplate[] {
    const userTemplates = loadAllFromDir(userTemplatesDir);
    return [...DEFAULT_TEMPLATES, ...userTemplates];
  }

  function findById(id: string): WorkflowTemplate | undefined {
    return allTemplates().find((t) => t.id === id);
  }

  return {
    list() {
      return allTemplates();
    },

    get(id) {
      const template = findById(id);
      if (template === undefined) {
        throw new Error(`WorkflowTemplate not found: ${id}`);
      }
      return template;
    },

    create(data) {
      const now = new Date().toISOString();
      const template: WorkflowTemplate = {
        ...data,
        id: randomUUID(),
        isBuiltin: false,
        createdAt: now,
        updatedAt: now,
      };
      saveTemplateFile(userTemplatesDir, template);
      return template;
    },

    update(id, updates) {
      const existing = findById(id);
      if (existing === undefined) {
        throw new Error(`WorkflowTemplate not found: ${id}`);
      }
      if (existing.isBuiltin) {
        throw new Error(`Cannot modify builtin template: ${id}`);
      }
      const updated: WorkflowTemplate = {
        ...existing,
        ...updates,
        id: existing.id,
        isBuiltin: false,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      saveTemplateFile(userTemplatesDir, updated);
      return updated;
    },

    delete(id) {
      const existing = findById(id);
      if (existing === undefined) {
        return { success: false };
      }
      if (existing.isBuiltin) {
        throw new Error(`Cannot delete builtin template: ${id}`);
      }
      const filePath = join(userTemplatesDir, `${id}.json`);
      if (existsSync(filePath)) {
        rmSync(filePath);
      }
      return { success: true };
    },

    duplicate(id, name) {
      const source = findById(id);
      if (source === undefined) {
        throw new Error(`WorkflowTemplate not found: ${id}`);
      }
      const now = new Date().toISOString();
      const duplicated: WorkflowTemplate = {
        ...source,
        id: randomUUID(),
        name: name ?? `${source.name} (copy)`,
        isBuiltin: false,
        createdAt: now,
        updatedAt: now,
      };
      saveTemplateFile(userTemplatesDir, duplicated);
      return duplicated;
    },

    scanArtifacts(projectPath) {
      const claudeDir = join(projectPath, '.claude');
      if (!existsSync(claudeDir)) {
        return [];
      }

      return [
        ...scanDirEntries(join(claudeDir, 'skills'), 'skill', 'directories'),
        ...scanDirEntries(join(claudeDir, 'commands'), 'command', 'directories'),
        ...scanDirEntries(join(claudeDir, 'agents'), 'agent', 'md-files'),
      ];
    },

    writeArtifact(projectPath, type, name, content) {
      let targetPath: string;

      switch (type) {
        case 'agent': {
          const agentsDir = join(projectPath, '.claude', 'agents');
          ensureDir(agentsDir);
          targetPath = join(agentsDir, `${name}.md`);
          break;
        }
        case 'skill': {
          const skillDir = join(projectPath, '.claude', 'skills', name);
          ensureDir(skillDir);
          targetPath = join(skillDir, 'skill.md');
          break;
        }
        case 'command': {
          const commandDir = join(projectPath, '.claude', 'commands', name);
          ensureDir(commandDir);
          targetPath = join(commandDir, 'command.md');
          break;
        }
        default: {
          throw new Error(`Unknown artifact type: ${type}`);
        }
      }

      writeFileSync(targetPath, content, 'utf-8');
      return { path: targetPath };
    },
  };
}
