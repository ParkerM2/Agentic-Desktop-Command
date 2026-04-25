import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as schema from '@main/db/schema';
import { createProjectService, type ProjectService } from '@main/features/projects/project-service';

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let service: ProjectService;
const tempDirs: string[] = [];

beforeEach(() => {
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  service = createProjectService({ db });
});

afterEach(() => {
  sqlite.close();
  for (const dir of tempDirs.splice(0)) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'adc-proj-'));
  tempDirs.push(dir);
  return dir;
}

describe('project-service (local SQLite)', () => {
  it('listProjects returns empty initially', async () => {
    expect(await service.listProjects()).toEqual([]);
  });

  it('addProject persists and returns project with generated id', async () => {
    const dir = makeTempDir();
    const project = await service.addProject({ path: dir, name: 'Alpha' });
    expect(project.id).toBeTruthy();
    expect(project.name).toBe('Alpha');
    expect(project.path).toBe(dir);
    expect(project.repoStructure).toBe('single');
    expect(project.defaultBranch).toBe('main');
    expect(project.createdAt).toBeTruthy();
    expect(project.updatedAt).toBe(project.createdAt);
  });

  it('listProjects returns added projects and respects workspaceId filter', async () => {
    const a = await service.addProject({ path: makeTempDir(), name: 'A', workspaceId: 'ws-1' });
    const b = await service.addProject({ path: makeTempDir(), name: 'B', workspaceId: 'ws-2' });
    await service.addProject({ path: makeTempDir(), name: 'C' });

    const all = await service.listProjects();
    expect(all.map((p) => p.id).sort()).toContain(a.id);
    expect(all).toHaveLength(3);

    const ws1 = await service.listProjects('ws-1');
    expect(ws1.map((p) => p.id)).toEqual([a.id]);

    const ws2 = await service.listProjects('ws-2');
    expect(ws2.map((p) => p.id)).toEqual([b.id]);
  });

  it('updateProject changes fields and advances updatedAt', async () => {
    const created = await service.addProject({ path: makeTempDir(), name: 'Alpha' });
    // Bump clock past 1 ms so the ISO string differs
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5);
    });
    const updated = await service.updateProject({
      projectId: created.id,
      name: 'Renamed',
      description: 'desc',
      gitUrl: 'https://example.test/x.git',
      defaultBranch: 'develop',
    });
    expect(updated.name).toBe('Renamed');
    expect(updated.description).toBe('desc');
    expect(updated.gitUrl).toBe('https://example.test/x.git');
    expect(updated.defaultBranch).toBe('develop');
    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });

  it('removeProject deletes the project and cascades sub_projects', async () => {
    const project = await service.addProject({ path: makeTempDir(), name: 'WithSubs' });
    await service.createSubProject({
      projectId: project.id,
      name: 'sub-a',
      relativePath: 'packages/a',
    });
    await service.createSubProject({
      projectId: project.id,
      name: 'sub-b',
      relativePath: 'packages/b',
    });

    expect(await service.getSubProjects(project.id)).toHaveLength(2);

    const result = await service.removeProject(project.id);
    expect(result.success).toBe(true);
    expect(await service.listProjects()).toEqual([]);
    expect(await service.getSubProjects(project.id)).toEqual([]);
  });

  it('createSubProject + getSubProjects + deleteSubProject round-trip', async () => {
    const project = await service.addProject({ path: makeTempDir(), name: 'Mono' });
    const sub = await service.createSubProject({
      projectId: project.id,
      name: 'web',
      relativePath: 'apps/web',
      gitUrl: 'https://example.test/web.git',
    });
    expect(sub.id).toBeTruthy();
    expect(sub.projectId).toBe(project.id);
    expect(sub.relativePath).toBe('apps/web');
    expect(sub.defaultBranch).toBe('main');

    const list = await service.getSubProjects(project.id);
    expect(list.map((s) => s.id)).toEqual([sub.id]);

    const del = await service.deleteSubProject(project.id, sub.id);
    expect(del.success).toBe(true);
    expect(await service.getSubProjects(project.id)).toEqual([]);
  });

  it('listProjectsSync returns the cached snapshot after listProjects call', async () => {
    const project = await service.addProject({ path: makeTempDir(), name: 'Cached' });
    await service.listProjects();
    const cached = service.listProjectsSync();
    expect(cached.map((p) => p.id)).toContain(project.id);
  });

  it('getProjectPath returns rootPath when project exists, undefined otherwise', async () => {
    const dir = makeTempDir();
    const project = await service.addProject({ path: dir, name: 'Path' });
    expect(service.getProjectPath(project.id)).toBe(dir);
    expect(service.getProjectPath('does-not-exist')).toBeUndefined();
  });

  it('initializeProject creates .adc/specs under the project rootPath', async () => {
    const dir = makeTempDir();
    const project = await service.addProject({ path: dir, name: 'Init' });
    const result = service.initializeProject(project.id);
    expect(result.success).toBe(true);
    expect(existsSync(join(dir, '.adc'))).toBe(true);
    expect(existsSync(join(dir, '.adc', 'specs'))).toBe(true);
  });
});
