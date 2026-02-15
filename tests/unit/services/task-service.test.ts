/**
 * Unit Tests for TaskService
 *
 * Tests task CRUD operations, status transitions, and file structure.
 * Uses memfs to mock the file system without touching real files.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TaskDraft, TaskStatus } from '@shared/types';

import type { Volume } from 'memfs';

// ── File System Mocking ────────────────────────────────────────────

// Mock node:fs before importing the service
vi.mock('node:fs', async () => {
  const memfs = await import('memfs');
  const vol = memfs.Volume.fromJSON({});
  const fs = memfs.createFsFromVolume(vol);

  // Store reference for tests to manipulate
  (globalThis as Record<string, unknown>).__mockVol = vol;
  (globalThis as Record<string, unknown>).__mockFs = fs;

  return {
    default: fs,
    ...fs,
  };
});

// Import service after mocks are set up
const { createTaskService } = await import('@main/services/project/task-service');

// ── Test Utilities ─────────────────────────────────────────────────

function getMockVol(): InstanceType<typeof Volume> {
  return (globalThis as Record<string, unknown>).__mockVol as InstanceType<typeof Volume>;
}

function resetFs(files: Record<string, string> = {}): void {
  const vol = getMockVol();
  vol.reset();
  for (const [path, content] of Object.entries(files)) {
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (dir.length > 0 && !vol.existsSync(dir)) {
      vol.mkdirSync(dir, { recursive: true });
    }
    vol.writeFileSync(path, content, { encoding: 'utf-8' });
  }
}

function getFileContent(path: string): string | null {
  const vol = getMockVol();
  try {
    return vol.readFileSync(path, 'utf-8') as string;
  } catch {
    return null;
  }
}

function fileExists(path: string): boolean {
  const vol = getMockVol();
  return vol.existsSync(path);
}

// ── Test Fixtures ──────────────────────────────────────────────────

const PROJECT_ID = 'test-project';
const PROJECT_PATH = '/mock/projects/my-app';
const SPECS_DIR = `${PROJECT_PATH}/.auto-claude/specs`;

interface RequirementsData {
  task_description: string;
  workflow_type: string;
}

interface PlanData {
  feature: string;
  description: string;
  status: TaskStatus;
  xstateState: TaskStatus;
  executionPhase: string;
  [key: string]: unknown;
}

interface MetadataData {
  complexity: string;
  [key: string]: unknown;
}

function createRequirementsJson(title: string): string {
  return JSON.stringify({
    task_description: title,
    workflow_type: 'feature',
  });
}

function createPlanJson(
  title: string,
  status: TaskStatus = 'backlog',
  phases: unknown[] = [],
): string {
  return JSON.stringify({
    feature: title,
    description: `Description for ${title}`,
    status,
    xstateState: status,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    phases,
    planStatus: 'pending',
    executionPhase: 'idle',
  });
}

function createMetadataJson(): string {
  return JSON.stringify({
    sourceType: 'manual',
    model: 'opus',
    thinkingLevel: 'high',
    complexity: 'standard',
  });
}

// Project resolver mock
function createProjectResolver(): (projectId: string) => string | undefined {
  return (projectId: string) => (projectId === PROJECT_ID ? PROJECT_PATH : undefined);
}

// Projects lister mock
function createProjectsLister() {
  return () => [{ id: PROJECT_ID, path: PROJECT_PATH }];
}

// ── Test Suites ────────────────────────────────────────────────────

describe('TaskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFs();
  });

  afterEach(() => {
    resetFs();
  });

  describe('listTasks()', () => {
    it('returns tasks for a project', () => {
      // Set up file system with two tasks
      resetFs({
        [`${SPECS_DIR}/1-first-task/requirements.json`]: createRequirementsJson('First Task'),
        [`${SPECS_DIR}/1-first-task/implementation_plan.json`]: createPlanJson(
          'First Task',
          'backlog',
        ),
        [`${SPECS_DIR}/2-second-task/requirements.json`]: createRequirementsJson('Second Task'),
        [`${SPECS_DIR}/2-second-task/implementation_plan.json`]: createPlanJson(
          'Second Task',
          'in_progress',
        ),
      });

      const service = createTaskService(createProjectResolver());
      const tasks = service.listTasks(PROJECT_ID);

      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t.title)).toContain('First Task');
      expect(tasks.map((t) => t.title)).toContain('Second Task');
    });

    it('returns empty array when no tasks exist', () => {
      // Set up empty project (no specs directory)
      resetFs({});

      const service = createTaskService(createProjectResolver());
      const tasks = service.listTasks(PROJECT_ID);

      expect(tasks).toEqual([]);
    });

    it('returns empty array when specs directory is empty', () => {
      // Create empty specs directory
      const vol = getMockVol();
      vol.mkdirSync(SPECS_DIR, { recursive: true });

      const service = createTaskService(createProjectResolver());
      const tasks = service.listTasks(PROJECT_ID);

      expect(tasks).toEqual([]);
    });

    it('skips invalid task directories (missing requirements.json)', () => {
      resetFs({
        [`${SPECS_DIR}/1-valid-task/requirements.json`]: createRequirementsJson('Valid Task'),
        [`${SPECS_DIR}/1-valid-task/implementation_plan.json`]: createPlanJson('Valid Task'),
        // Invalid task - no requirements.json
        [`${SPECS_DIR}/2-invalid-task/implementation_plan.json`]: createPlanJson('Invalid Task'),
      });

      const service = createTaskService(createProjectResolver());
      const tasks = service.listTasks(PROJECT_ID);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.title).toBe('Valid Task');
    });
  });

  describe('getTask()', () => {
    it('returns task by ID', () => {
      const taskId = '1-test-task';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Test Task'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson('Test Task', 'queue'),
      });

      const service = createTaskService(createProjectResolver());
      const task = service.getTask(PROJECT_ID, taskId);

      expect(task.id).toBe(taskId);
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('queue');
    });

    it('throws error for unknown task ID', () => {
      resetFs({});

      const service = createTaskService(createProjectResolver());

      expect(() => service.getTask(PROJECT_ID, 'nonexistent-task')).toThrow(
        'Task nonexistent-task not found',
      );
    });

    it('returns task with subtasks from phases', () => {
      const taskId = '1-task-with-phases';
      const phases = [
        { name: 'Phase 1', description: 'First phase', completed: true, files: ['src/a.ts'] },
        { name: 'Phase 2', description: 'Second phase', started: true, files: ['src/b.ts'] },
        { name: 'Phase 3', description: 'Third phase', files: [] },
      ];

      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Task with Phases'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson(
          'Task with Phases',
          'in_progress',
          phases,
        ),
      });

      const service = createTaskService(createProjectResolver());
      const task = service.getTask(PROJECT_ID, taskId);

      expect(task.subtasks).toHaveLength(3);
      expect(task.subtasks[0]?.status).toBe('completed');
      expect(task.subtasks[1]?.status).toBe('in_progress');
      expect(task.subtasks[2]?.status).toBe('pending');
    });
  });

  describe('createTask()', () => {
    it('creates task with required fields', () => {
      resetFs({});
      const vol = getMockVol();
      vol.mkdirSync(PROJECT_PATH, { recursive: true });

      const draft: TaskDraft = {
        title: 'New Feature',
        description: 'Implement a new feature',
        projectId: PROJECT_ID,
      };

      const service = createTaskService(createProjectResolver());
      const task = service.createTask(draft);

      expect(task.title).toBe('New Feature');
      expect(task.description).toBe('Implement a new feature');
      expect(task.status).toBe('backlog');
      expect(task.subtasks).toEqual([]);
    });

    it('assigns unique ID based on existing tasks', () => {
      // Set up existing task with ID starting with "1-"
      resetFs({
        [`${SPECS_DIR}/1-existing-task/requirements.json`]: createRequirementsJson('Existing'),
        [`${SPECS_DIR}/1-existing-task/implementation_plan.json`]: createPlanJson('Existing'),
      });

      const draft: TaskDraft = {
        title: 'Second Task',
        description: 'Another task',
        projectId: PROJECT_ID,
      };

      const service = createTaskService(createProjectResolver());
      const task = service.createTask(draft);

      // Should get ID starting with "2-"
      expect(task.id).toMatch(/^2-/);
      expect(task.id).toContain('second-task');
    });

    it('creates proper file structure', () => {
      resetFs({});
      const vol = getMockVol();
      vol.mkdirSync(PROJECT_PATH, { recursive: true });

      const draft: TaskDraft = {
        title: 'Test Structure',
        description: 'Testing file structure',
        projectId: PROJECT_ID,
        complexity: 'complex',
      };

      const service = createTaskService(createProjectResolver());
      const task = service.createTask(draft);

      // Verify all files were created
      const taskDir = `${SPECS_DIR}/${task.id}`;
      expect(fileExists(`${taskDir}/requirements.json`)).toBe(true);
      expect(fileExists(`${taskDir}/implementation_plan.json`)).toBe(true);
      expect(fileExists(`${taskDir}/task_metadata.json`)).toBe(true);

      // Verify requirements.json content
      const reqContent = getFileContent(`${taskDir}/requirements.json`);
      expect(reqContent).not.toBeNull();
      const req = JSON.parse(reqContent!) as RequirementsData;
      expect(req.task_description).toBe('Testing file structure');
      expect(req.workflow_type).toBe('feature');

      // Verify implementation_plan.json content
      const planContent = getFileContent(`${taskDir}/implementation_plan.json`);
      expect(planContent).not.toBeNull();
      const plan = JSON.parse(planContent!) as PlanData;
      expect(plan.feature).toBe('Test Structure');
      expect(plan.status).toBe('backlog');

      // Verify task_metadata.json content
      const metaContent = getFileContent(`${taskDir}/task_metadata.json`);
      expect(metaContent).not.toBeNull();
      const meta = JSON.parse(metaContent!) as MetadataData;
      expect(meta.complexity).toBe('complex');
    });

    it('slugifies title for ID', () => {
      resetFs({});
      const vol = getMockVol();
      vol.mkdirSync(PROJECT_PATH, { recursive: true });

      const draft: TaskDraft = {
        title: 'Add User Authentication & OAuth Support!',
        description: 'Test',
        projectId: PROJECT_ID,
      };

      const service = createTaskService(createProjectResolver());
      const task = service.createTask(draft);

      // Should be slugified and prefixed with number
      expect(task.id).toMatch(/^1-add-user-authentication-oauth-support/);
      expect(task.id).not.toContain('!');
      expect(task.id).not.toContain('&');
    });
  });

  describe('updateTask()', () => {
    it('updates task fields', () => {
      const taskId = '1-update-test';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Original Title'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson('Original Title'),
      });

      // First list tasks to populate the internal map
      const service = createTaskService(createProjectResolver());
      service.listTasks(PROJECT_ID);

      const updated = service.updateTask(taskId, {
        feature: 'Updated Title',
        description: 'Updated description',
      });

      expect(updated.title).toBe('Updated Title');

      // Verify file was updated
      const planContent = getFileContent(`${SPECS_DIR}/${taskId}/implementation_plan.json`);
      expect(planContent).not.toBeNull();
      const plan = JSON.parse(planContent!) as PlanData;
      expect(plan.feature).toBe('Updated Title');
      expect(plan.description).toBe('Updated description');
    });

    it('updates updated_at timestamp', () => {
      const taskId = '1-timestamp-test';
      const originalDate = '2026-01-01T00:00:00.000Z';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Timestamp Test'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: JSON.stringify({
          feature: 'Timestamp Test',
          status: 'backlog',
          created_at: originalDate,
          updated_at: originalDate,
        }),
      });

      const service = createTaskService(createProjectResolver());
      service.listTasks(PROJECT_ID);

      // Use a fixed date for testing
      const beforeUpdate = Date.now();
      service.updateTask(taskId, { someField: 'value' });

      const planContent = getFileContent(`${SPECS_DIR}/${taskId}/implementation_plan.json`);
      const plan = JSON.parse(planContent!) as { updated_at: string };
      const updatedAt = new Date(plan.updated_at).getTime();

      expect(updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
    });

    it('throws error if task not found in map', () => {
      resetFs({});

      const service = createTaskService(createProjectResolver());

      expect(() => service.updateTask('unknown-task', { status: 'done' })).toThrow(
        'Unknown task unknown-task',
      );
    });
  });

  describe('updateTaskStatus()', () => {
    it('changes task status', () => {
      const taskId = '1-status-test';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Status Test'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson(
          'Status Test',
          'backlog',
        ),
      });

      const service = createTaskService(createProjectResolver());
      service.listTasks(PROJECT_ID);

      const updated = service.updateTaskStatus(taskId, 'in_progress');

      expect(updated.status).toBe('in_progress');

      // Verify file was updated
      const planContent = getFileContent(`${SPECS_DIR}/${taskId}/implementation_plan.json`);
      const plan = JSON.parse(planContent!) as PlanData;
      expect(plan.status).toBe('in_progress');
      expect(plan.xstateState).toBe('in_progress');
    });

    it('supports all valid status values', () => {
      const statuses: TaskStatus[] = [
        'backlog',
        'queue',
        'in_progress',
        'ai_review',
        'human_review',
        'done',
        'pr_created',
        'error',
      ];

      for (const status of statuses) {
        const taskId = '1-status-all';
        resetFs({
          [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Status All'),
          [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson(
            'Status All',
            'backlog',
          ),
        });

        const service = createTaskService(createProjectResolver());
        service.listTasks(PROJECT_ID);

        const updated = service.updateTaskStatus(taskId, status);
        expect(updated.status).toBe(status);
      }
    });

    it('throws error if plan file not found', () => {
      const taskId = '1-no-plan';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('No Plan'),
      });

      const service = createTaskService(createProjectResolver());
      service.listTasks(PROJECT_ID);

      expect(() => service.updateTaskStatus(taskId, 'in_progress')).toThrow('plan not found');
    });
  });

  describe('deleteTask()', () => {
    it('removes task directory', () => {
      const taskId = '1-delete-test';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Delete Test'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson('Delete Test'),
        [`${SPECS_DIR}/${taskId}/task_metadata.json`]: createMetadataJson(),
      });

      const service = createTaskService(createProjectResolver());

      // Verify task exists
      expect(fileExists(`${SPECS_DIR}/${taskId}`)).toBe(true);

      service.deleteTask(PROJECT_ID, taskId);

      // Verify task directory was removed
      expect(fileExists(`${SPECS_DIR}/${taskId}`)).toBe(false);
      expect(fileExists(`${SPECS_DIR}/${taskId}/requirements.json`)).toBe(false);
    });

    it('does not throw when task does not exist', () => {
      resetFs({});
      const vol = getMockVol();
      vol.mkdirSync(PROJECT_PATH, { recursive: true });

      const service = createTaskService(createProjectResolver());

      // Should not throw
      expect(() => service.deleteTask(PROJECT_ID, 'nonexistent-task')).not.toThrow();
    });

    it('removes task from internal cache', () => {
      const taskId = '1-cache-test';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Cache Test'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson('Cache Test'),
      });

      const service = createTaskService(createProjectResolver());

      // Populate cache
      service.listTasks(PROJECT_ID);
      service.deleteTask(PROJECT_ID, taskId);

      // Attempting to update should fail since task is no longer in cache
      expect(() => service.updateTask(taskId, { status: 'done' })).toThrow('Unknown task');
    });
  });

  describe('listAllTasks()', () => {
    it('returns tasks from all projects', () => {
      resetFs({
        [`${SPECS_DIR}/1-task-a/requirements.json`]: createRequirementsJson('Task A'),
        [`${SPECS_DIR}/1-task-a/implementation_plan.json`]: createPlanJson('Task A'),
      });

      const service = createTaskService(createProjectResolver(), createProjectsLister());
      const tasks = service.listAllTasks();

      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0]?.metadata?.projectId).toBe(PROJECT_ID);
    });

    it('returns empty array when no projects lister provided', () => {
      const service = createTaskService(createProjectResolver());
      const tasks = service.listAllTasks();

      expect(tasks).toEqual([]);
    });
  });

  describe('executeTask()', () => {
    it('updates task status to in_progress', () => {
      const taskId = '1-execute-test';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Execute Test'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson(
          'Execute Test',
          'queue',
        ),
      });

      const service = createTaskService(createProjectResolver());
      const result = service.executeTask(PROJECT_ID, taskId);

      expect(result.agentId).toMatch(/^agent-1-execute-test-/);

      // Verify status was updated
      const planContent = getFileContent(`${SPECS_DIR}/${taskId}/implementation_plan.json`);
      const plan = JSON.parse(planContent!) as PlanData;
      expect(plan.status).toBe('in_progress');
      expect(plan.xstateState).toBe('in_progress');
      expect(plan.executionPhase).toBe('idle');
    });

    it('returns agentId with timestamp', () => {
      const taskId = '1-agent-id-test';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Agent ID Test'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson('Agent ID Test'),
      });

      const service = createTaskService(createProjectResolver());
      const before = Date.now();
      const result = service.executeTask(PROJECT_ID, taskId);
      const after = Date.now();

      // Extract timestamp from agentId
      const parts = result.agentId.split('-');
      const timestamp = Number(parts.at(-1));

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('edge cases', () => {
    it('handles task with logs', () => {
      const taskId = '1-with-logs';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('With Logs'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson('With Logs'),
        [`${SPECS_DIR}/${taskId}/task_logs.json`]: JSON.stringify([
          'Log entry 1',
          'Log entry 2',
          'Log entry 3',
        ]),
      });

      const service = createTaskService(createProjectResolver());
      const task = service.getTask(PROJECT_ID, taskId);

      expect(task.logs).toEqual(['Log entry 1', 'Log entry 2', 'Log entry 3']);
    });

    it('handles corrupted logs file gracefully', () => {
      const taskId = '1-corrupted-logs';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('Corrupted Logs'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: createPlanJson('Corrupted Logs'),
        [`${SPECS_DIR}/${taskId}/task_logs.json`]: 'not valid json',
      });

      const service = createTaskService(createProjectResolver());
      const task = service.getTask(PROJECT_ID, taskId);

      // Should not throw, logs should be empty
      expect(task.logs).toEqual([]);
    });

    it('handles executionProgress from plan', () => {
      const taskId = '1-with-progress';
      resetFs({
        [`${SPECS_DIR}/${taskId}/requirements.json`]: createRequirementsJson('With Progress'),
        [`${SPECS_DIR}/${taskId}/implementation_plan.json`]: JSON.stringify({
          feature: 'With Progress',
          status: 'in_progress',
          executionPhase: 'coding',
          completedPhases: ['planning'],
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        }),
      });

      const service = createTaskService(createProjectResolver());
      const task = service.getTask(PROJECT_ID, taskId);

      expect(task.executionProgress).toBeDefined();
      expect(task.executionProgress?.phase).toBe('coding');
      expect(task.executionProgress?.completedPhases).toContain('planning');
    });

    it('throws error for unknown project', () => {
      const service = createTaskService(createProjectResolver());

      expect(() => service.listTasks('unknown-project')).toThrow('Project unknown-project not found');
    });
  });
});
