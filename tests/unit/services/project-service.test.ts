/**
 * Unit Tests — ProjectService
 *
 * Tests CRUD operations and file persistence for project management.
 */

import { createFsFromVolume, Volume } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Project } from '@shared/types';

// ─── Shared Volume ────────────────────────────────────────────────────
// Create a shared volume instance that will be used by both the mock and tests
let sharedVol = Volume.fromJSON({});

// ─── Mocks ────────────────────────────────────────────────────────────

// Mock node:fs with memfs using the shared volume
vi.mock('node:fs', () => {
  const fs = createFsFromVolume(sharedVol);
  return {
    ...fs,
    default: fs,
  };
});

vi.mock('node:fs/promises', () => {
  const fs = createFsFromVolume(sharedVol);
  return {
    ...fs.promises,
    default: fs.promises,
  };
});

// Mock uuid to return predictable IDs
let uuidCounter = 0;
vi.mock('uuid', () => ({
  v4: vi.fn(() => `test-uuid-${++uuidCounter}`),
}));

// ─── Test Suite ───────────────────────────────────────────────────────

describe('ProjectService', () => {
  const MOCK_USER_DATA = '/mock/userData';
  const PROJECTS_FILE = `${MOCK_USER_DATA}/projects.json`;

  beforeEach(() => {
    // Reset the shared volume and create fresh fs mock
    sharedVol = Volume.fromJSON({});
    sharedVol.mkdirSync(MOCK_USER_DATA, { recursive: true });

    // Reset uuid counter
    uuidCounter = 0;

    // Clear all mocks
    vi.clearAllMocks();

    // Reset modules so the service gets fresh fs mock
    vi.resetModules();

    // Re-apply the fs mock with fresh volume
    vi.doMock('node:fs', () => {
      const fs = createFsFromVolume(sharedVol);
      return {
        ...fs,
        default: fs,
      };
    });

    vi.doMock('node:fs/promises', () => {
      const fs = createFsFromVolume(sharedVol);
      return {
        ...fs.promises,
        default: fs.promises,
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper to dynamically import project service with fresh module state
   */
  async function createFreshService() {
    const { createProjectService } = await import(
      '@main/services/project/project-service'
    );
    return createProjectService();
  }

  // ─── listProjects Tests ─────────────────────────────────────────────

  describe('listProjects()', () => {
    it('returns empty array when no projects exist', async () => {
      // No projects.json file exists
      const service = await createFreshService();

      const projects = service.listProjects();

      expect(projects).toEqual([]);
      expect(Array.isArray(projects)).toBe(true);
    });

    it('returns empty array when projects.json is empty array', async () => {
      // Create empty projects file
      sharedVol.writeFileSync(PROJECTS_FILE, '[]', { encoding: 'utf-8' });

      const service = await createFreshService();
      const projects = service.listProjects();

      expect(projects).toEqual([]);
    });

    it('returns projects from JSON file', async () => {
      const existingProjects: Project[] = [
        {
          id: 'proj-1',
          name: 'Project One',
          path: '/path/to/project-one',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'proj-2',
          name: 'Project Two',
          path: '/path/to/project-two',
          createdAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ];
      sharedVol.writeFileSync(
        PROJECTS_FILE,
        JSON.stringify(existingProjects),
        { encoding: 'utf-8' }
      );

      const service = await createFreshService();
      const projects = service.listProjects();

      expect(projects).toHaveLength(2);
      expect(projects[0]?.id).toBe('proj-1');
      expect(projects[0]?.name).toBe('Project One');
      expect(projects[1]?.id).toBe('proj-2');
      expect(projects[1]?.name).toBe('Project Two');
    });

    it('returns empty array when projects.json is corrupted', async () => {
      // Write invalid JSON
      sharedVol.writeFileSync(PROJECTS_FILE, 'not valid json {{{', { encoding: 'utf-8' });

      const service = await createFreshService();
      const projects = service.listProjects();

      expect(projects).toEqual([]);
    });
  });

  // ─── addProject Tests ───────────────────────────────────────────────

  describe('addProject()', () => {
    it('creates project with ID and name derived from directory', async () => {
      const service = await createFreshService();

      const project = service.addProject('/path/to/my-awesome-project');

      expect(project.id).toBe('test-uuid-1');
      expect(project.name).toBe('my-awesome-project');
      expect(project.path).toBe('/path/to/my-awesome-project');
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
    });

    it('persists project to JSON file', async () => {
      const service = await createFreshService();

      service.addProject('/path/to/test-project');

      // Verify file was written
      const fileContent = sharedVol.readFileSync(
        PROJECTS_FILE,
        'utf-8'
      ) as string;
      const savedProjects = JSON.parse(fileContent) as Project[];

      expect(savedProjects).toHaveLength(1);
      expect(savedProjects[0]?.name).toBe('test-project');
      expect(savedProjects[0]?.path).toBe('/path/to/test-project');
    });

    it('returns existing project if path already registered', async () => {
      const existingProject: Project = {
        id: 'existing-id',
        name: 'existing-project',
        path: '/path/to/existing-project',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      sharedVol.writeFileSync(
        PROJECTS_FILE,
        JSON.stringify([existingProject]),
        { encoding: 'utf-8' }
      );

      const service = await createFreshService();
      const project = service.addProject('/path/to/existing-project');

      // Should return existing project, not create new one
      expect(project.id).toBe('existing-id');
      expect(project.name).toBe('existing-project');

      // Verify no duplicate was added
      const projects = service.listProjects();
      expect(projects).toHaveLength(1);
    });

    it('sets createdAt and updatedAt to current ISO timestamp', async () => {
      // Mock Date.now() for consistent timestamps
      const mockDate = new Date('2026-02-14T12:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const service = await createFreshService();
      const project = service.addProject('/path/to/timed-project');

      expect(project.createdAt).toBe('2026-02-14T12:00:00.000Z');
      expect(project.updatedAt).toBe('2026-02-14T12:00:00.000Z');

      vi.useRealTimers();
    });
  });

  // ─── removeProject Tests ────────────────────────────────────────────

  describe('removeProject()', () => {
    it('removes project by ID', async () => {
      const existingProjects: Project[] = [
        {
          id: 'proj-to-remove',
          name: 'Project To Remove',
          path: '/path/to/remove',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'proj-to-keep',
          name: 'Project To Keep',
          path: '/path/to/keep',
          createdAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ];
      sharedVol.writeFileSync(
        PROJECTS_FILE,
        JSON.stringify(existingProjects),
        { encoding: 'utf-8' }
      );

      const service = await createFreshService();
      const result = service.removeProject('proj-to-remove');

      expect(result.success).toBe(true);

      const remaining = service.listProjects();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe('proj-to-keep');
    });

    it('persists removal to JSON file', async () => {
      const existingProjects: Project[] = [
        {
          id: 'proj-1',
          name: 'Project One',
          path: '/path/one',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      sharedVol.writeFileSync(
        PROJECTS_FILE,
        JSON.stringify(existingProjects),
        { encoding: 'utf-8' }
      );

      const service = await createFreshService();
      service.removeProject('proj-1');

      // Read file directly to verify persistence
      const fileContent = sharedVol.readFileSync(
        PROJECTS_FILE,
        'utf-8'
      ) as string;
      const savedProjects = JSON.parse(fileContent) as Project[];

      expect(savedProjects).toHaveLength(0);
    });

    it('succeeds silently when project ID does not exist', async () => {
      const service = await createFreshService();

      // Should not throw, returns success
      const result = service.removeProject('non-existent-id');

      expect(result.success).toBe(true);
    });
  });

  // ─── getProjectPath Tests ───────────────────────────────────────────

  describe('getProjectPath()', () => {
    it('returns project path by ID', async () => {
      const existingProject: Project = {
        id: 'proj-1',
        name: 'Project One',
        path: '/path/to/project-one',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      sharedVol.writeFileSync(
        PROJECTS_FILE,
        JSON.stringify([existingProject]),
        { encoding: 'utf-8' }
      );

      const service = await createFreshService();
      const path = service.getProjectPath('proj-1');

      expect(path).toBe('/path/to/project-one');
    });

    it('returns undefined for unknown project ID', async () => {
      const service = await createFreshService();

      const path = service.getProjectPath('unknown-id');

      expect(path).toBeUndefined();
    });
  });

  // ─── initializeProject Tests ────────────────────────────────────────

  describe('initializeProject()', () => {
    it('creates .claude-ui directory in project path', async () => {
      const projectPath = '/path/to/init-project';
      sharedVol.mkdirSync(projectPath, { recursive: true });

      const existingProject: Project = {
        id: 'proj-init',
        name: 'Init Project',
        path: projectPath,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      sharedVol.writeFileSync(
        PROJECTS_FILE,
        JSON.stringify([existingProject]),
        { encoding: 'utf-8' }
      );

      const service = await createFreshService();
      const result = service.initializeProject('proj-init');

      expect(result.success).toBe(true);
      expect(sharedVol.existsSync(`${projectPath}/.claude-ui`)).toBe(true);
    });

    it('returns error when project not found', async () => {
      const service = await createFreshService();

      const result = service.initializeProject('non-existent-project');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project not found');
    });

    it('succeeds when .claude-ui directory already exists', async () => {
      const projectPath = '/path/to/existing-init';
      sharedVol.mkdirSync(`${projectPath}/.claude-ui`, { recursive: true });

      const existingProject: Project = {
        id: 'proj-existing-init',
        name: 'Existing Init',
        path: projectPath,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      sharedVol.writeFileSync(
        PROJECTS_FILE,
        JSON.stringify([existingProject]),
        { encoding: 'utf-8' }
      );

      const service = await createFreshService();
      const result = service.initializeProject('proj-existing-init');

      expect(result.success).toBe(true);
    });
  });

  // ─── selectDirectory Tests ──────────────────────────────────────────

  describe('selectDirectory()', () => {
    it('returns selected path from dialog', async () => {
      // Dialog mock is configured in tests/setup/mocks/electron.ts
      const service = await createFreshService();

      const result = await service.selectDirectory();

      expect(result.path).toBe('/mock/path');
    });

    it('returns null when dialog is canceled', async () => {
      // Override dialog mock for this test
      const { dialog } = await import('electron');
      vi.mocked(dialog.showOpenDialog).mockResolvedValueOnce({
        canceled: true,
        filePaths: [],
      });

      const service = await createFreshService();
      const result = await service.selectDirectory();

      expect(result.path).toBeNull();
    });
  });
});
